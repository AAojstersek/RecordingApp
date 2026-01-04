import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient, getRecordingById, updateRecording, deleteRecording } from "@/lib/supabase";
import { getSignedR2Url, deleteFromR2 } from "@/lib/r2";

export const runtime = "nodejs";

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
    const supabase = createServerClient();

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (process.env.NODE_ENV === "development" && (!user || authError)) {
      const cookieStore = cookies();
      const cookieNames = cookieStore.getAll().map((c) => c.name);
      console.log("[DEV] GET /api/recordings/[id]: User is null or error:", {
        hasUser: !!user,
        authError: authError?.message,
        cookieNames,
      });
    }

    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    // Fetch recording
    const recording = await getRecordingById(id, supabase);
    if (!recording) {
      return NextResponse.json(
        { error: "NOT_FOUND" },
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
    const supabase = createServerClient();

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (process.env.NODE_ENV === "development" && (!user || authError)) {
      const cookieStore = cookies();
      const cookieNames = cookieStore.getAll().map((c) => c.name);
      console.log("[DEV] PATCH /api/recordings/[id]: User is null or error:", {
        hasUser: !!user,
        authError: authError?.message,
        cookieNames,
      });
    }

    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED" },
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
        { error: "NOT_FOUND" },
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
    const supabase = createServerClient();

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (process.env.NODE_ENV === "development" && (!user || authError)) {
      const cookieStore = cookies();
      const cookieNames = cookieStore.getAll().map((c) => c.name);
      console.log("[DEV] DELETE /api/recordings/[id]: User is null or error:", {
        hasUser: !!user,
        authError: authError?.message,
        cookieNames,
      });
    }

    if (!user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    // Verify recording exists and belongs to user
    const existingRecording = await getRecordingById(id, supabase);
    if (!existingRecording) {
      return NextResponse.json(
        { error: "NOT_FOUND" },
        { status: 404 }
      );
    }

    if (existingRecording.user_id !== user.id) {
      return NextResponse.json(
        { error: "NOT_FOUND" },
        { status: 404 }
      );
    }

    // Delete from R2 first (if r2_key exists)
    if (existingRecording.r2_key) {
      try {
        await deleteFromR2(existingRecording.r2_key);
      } catch (error) {
        console.error("Failed to delete from R2:", error);
        // Do not delete DB row if R2 delete fails
        return NextResponse.json(
          { error: "Failed to delete audio file" },
          { status: 500 }
        );
      }
    }

    // Delete from database
    try {
      await deleteRecording(id, supabase);
    } catch (error) {
      console.error("Failed to delete from database:", error);
      return NextResponse.json(
        { error: "Failed to delete recording" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error in DELETE /api/recordings/[id]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}


