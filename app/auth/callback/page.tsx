"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    async function completeAuth() {
      const supabase = createClient();
      const url = new URL(window.location.href);
      const params = url.searchParams;
      const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));

      const code = params.get("code");
      const token_hash = params.get("token_hash");
      const type = params.get("type") || hashParams.get("type");
      const access_token = hashParams.get("access_token");
      const refresh_token = hashParams.get("refresh_token");

      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (token_hash && type) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash,
            type: type as any, // invite | recovery | magiclink | etc.
          });
          if (error) throw error;
        } else if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (error) throw error;
        } else {
          router.replace("/auth/login?error=missing_tokens");
          return;
        }

        router.replace(
          type === "invite" || type === "recovery"
            ? "/auth/new-password"
            : "/dashboard"
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : "auth_callback_error";
        router.replace(`/auth/login?error=${encodeURIComponent(msg)}`);
      }
    }
    completeAuth();
  }, [router]);

  return (
    <div className="flex h-[50vh] items-center justify-center text-sm text-muted-foreground">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Completing sign-in…
    </div>
  );
}
