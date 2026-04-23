import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface Permission {
  permission_id: string;
  resource: string;
  action: string;
}

interface Role {
  role_id: string;
  name: string;
  permissions: Permission[];
}

interface UserProfile {
  user_id: string;
  full_name: string;
  email: string;
  phone_number: string;
  profile_image: string | null;
  is_first_logged_in: boolean;
}

interface AuthState {
  user: UserProfile | null;
  roles: Role[];
  /** Flat permission keys as "resource:action" e.g. "users:read" */
  permissions: string[];
  isLoaded: boolean;
}

const initialState: AuthState = {
  user: null,
  roles: [],
  permissions: [],
  isLoaded: false,
};

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUserProfile: (
      state,
      action: PayloadAction<{ user: UserProfile; roles: Role[] }>
    ) => {
      state.user = action.payload.user;
      state.roles = action.payload.roles;
      // Build flat "resource:action" permission list for easy checking
      state.permissions = action.payload.roles.flatMap((role) =>
        role.permissions.map((p) => `${p.resource}:${p.action}`)
      );
      state.isLoaded = true;
    },
    clearUserProfile: (state) => {
      state.user = null;
      state.roles = [];
      state.permissions = [];
      state.isLoaded = false;
    },
  },
});

export const { setUserProfile, clearUserProfile } = authSlice.actions;
export default authSlice.reducer;
