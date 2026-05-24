import { createClient } from "@/lib/supabase/server"
import { DEFAULT_CAREER_PROFILES } from "@/lib/default-profiles"
import { CareerProfile } from "@/lib/types"
import { NextRequest, NextResponse } from "next/server"

/**
 * Ensures default career profiles exist for the session.
 */
async function ensureDefaultProfiles(sessionId: string) {
  const supabase = await createClient()

  const { data: existing, error: fetchError } = await supabase
    .from("career_profiles")
    .select("id")
    .eq("session_id", sessionId)
    .limit(1)

  if (fetchError) {
    throw fetchError
  }

  if (existing && existing.length > 0) {
    return
  }

  const rows = DEFAULT_CAREER_PROFILES.map((profile) => ({
    session_id: sessionId,
    name: profile.name,
    slug: profile.slug,
    description: profile.description,
  }))

  const { error: insertError } = await supabase.from("career_profiles").insert(rows)
  if (insertError) {
    throw insertError
  }
}

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.headers.get("x-session-id")
    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 })
    }

    const supabase = await createClient()

    try {
      await ensureDefaultProfiles(sessionId)
    } catch (seedError) {
      console.warn("Could not seed career profiles:", seedError)
      return NextResponse.json([])
    }

    const { data, error } = await supabase
      .from("career_profiles")
      .select("*")
      .eq("session_id", sessionId)
      .order("name", { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data as CareerProfile[])
  } catch (error) {
    console.error("Error in GET /api/profiles:", error)
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
    const name = typeof body.name === "string" ? body.name.trim() : ""
    const slug = typeof body.slug === "string" ? body.slug.trim() : ""
    const description = typeof body.description === "string" ? body.description.trim() : ""

    if (!name || !slug) {
      return NextResponse.json({ error: "Name and slug are required" }, { status: 400 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from("career_profiles")
      .insert({
        session_id: sessionId,
        name,
        slug,
        description,
        master_resume_id: body.master_resume_id || null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error("Error in POST /api/profiles:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
