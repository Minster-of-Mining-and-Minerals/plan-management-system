// src/redux/api/authApi.ts
import { baseApi } from "../baseApi";
import { AuthResponse, LoginCredentials } from "../types/auth";

export interface MeResponse {
  success: boolean;
  data: {
    user: {
      user_id: string;
      full_name: string;
      email: string;
      phone_number: string;
      profile_image: string | null;
      is_first_logged_in: boolean;
    };
  };
}

export interface PermissionsResponse {
  success: boolean;
  data: {
    permissions: string[];
    roles: string[];
  };
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<AuthResponse, LoginCredentials>({
      query: (credentials) => ({
        url: "/auth/login",
        method: "POST",
        body: credentials,
      }),
      transformResponse: (response: any) => {
        const user = response?.data?.user ?? null;

        // Store token and user immediately
        if (response.token) {
          localStorage.setItem("authToken", response.token);
        }
        if (user) {
          localStorage.setItem("user", JSON.stringify(user));
        }

        return {
          token: response.token,
          user,
          roles: [], // Roles fetched later via getMyPermissions
          message: response.message,
        };
      },
      invalidatesTags: ["User"],
    }),

    getMe: builder.query<MeResponse, void>({
      query: () => ({
        url: "/auth/me",
        method: "GET",
      }),
      providesTags: ["User"],
    }),

    getMyPermissions: builder.query<PermissionsResponse, void>({
      query: () => ({
        url: "/auth/permissions",
        method: "GET",
      }),
      providesTags: ["User"],
    }),

    logout: builder.mutation<{ message: string }, void>({
      query: () => ({
        url: "/auth/logout",
        method: "POST",
      }),
      async onQueryStarted(_, { queryFulfilled }) {
        try {
          await queryFulfilled;
        } finally {
          // Clear token and user on logout
          localStorage.removeItem("authToken");
          localStorage.removeItem("user");
        }
      },
      invalidatesTags: ["User"],
    }),

    requestOTP: builder.mutation<{ success: boolean; message: string }, { email: string }>({
      query: (body) => ({
        url: "/auth/forgot-password/request-otp",
        method: "POST",
        body,
      }),
    }),

    verifyOTP: builder.mutation<{ success: boolean; message: string }, { email: string; otp: string }>({
      query: (body) => ({
        url: "/auth/forgot-password/verify-otp",
        method: "POST",
        body,
      }),
    }),

    resetPassword: builder.mutation<{ success: boolean; message: string }, { email: string; otp: string; newPassword: string }>({
      query: (body) => ({
        url: "/auth/forgot-password/reset-password",
        method: "POST",
        body,
      }),
    }),
  }),
});

export const {
  useLoginMutation,
  useGetMeQuery,
  useGetMyPermissionsQuery,
  useLogoutMutation,
  useRequestOTPMutation,
  useVerifyOTPMutation,
  useResetPasswordMutation,
} = authApi;
