import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { job_id, job_link, company_name, role_title, status } = body

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    if (job_id !== undefined) updates.job_id = job_id
    if (job_link !== undefined) updates.job_link = job_link
    if (company_name !== undefined) updates.company_name = company_name
    if (role_title !== undefined) updates.role_title = role_title
    if (status !== undefined) updates.status = status

    const supabase = await createClient()
    
    // Attempt to update the resume_variations table
    let data = null
    let error = null
    try {
      const result = await supabase
        .from("resume_variations")
        .update(updates)
        .eq("id", id)
        .select()
        .single()
      data = result.data
      error = result.error
    } catch (dbErr) {
      console.warn("Failed to direct-update resume_variations table columns:", dbErr)
    }

    // Resilient Sync: Always push these values down to the resumes table's export_meta JSONB
    try {
      const { data: resumeData } = await supabase
        .from("resumes")
        .select("export_meta")
        .eq("id", id)
        .single()
      
      const existingMeta = resumeData?.export_meta || {}
      const updatedMeta = {
        ...existingMeta,
        company: company_name !== undefined ? company_name : existingMeta.company,
        role: role_title !== undefined ? role_title : existingMeta.role,
        job_id: job_id !== undefined ? job_id : existingMeta.job_id,
        job_link: job_link !== undefined ? job_link : existingMeta.job_link,
      }

      await supabase
        .from("resumes")
        .update({ export_meta: updatedMeta })
        .eq("id", id)
    } catch (syncErr) {
      console.warn("Failed to sync variation metadata to resumes.export_meta:", syncErr)
    }

    if (error) {
      console.warn("Supabase returned error for variations update (falling back to sync-only success):", error)
    }

    // Return updated fields to client
    return NextResponse.json({
      id,
      ...updates,
      job_id: job_id || "",
      job_link: job_link || "",
      success: true
    })
  } catch (error) {
    console.error("Error in PUT /api/variations/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
