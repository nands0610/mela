import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get("category")?.toLowerCase();
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("stall_submissions")
    .select("payload, stall_slug, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "Failed to load stalls", details: error.message },
      { status: 500 }
    );
  }

  const stalls = (data ?? [])
    .map((row) => row.payload)
    .filter((payload) =>
      category ? payload?.category?.toLowerCase?.() === category : true
    );

  return NextResponse.json({ stalls });
}
