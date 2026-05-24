import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.headers.get("x-session-id")
    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from("personas")
      .select("*")
      .eq("session_id", sessionId)
      .order("name", { ascending: true })

    if (error) {
      // Fallback: If personas table is missing (needs migration), return mock/empty array gracefully
      if (error.code === "42P01") {
        console.warn("Table 'personas' does not exist. Returning empty array.")
        return NextResponse.json([])
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in GET /api/personas:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionId = request.headers.get("x-session-id")
    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 })
    }

    const body = await request.json()
    const { name, description, icon, color } = body

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from("personas")
      .insert({
        session_id: sessionId,
        name,
        description: description || "",
        icon: icon || "Briefcase",
        color: color || "zinc",
        usage_count: 0,
        last_accessed_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error("Error in POST /api/personas:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
