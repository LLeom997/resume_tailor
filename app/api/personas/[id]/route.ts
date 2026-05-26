import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

// DELETE a specific persona
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const sessionId = "default-workspace-session"

    const supabase = await createClient()
    const { error } = await supabase
      .from("personas")
      .delete()
      .eq("id", id)
      .eq("session_id", sessionId)

    if (error) {
      console.error("Error deleting persona:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in DELETE /api/personas/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
