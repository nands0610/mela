import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const r2Client = new S3Client({
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
  },
  region: "auto",
});

function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function getPublicUrl(key: string) {
  const baseUrl = process.env.NEXT_PUBLIC_R2_BUCKET_URL;
  if (!baseUrl) {
    throw new Error("Missing NEXT_PUBLIC_R2_BUCKET_URL");
  }

  return `${baseUrl.replace(/\/$/, "")}/${key}`;
}

async function getAuthorizedEmail(request: NextRequest) {
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

  return { email };
}

export async function POST(request: NextRequest) {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) {
    return NextResponse.json(
      { error: "Missing R2_BUCKET_NAME" },
      { status: 500 }
    );
  }

  const auth = await getAuthorizedEmail(request);
  if ("response" in auth) return auth.response;

  const fileNameHeader = request.headers.get("x-file-name") ?? "upload";
  const folder = request.nextUrl.searchParams.get("folder") ?? "stalls";
  const contentType = request.headers.get("content-type") ?? "application/octet-stream";

  const arrayBuffer = await request.arrayBuffer();
  if (arrayBuffer.byteLength === 0) {
    return NextResponse.json(
      { error: "Empty upload" },
      { status: 400 }
    );
  }

  const safeName = sanitizeFileName(fileNameHeader);
  const key = `${folder}/${auth.email}/${Date.now()}-${safeName}`;

  await r2Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: Buffer.from(arrayBuffer),
      ContentType: contentType,
    })
  );

  return NextResponse.json({ url: getPublicUrl(key), key });
}
