import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { baseApi } from "./baseApi";
import authReducer from "./slices/authSlice";
import "@/redux/api/planRuleApi";
import "@/redux/api/notificationApi";
import "@/redux/api/brandingApi";
import "@/redux/api/planningConfigApi";
import "@/redux/api/systemAuditLogApi";
import "@/redux/api/systemSettingsApi";
import "@/redux/api/issueApi";
import "@/redux/api/formConfigApi";
import "@/redux/api/noteApi";
export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }).concat(baseApi.middleware),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;