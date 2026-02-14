import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get("category")?.toLowerCase();
  const supabase = createServerSupabaseClient();

  const { data: clubRows, error: clubError } = await supabase
    .from("allowed_clubs")
    .select("email");

  if (clubError) {
    return NextResponse.json(
      { error: "Failed to load club allowlist", details: clubError.message },
      { status: 500 }
    );
  }

  const clubEmails = (clubRows ?? [])
    .map((row) => row.email?.toLowerCase())
    .filter(Boolean) as string[];

  if (clubEmails.length === 0) {
    return NextResponse.json({ stalls: [] });
  }

  const { data, error } = await supabase
    .from("stall_submissions")
    .select("payload, stall_slug, created_at, owner_email")
    .in("owner_email", clubEmails)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "Failed to load club stalls", details: error.message },
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
