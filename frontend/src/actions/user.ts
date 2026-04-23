"use server";

import { signIn, signOut, auth } from "@/auth";
import { AuthError } from "next-auth";

export const login = async (email: string, password: string) => {
  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  try {
    await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid email or password." };
        default:
          return { error: "Something went wrong." };
      }
    }
    throw error;
  }
};

export const logout = async () => {
  await signOut({ redirectTo: "/login" });
};

export const getSession = async () => {
  return await auth();
};

export const getCurrentUser = async () => {
  const session = await auth();
  return session?.user ?? null;
};

/**
 * Server-side permission checks are no longer available since permissions
 * are fetched client-side via /api/auth/me and stored in Redux.
 * For client components, use the `useAuth` hook from @/hooks/use-auth:
 *   const { hasPermission } = useAuth();
 */
export const checkPermission = async (_permissionKey: string): Promise<boolean> => {
  return false;
};

/**
 * Use the `useAuth` hook from @/hooks/use-auth for role checking in client components.
 */
export const hasRole = async (_roleName: string): Promise<boolean> => {
  return false;
};