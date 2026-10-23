import CredentialsProvider from "next-auth/providers/credentials";
import { CredentialsSignin, type NextAuthConfig } from "next-auth";
import { normalizeEmail } from "@/utils/emailUtils";

class InactiveUserError extends CredentialsSignin {
  code = "inactive_user";
}

class LoginValidationError extends CredentialsSignin {
  code = "validation_error";
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
        const normalizedEmail = normalizeEmail(String(email ?? ""));

        try {
          const apiBase =
            process.env.INTERNAL_API_URL ||
            process.env.NEXT_PUBLIC_BASE_URL ||
            "http://localhost:4000/api";

          const res = await fetch(`${apiBase}/auth/login`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: normalizedEmail,
              password: String(password ?? "").trim(),
            }),
          });

          const data = await res.json();

          if (res.status === 400) {
            throw new LoginValidationError();
          }

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
            domain: user.domain || (user.purchasing_center_id ? "purchasing_center" : user.company_id ? "company" : user.region_id ? "regional" : "federal"),
            region_id: user.region_id || null,
            regional_structure_id: user.regional_structure_id || null,
            region: user.region || null,
            regional_structure: user.regional_structure || null,
            company_id: user.company_id || null,
            company_structure_id: user.company_structure_id || null,
            company: user.company || null,
            company_structure: user.company_structure || null,
            purchasing_center_id: user.purchasing_center_id || null,
            purchasing_center: user.purchasing_center || null,
            government_structure: user.government_structure,
            internal_structure: user.internal_structure,
          };
        } catch (err) {
          if (err instanceof InactiveUserError || err instanceof LoginValidationError) {
            throw err;
          }
          console.error("Authorize error:", err);
          return null;
        }
      },
    }),
  ],
} satisfies NextAuthConfig;
