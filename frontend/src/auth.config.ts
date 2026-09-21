import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthConfig } from "next-auth";

export default {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials) return null;

        const email = String(credentials.email || "")
          .trim()
          .toLowerCase();
        const password = String(credentials.password || "");
        if (!email || !password) return null;

        try {
          const baseUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_BASE_URL;
          const res = await fetch(
            `${baseUrl}/auth/login`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ email, password }),
            }
          );

          const data = await res.json();

          if (!res.ok || !data?.success || !data?.data?.user) {
            console.error("Authorize failed:", data?.message || res.status);
            return null;
          }

          const user = data.data.user;

          // Return ONLY lean data — roles/permissions fetched later via /me
          return {
            accessToken: data.token,
            id: user.user_id,
            email: user.email,
            name: user.full_name,
            is_first_logged_in: user.is_first_logged_in,
            account_type: user.account_type ?? "INTERNAL",
            home_route: user.home_route ?? "/profile",
          };
        } catch (err) {
          console.error("Authorize error:", err);
          return null;
        }
      },
    }),
  ],
} satisfies NextAuthConfig;
