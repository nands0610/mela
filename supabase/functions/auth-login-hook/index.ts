import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req: Request): Promise<Response> => {
  try {
    // JWT Claims hook receives user data in the request body
    const body = await req.json();
    const user = body.user;

    if (!user || !user.email) {
      return new Response(
        JSON.stringify({ error: "No user email provided" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const email = user.email.toLowerCase();

    // Check if email is in allowlist (owners or clubs)
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
      console.error("Allowlist check error:", ownerResult.error || clubResult.error);
      return new Response(
        JSON.stringify({ error: "Internal error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // If email not in allowlist, deny
    if (!ownerResult.data && !clubResult.data) {
      return new Response(
        JSON.stringify({
          error: "for that you have to put stall next year bye bye 👋",
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Email is allowed, return empty claims (user can proceed)
    return new Response(
      JSON.stringify({}),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Auth hook error:", err);
    return new Response(
      JSON.stringify({ error: "Server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
