import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const REQUIRED_FIELDS = [
  "name",
  // "slug",
  "category",
  "description",
  "bannerImage",
  "ownerName",
  "ownerPhone",
] as const;

// type RequiredField = (typeof REQUIRED_FIELDS)[number];

type StallSubmission = {
  name: string;
  // slug: string;
  category: "food" | "accessories" | "games";
  description: string;
  bannerImage: string;
  logoImage?: string;
  ownerName: string;
  ownerPhone: string;
  images?: string[];
  instagram?: string;
  items?: { name: string; price: string }[];
  highlights?: string[];
  bestSellers?: string[];
  offers?: string[];
  availableAt?: string[];
  stallNumber?: string;
  paymentMethods?: string[];
  limitedTimeOffers?: {
    title: string;
    description?: string;
    validTill?: string;
  }[];
  reviews?: { user: string; rating: number; comment: string }[];
};

function getMissingFields(payload: StallSubmission) {
  return REQUIRED_FIELDS.filter((field) => !payload[field]);
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function getRequestContext(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.replace("Bearer ", "")
    : null;

  if (!token) {
    return {
      response: NextResponse.json(
        { error: "Missing auth token" },
        { status: 401 }
      ),
    };
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    return {
      response: NextResponse.json(
        { error: "Invalid auth token" },
        { status: 401 }
      ),
    };
  }

  const email = data.user.email?.toLowerCase();
  if (!email) {
    return {
      response: NextResponse.json(
        { error: "Email not found" },
        { status: 403 }
      ),
    };
  }

  // Check allowlist (owners or clubs)
  const [ownerResult, clubResult] = await Promise.all([
    supabase
      .from("allowed_owners")
      .select("email")
      .eq("email", email)
      .maybeSingle(),
    supabase
      .from("allowed_clubs")
      .select("email")
      .eq("email", email)
      .maybeSingle(),
  ]);

  if (ownerResult.error || clubResult.error) {
    return {
      response: NextResponse.json(
        { error: "Failed to verify email" },
        { status: 500 }
      ),
    };
  }

  if (!ownerResult.data && !clubResult.data) {
    return {
      response: NextResponse.json(
        { error: "Email not authorized" },
        { status: 403 }
      ),
    };
  }

  return { supabase, email };
}

async function saveSubmission(payload: StallSubmission, email: string) {
  const supabase = createServerSupabaseClient();

  // ALWAYS generate slug from name
  const baseSlug = slugify(payload.name);
  if (!baseSlug) {
    return NextResponse.json({ error: "Invalid stall name" }, { status: 400 });
  }

  // Find existing submission for this owner (if any)
  const { data: existing, error: existingErr } = await supabase
    .from("stall_submissions")
    .select("id, stall_slug")
    .eq("owner_email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingErr) {
    return NextResponse.json(
      { error: "Failed to load existing submission", details: existingErr.message },
      { status: 500 }
    );
  }

  // Ensure unique slug across OTHER owners; suffix if needed
  let candidate = baseSlug;
  let i = 2;

  while (true) {
    const { data: clash, error: clashErr } = await supabase
      .from("stall_submissions")
      .select("id, owner_email")
      .eq("stall_slug", candidate)
      .maybeSingle();

    if (clashErr) {
      return NextResponse.json(
        { error: "Failed to validate slug", details: clashErr.message },
        { status: 500 }
      );
    }

    // available
    if (!clash) break;

    // same row (owner updating)
    if (existing?.id && clash.id === existing.id) break;

    candidate = `${baseSlug}-${i++}`;
  }

  // Mirror slug into payload for convenience (optional)
  const normalizedPayload = payload;

  // Save: update if exists, else insert
  if (existing?.id) {
    const { data: updated, error: updErr } = await supabase
      .from("stall_submissions")
      .update({
        stall_slug: candidate,
        payload: normalizedPayload,
      })
      .eq("id", existing.id)
      .select("id, payload, created_at, stall_slug")
      .maybeSingle();

    if (updErr) {
      return NextResponse.json(
        { error: "Failed to save submission", details: updErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, submission: updated ?? null });
  }

  const { data: inserted, error: insErr } = await supabase
    .from("stall_submissions")
    .insert({
      owner_email: email,
      stall_slug: candidate,
      payload: normalizedPayload,
    })
    .select("id, payload, created_at, stall_slug")
    .maybeSingle();

  if (insErr) {
    return NextResponse.json(
      { error: "Failed to save submission", details: insErr.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, submission: inserted ?? null });
}

async function parsePayload(request: NextRequest) {
  try {
    const payload = (await request.json()) as StallSubmission;
    const missingFields = getMissingFields(payload);

    if (missingFields.length > 0) {
      return {
        response: NextResponse.json(
          { error: "Missing required fields", fields: missingFields },
          { status: 400 }
        ),
      };
    }

    return { payload };
  } catch {
    return {
      response: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }),
    };
  }
}

export async function GET(request: NextRequest) {
  const context = await getRequestContext(request);
  if ("response" in context) return context.response;

  const { supabase, email } = context;
  const { data, error } = await supabase
    .from("stall_submissions")
    .select("id, payload, created_at, stall_slug")
    .eq("owner_email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "Failed to load submission", details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ submission: data ?? null });
}

export async function POST(request: NextRequest) {
  const context = await getRequestContext(request);
  if ("response" in context) return context.response;

  const parsed = await parsePayload(request);
  if ("response" in parsed) return parsed.response;

  return saveSubmission(parsed.payload, context.email);
}

export async function PUT(request: NextRequest) {
  const context = await getRequestContext(request);
  if ("response" in context) return context.response;

  const parsed = await parsePayload(request);
  if ("response" in parsed) return parsed.response;

  return saveSubmission(parsed.payload, context.email);
}

export async function DELETE(request: NextRequest) {
  const context = await getRequestContext(request);
  if ("response" in context) return context.response;

  const { supabase, email } = context;
  const { error, count } = await supabase
    .from("stall_submissions")
    .delete({ count: "exact" })
    .eq("owner_email", email);

  if (error) {
    return NextResponse.json(
      { error: "Failed to delete submission", details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, deleted: count ?? 0 });
}
