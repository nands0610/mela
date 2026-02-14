"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authStatus, setAuthStatus] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    // Check for OAuth error in URL params
    const error = searchParams.get("error");
    if (error) {
      setAuthStatus(decodeURIComponent(error));
    }

    const checkSession = async () => {
      try {
        const supabase = createBrowserSupabaseClient();
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) {
          // Try to access protected API to verify allowlist
          const token = data.session.access_token;
          const res = await fetch("/api/stalls", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (res.ok) {
            // User is allowed, redirect to dashboard
            router.replace("/owner/stall");
          } else if (res.status === 403) {
            // User is not in allowlist, sign them out
            await supabase.auth.signOut();
            setAuthStatus("for that you have to put stall next year bye bye 👋");
          }
        }
      } catch {
        // Ignore session check errors on load.
      }
    };

    void checkSession();
  }, [router, searchParams]);

  const handleGoogleSignIn = async () => {
    setAuthStatus(null);
    setIsAuthenticating(true);
    
    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setAuthStatus(error.message);
        setIsAuthenticating(false);
      }
    } catch (error) {
      setAuthStatus(error instanceof Error ? error.message : "Sign in failed.");
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-2xl border border-orange-100 bg-white p-8 shadow-[0_20px_60px_rgba(255,140,0,0.15)]">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-500">
            Stall Owner Portal
          </p>
          <h1 className="mt-3 text-3xl md:text-4xl font-bold text-neutral-900">
            Sign in to manage your stall
          </h1>
          <p className="mt-3 text-neutral-600">
            Sign in with your Google account to get started.
          </p>
        </div>

        <div className="mt-8">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isAuthenticating}
            className="w-full rounded-xl bg-white border-2 border-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-900 transition-all hover:border-orange-300 hover:shadow-md active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70 flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {isAuthenticating ? "Signing in..." : "Continue with Google"}
          </button>
        </div>

        {authStatus && (
          <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
            authStatus.includes("bye bye")
              ? "border-orange-200 bg-orange-50 text-orange-700"
              : "border-red-100 bg-red-50 text-red-700"
          }`}>
            {authStatus}
          </div>
        )}
      </div>
    </div>
  );
}
