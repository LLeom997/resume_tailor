import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // 1. Fetch current usage count
    const { data: current, error: fetchError } = await supabase
      .from("personas")
      .select("usage_count")
      .eq("id", id)
      .single()

    if (fetchError || !current) {
      return NextResponse.json({ error: "Persona not found" }, { status: 404 })
    }

    // 2. Increment count and update last accessed timestamp
    const { data, error } = await supabase
      .from("personas")
      .update({
        usage_count: (current.usage_count || 0) + 1,
        last_accessed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in POST /api/personas/[id]/usage:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
