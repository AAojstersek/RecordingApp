import { NextRequest, NextResponse } from "next/server";
import { createServerClient, getRecordingById, updateRecording, deleteRecording } from "@/lib/supabase";
import { getSignedR2Url } from "@/lib/r2";

interface RouteContext {
  params: {
    id: string;
  };
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = context.params;
    const supabase = await createServerClient();

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch recording
    const recording = await getRecordingById(id, supabase);
    if (!recording) {
      return NextResponse.json(
        { error: "Recording not found" },
        { status: 404 }
      );
    }

    // Ensure recording belongs to user (RLS should enforce, but double-check)
    if (recording.user_id !== user.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // Generate signed URL if r2_key exists
    let audioUrl: string | undefined;
    if (recording.r2_key) {
      try {
        audioUrl = await getSignedR2Url(recording.r2_key);
      } catch (error) {
        console.error("Failed to generate signed URL:", error);
        // Continue without audioUrl if signing fails
      }
    }

    return NextResponse.json({
      recording,
      audioUrl,
    });
  } catch (error) {
    console.error("Error in GET /api/recordings/[id]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = context.params;
    const supabase = await createServerClient();

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { title } = body;

    // Validate: only allow updating title
    if (typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { error: "Title is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    // Verify recording exists and belongs to user
    const existingRecording = await getRecordingById(id, supabase);
    if (!existingRecording) {
      return NextResponse.json(
        { error: "Recording not found" },
        { status: 404 }
      );
    }

    if (existingRecording.user_id !== user.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // Update recording
    const updatedRecording = await updateRecording(id, { title }, supabase);

    return NextResponse.json({
      recording: updatedRecording,
    });
  } catch (error) {
    console.error("Error in PATCH /api/recordings/[id]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = context.params;
    const supabase = await createServerClient();

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Verify recording exists and belongs to user
    const existingRecording = await getRecordingById(id, supabase);
    if (!existingRecording) {
      return NextResponse.json(
        { error: "Recording not found" },
        { status: 404 }
      );
    }

    if (existingRecording.user_id !== user.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // Delete recording (R2 cleanup not done in this phase)
    await deleteRecording(id, supabase);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error in DELETE /api/recordings/[id]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

