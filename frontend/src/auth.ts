import NextAuth from "next-auth";
import authConfig from "./auth.config";
import { JWT } from "next-auth/jwt";
import { AUTH_ROUTES } from "./constants/authRoutes";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days to match backend JWT
    updateAge: 24 * 60 * 60,
  },
  pages: {
    signIn: AUTH_ROUTES.login,
    error: AUTH_ROUTES.login,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        return {
          ...token,
          id: user.id,
          accessToken: user.accessToken,
          is_first_logged_in: user.is_first_logged_in,
          domain: user.domain,
          region_id: user.region_id,
          regional_structure_id: user.regional_structure_id,
          region: user.region,
          regional_structure: user.regional_structure,
          company_id: user.company_id,
          company_structure_id: user.company_structure_id,
          company: user.company,
          company_structure: user.company_structure,
          purchasing_center_id: user.purchasing_center_id,
          purchasing_center: user.purchasing_center,
          government_structure: user.government_structure,
          internal_structure: user.internal_structure,
        };
      }
      if (token.exp && token.exp < Date.now() / 1000) {
        console.log("Token expired");
        return null;
      }
      return token;
    },
    async session({ session, token }) {
      return {
        ...session,
        accessToken: token.accessToken,
        user: {
          ...session.user,
          id: token.id as string,
          is_first_logged_in: token.is_first_logged_in,
          domain: token.domain,
          region_id: token.region_id,
          regional_structure_id: token.regional_structure_id,
          region: token.region,
          regional_structure: token.regional_structure,
          company_id: token.company_id,
          company_structure_id: token.company_structure_id,
          company: token.company,
          company_structure: token.company_structure,
          purchasing_center_id: token.purchasing_center_id,
          purchasing_center: token.purchasing_center,
          government_structure: token.government_structure,
          internal_structure: token.internal_structure,
        },
      };
    },
  },
});

// Type augmentations
declare module "next-auth" {
  interface User {
    accessToken?: string;
    id: string;
    is_first_logged_in?: boolean;
    domain?: string;
    region_id?: string | null;
    regional_structure_id?: string | null;
    region?: any;
    regional_structure?: any;
    company_id?: string | null;
    company_structure_id?: string | null;
    company?: any;
    company_structure?: any;
    purchasing_center_id?: string | null;
    purchasing_center?: any;
    government_structure?: any;
    internal_structure?: any;
  }

  interface Session {
    accessToken?: string;
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      is_first_logged_in?: boolean;
      domain?: string;
      region_id?: string | null;
      regional_structure_id?: string | null;
      region?: any;
      regional_structure?: any;
      company_id?: string | null;
      company_structure_id?: string | null;
      company?: any;
      company_structure?: any;
      purchasing_center_id?: string | null;
      purchasing_center?: any;
      government_structure?: any;
      internal_structure?: any;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    accessToken?: string;
    is_first_logged_in?: boolean;
    domain?: string;
    region_id?: string | null;
    regional_structure_id?: string | null;
    region?: any;
    regional_structure?: any;
    company_id?: string | null;
    company_structure_id?: string | null;
    company?: any;
    company_structure?: any;
    purchasing_center_id?: string | null;
    purchasing_center?: any;
    government_structure?: any;
    internal_structure?: any;
  }
}