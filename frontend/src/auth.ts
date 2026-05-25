import NextAuth from "next-auth";
import authConfig from "./auth.config";
import { JWT } from "next-auth/jwt";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60,
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
          account_type: user.account_type ?? "INTERNAL",
          home_route: user.home_route ?? "/profile",
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
          account_type: token.account_type as string | undefined,
          home_route: token.home_route as string | undefined,
        },
      };
    },
  },
});

declare module "next-auth" {
  interface User {
    accessToken?: string;
    id: string;
    is_first_logged_in?: boolean;
    account_type?: string;
    home_route?: string;
  }

  interface Session {
    accessToken?: string;
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      is_first_logged_in?: boolean;
      account_type?: string;
      home_route?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    accessToken?: string;
    is_first_logged_in?: boolean;
    account_type?: string;
    home_route?: string;
  }
}
