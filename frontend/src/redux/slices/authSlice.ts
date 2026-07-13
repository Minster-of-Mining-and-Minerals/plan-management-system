import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface UserProfile {
  user_id: string;
  full_name: string;
  email: string;
  phone_number: string;
  profile_image: string | null;
  is_first_logged_in: boolean;
}

interface PermissionsPayload {
  permissions: string[];
  roles: string[];
}

interface AuthState {
  user: UserProfile | null;
  roles: string[];
  /** Flat permission keys as "RESOURCE:ACTION" e.g. "USERS:READ" */
  permissions: string[];
  isLoaded: boolean;
  bootstrapError: string | null;
}

const initialState: AuthState = {
  user: null,
  roles: [],
  permissions: [],
  isLoaded: false,
  bootstrapError: null,
};

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<UserProfile>) => {
      state.user = action.payload;
    },
    setPermissions: (state, action: PayloadAction<PermissionsPayload>) => {
      state.roles = action.payload.roles;
      state.permissions = action.payload.permissions;
      state.isLoaded = true;
      state.bootstrapError = null;
    },
    completeAuthBootstrap: (
      state,
      action: PayloadAction<{ error?: string | null } | undefined>
    ) => {
      state.isLoaded = true;
      state.bootstrapError = action.payload?.error ?? null;
      if (action.payload?.error) {
        state.permissions = [];
        state.roles = [];
      }
    },
    clearUserProfile: (state) => {
      state.user = null;
      state.roles = [];
      state.permissions = [];
      state.isLoaded = false;
      state.bootstrapError = null;
    },
  },
});

export const { setUser, setPermissions, completeAuthBootstrap, clearUserProfile } =
  authSlice.actions;
export default authSlice.reducer;
