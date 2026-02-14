import { ssnlat } from "./client";

export async function upsertShortUrl(shortCode: string, longUrl: string) {
  // Prefer update-first to avoid requiring a unique constraint for upsert.
  // If update affects 0 rows, insert.
  const { data: updated, error: updErr } = await ssnlat
    .from("urls")
    .update({ long_url: longUrl })
    .eq("short_code", shortCode)
    .select("id, short_code, long_url")
    .maybeSingle();

  if (updErr) return { ok: false as const, error: updErr };

  if (updated) return { ok: true as const, created: false as const };

  const { error: insErr } = await ssnlat.from("urls").insert({
    short_code: shortCode,
    long_url: longUrl,
    custom_alias: null,
  });

  if (insErr) return { ok: false as const, error: insErr };

  return { ok: true as const, created: true as const };
}
