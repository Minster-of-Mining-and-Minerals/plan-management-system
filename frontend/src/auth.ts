import NextAuth from "next-auth";
import authConfig from "./auth.config";
import { JWT } from "next-auth/jwt";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days to match backend JWT
    updateAge: 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        return {
          ...token,
          id: user.id,
          accessToken: user.accessToken,
          is_first_logged_in: user.is_first_logged_in,
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
    government_structure?: any;
    internal_structure?: any;
  }
}