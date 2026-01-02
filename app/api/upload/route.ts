import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { uploadToR2 } from "@/lib/r2";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    // Parse multipart form data
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (error) {
      return NextResponse.json(
        {
          error: "BAD_REQUEST",
          ...(process.env.NODE_ENV === "development" && {
            detail: "FORMDATA_PARSE_FAILED",
          }),
        },
        { status: 400 }
      );
    }

    const audio = formData.get("audio");

    // Validate audio field exists and is a Blob-like object
    if (!audio || typeof audio !== "object") {
      return NextResponse.json(
        {
          error: "BAD_REQUEST",
          ...(process.env.NODE_ENV === "development" && {
            detail: "MISSING_AUDIO_FIELD",
          }),
        },
        { status: 400 }
      );
    }

    // Check if it has arrayBuffer method (Blob/File interface)
    if (typeof (audio as any).arrayBuffer !== "function") {
      return NextResponse.json(
        {
          error: "BAD_REQUEST",
          ...(process.env.NODE_ENV === "development" && {
            detail: "MISSING_AUDIO_FIELD",
          }),
        },
        { status: 400 }
      );
    }

    // Extract blob data
    const blob = audio as Blob;
    const buffer = Buffer.from(await blob.arrayBuffer());

    // Check if buffer is empty
    if (buffer.length === 0) {
      return NextResponse.json(
        {
          error: "BAD_REQUEST",
          ...(process.env.NODE_ENV === "development" && {
            detail: "EMPTY_AUDIO_FILE",
          }),
        },
        { status: 400 }
      );
    }

    const filename = (audio as any).name ?? "recording.webm";
    const contentType = (audio as any).type ?? "application/octet-stream";

    // Generate recording ID
    const recordingId = randomUUID();

    // Determine file extension from MIME type or filename
    let ext = ".dat";
    const mimeType = contentType.toLowerCase();
    if (mimeType.includes("webm") || filename.toLowerCase().endsWith(".webm")) {
      ext = ".webm";
    } else if (mimeType.includes("mp4") || filename.toLowerCase().endsWith(".mp4")) {
      ext = ".mp4";
    }

    // Construct R2 key
    const r2_key = `recordings/${user.id}/${recordingId}${ext}`;

    // Upload to R2
    await uploadToR2(buffer, r2_key, contentType);

    // Create DB record
    // Note: We need to insert with id, so we'll use supabase directly
    const { error: insertError } = await supabase
      .from("recordings")
      .insert({
        id: recordingId,
        user_id: user.id,
        title: "Posnetek",
        duration: 0, // Will be updated later if needed
        r2_key: r2_key,
        transcript: "",
        summary: "",
        status: "processing",
        language: "sl",
      });

    if (insertError) {
      throw new Error(`Failed to create recording: ${insertError.message}`);
    }

    return NextResponse.json({ recordingId });
  } catch (error) {
    console.error("Error in POST /api/upload:", error);
    return NextResponse.json(
      { error: "INTERNAL" },
      { status: 500 }
    );
  }
}

