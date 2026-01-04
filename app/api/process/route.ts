import { NextRequest, NextResponse } from "next/server";
import { createServerClient, getRecordingById, updateRecording } from "@/lib/supabase";
import { getSignedR2Url } from "@/lib/r2";
import { transcribeAudio, generateSummary, generateTitle } from "@/lib/groq";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let recordingId: string | null = null;
  let supabase = createServerClient();

  try {
    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    recordingId = body.recordingId;

    if (!recordingId || typeof recordingId !== "string") {
      return NextResponse.json(
        { error: "BAD_REQUEST" },
        { status: 400 }
      );
    }

    // Fetch recording
    const recording = await getRecordingById(recordingId, supabase);
    if (!recording) {
      return NextResponse.json(
        { error: "NOT_FOUND" },
        { status: 404 }
      );
    }

    // Ensure recording belongs to user
    if (recording.user_id !== user.id) {
      return NextResponse.json(
        { error: "NOT_FOUND" },
        { status: 404 }
      );
    }

    // If already completed, return existing data
    if (recording.status === "completed") {
      return NextResponse.json({
        recordingId: recording.id,
        status: recording.status,
        transcript: recording.transcript,
        summary: recording.summary,
        title: recording.title,
      });
    }

    // Fetch audio from R2
    const signedUrl = await getSignedR2Url(recording.r2_key, 300);
    const audioResponse = await fetch(signedUrl);
    if (!audioResponse.ok) {
      throw new Error(`Failed to fetch audio from R2: ${audioResponse.status} ${audioResponse.statusText}`);
    }

    // Determine content type
    const contentType =
      audioResponse.headers.get("content-type") ||
      (recording.r2_key.endsWith(".mp4")
        ? "audio/mp4"
        : recording.r2_key.endsWith(".webm")
        ? "audio/webm"
        : undefined);

    const filename = recording.r2_key.split("/").pop() || "audio";

    // Convert to Buffer
    const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());

    // Transcribe with Groq
    const { text: transcript } = await transcribeAudio(
      audioBuffer,
      filename,
      contentType
    );

    // Extract header (first line or first sentence)
    let header = "";
    let clientCompany: string | null = null;
    let clientPerson: string | null = null;
    let transcriptBody = transcript;

    try {
      // Extract header: first non-empty line, or first sentence
      const lines = transcript.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
      
      if (lines.length > 0) {
        // Use first line as header
        header = lines[0];
      } else {
        // Fallback: first sentence up to first punctuation
        const firstSentenceMatch = transcript.match(/^[^.!?]+[.!?]/);
        if (firstSentenceMatch) {
          header = firstSentenceMatch[0].trim();
        }
      }

      // Parse header: "COMPANY, PERSON"
      if (header.includes(",")) {
        const parts = header.split(",");
        if (parts.length >= 2) {
          clientCompany = parts[0].trim() || null;
          clientPerson = parts.slice(1).join(",").trim() || null;
        }
      }

      // Extract transcript body: remove header from transcript
      if (header) {
        // Remove first occurrence of header
        const headerIndex = transcript.indexOf(header);
        if (headerIndex !== -1) {
          transcriptBody = transcript.substring(headerIndex + header.length).trim();
        }
      }
    } catch (error) {
      // If header extraction fails, use full transcript as body
      console.error("Header extraction failed:", error);
      transcriptBody = transcript;
      clientCompany = null;
      clientPerson = null;
    }

    // Generate title and summary using transcript_body only
    const [summary, title] = await Promise.all([
      generateSummary(transcriptBody),
      generateTitle(transcriptBody),
    ]);

    // Update DB
    const updates: {
      status: string;
      transcript: string;
      transcript_body: string;
      summary: string;
      language: string;
      client_company?: string | null;
      client_person?: string | null;
      title?: string;
    } = {
      status: "completed",
      transcript, // Full original transcript
      transcript_body: transcriptBody, // Meeting content without header
      summary,
      language: "sl",
      client_company: clientCompany,
      client_person: clientPerson,
    };

    // Only update title if current title is empty or "Posnetek"
    if (!recording.title || recording.title === "Posnetek") {
      updates.title = title.length > 60 ? title.substring(0, 60) : title;
    }

    await updateRecording(recordingId, updates, supabase);

    return NextResponse.json({
      recordingId: recording.id,
      status: "completed",
      transcript,
      summary,
      title: updates.title || recording.title,
    });
  } catch (error) {
    console.error("Error in POST /api/process:", error);

    // Update status to failed if we have a recordingId
    if (recordingId) {
      try {
        await updateRecording(
          recordingId,
          { status: "failed" },
          supabase
        );
      } catch (updateError) {
        console.error("Failed to update recording status to failed:", updateError);
      }
    }

    return NextResponse.json(
      { error: "INTERNAL" },
      { status: 500 }
    );
  }
}

