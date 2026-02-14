import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const REQUIRED_FIELDS = [
  "name",
  "slug",
  "category",
  "description",
  "bannerImage",
  "ownerName",
  "ownerPhone",
] as const;

type RequiredField = (typeof REQUIRED_FIELDS)[number];

type StallSubmission = {
  name: string;
  slug: string;
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
  const normalizedSlug = payload.slug.trim().toLowerCase();
  const normalizedPayload = { ...payload, slug: normalizedSlug };

  const { data: existingSlug, error: existingSlugError } = await supabase
    .from("stall_submissions")
    .select("owner_email")
    .eq("stall_slug", normalizedSlug)
    .neq("owner_email", email)
    .limit(1)
    .maybeSingle();

  if (existingSlugError) {
    return NextResponse.json(
      { error: "Failed to validate slug", details: existingSlugError.message },
      { status: 500 }
    );
  }

  if (existingSlug) {
    return NextResponse.json(
      { error: "Slug already taken" },
      { status: 409 }
    );
  }

  await supabase
    .from("stall_submissions")
    .delete()
    .eq("owner_email", email)
    .eq("stall_slug", normalizedSlug);

  const { error } = await supabase.from("stall_submissions").insert({
    owner_email: email,
    stall_slug: normalizedSlug,
    payload: normalizedPayload,
  });

  if (error) {
    return NextResponse.json(
      { error: "Failed to save submission", details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
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
