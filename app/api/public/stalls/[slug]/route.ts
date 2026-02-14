import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const supabase = createServerSupabaseClient();
    const resolvedParams = await params;
    const rawSlug = resolvedParams?.slug ?? "";
    const fallbackSlug = _request.nextUrl.pathname
      .split("/api/public/stalls/")[1]
      ?.split("/")[0]
      ?? "";
    const slug = (rawSlug || fallbackSlug).trim().toLowerCase();

    if (!slug) {
      return NextResponse.json(
        { error: "Missing stall slug" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("stall_submissions")
      .select("payload")
      .eq("stall_slug", slug)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: "Failed to load stall", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ stall: data?.payload ?? null });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unexpected server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
