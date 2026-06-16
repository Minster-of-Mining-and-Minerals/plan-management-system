import CredentialsProvider from "next-auth/providers/credentials";
import { CredentialsSignin, type NextAuthConfig } from "next-auth";

class InactiveUserError extends CredentialsSignin {
  code = "inactive_user";
}

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

        const { email, password } = credentials;

        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL}/auth/login`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ email, password }),
            }
          );

          const data = await res.json();

          if (res.status === 403 && data?.message === "User is inactive") {
            throw new InactiveUserError();
          }

          if (!res.ok || !data?.success) {
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
            government_structure: user.government_structure,
            internal_structure: user.internal_structure,
          };
        } catch (err) {
          if (err instanceof InactiveUserError) {
            throw err;
          }
          console.error("Authorize error:", err);
          return null;
        }
      },
    }),
  ],
} satisfies NextAuthConfig;
