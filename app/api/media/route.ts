import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

const r2Client = new S3Client({
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
  },
  region: "auto",
});

function sanitizeKey(value: string) {
  const trimmed = value.replace(/^\/+/, "");
  if (trimmed.includes("..")) {
    return null;
  }
  return trimmed;
}

export async function GET(request: NextRequest) {
  const keyParam = request.nextUrl.searchParams.get("key") ?? "";
  const key = sanitizeKey(decodeURIComponent(keyParam));

  if (!key) {
    return NextResponse.json({ error: "Missing key" }, { status: 400 });
  }

  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) {
    return NextResponse.json(
      { error: "Missing R2_BUCKET_NAME" },
      { status: 500 }
    );
  }

  try {
    const result = await r2Client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );

    const body = result.Body as ReadableStream<Uint8Array> | null;
    if (!body) {
      return NextResponse.json({ error: "Object not found" }, { status: 404 });
    }

    return new NextResponse(body, {
      headers: {
        "Content-Type": result.ContentType ?? "application/octet-stream",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to fetch object",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
