import { baseApi } from "../baseApi";
import type {
  CreateUserTitlePayload,
  UpdateUserTitlePayload,
  UserTitle,
  UserTitleListParams,
  UserTitleStatus,
} from "../types/userTitle";

type UserTitleListResponse = {
  data: UserTitle[];
  count: number;
  totalPages?: number;
  currentPage?: number;
  limit?: number;
};

export const userTitleApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getUserTitles: builder.query<UserTitle[], UserTitleListParams | void>({
      query: (params) => ({
        url: "/user-titles",
        params: params || {},
      }),
      transformResponse: (response: UserTitleListResponse) =>
        response.data ?? [],
      providesTags: ["UserTitle"],
    }),

    getUserTitleById: builder.query<UserTitle, string>({
      query: (id) => `/user-titles/${id}`,
      transformResponse: (response: { data: UserTitle }) => response.data,
      providesTags: (_r, _e, id) => [{ type: "UserTitle", id }],
    }),

    createUserTitle: builder.mutation<UserTitle, CreateUserTitlePayload>({
      query: (body) => ({
        url: "/user-titles",
        method: "POST",
        body,
      }),
      transformResponse: (response: { data: UserTitle }) => response.data,
      invalidatesTags: ["UserTitle"],
    }),

    updateUserTitle: builder.mutation<
      UserTitle,
      { id: string; data: UpdateUserTitlePayload }
    >({
      query: ({ id, data }) => ({
        url: `/user-titles/${id}`,
        method: "PUT",
        body: data,
      }),
      transformResponse: (response: { data: UserTitle }) => response.data,
      invalidatesTags: (_r, _e, { id }) => [{ type: "UserTitle", id }, "UserTitle"],
    }),

    toggleUserTitleStatus: builder.mutation<
      UserTitle,
      { id: string; status: UserTitleStatus }
    >({
      query: ({ id, status }) => ({
        url: `/user-titles/${id}/status`,
        method: "PATCH",
        body: { status },
      }),
      transformResponse: (response: { data: UserTitle }) => response.data,
      invalidatesTags: (_r, _e, { id }) => [{ type: "UserTitle", id }, "UserTitle"],
    }),

    deleteUserTitle: builder.mutation<{ message?: string }, string>({
      query: (id) => ({
        url: `/user-titles/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["UserTitle"],
    }),
  }),
});

export const {
  useGetUserTitlesQuery,
  useGetUserTitleByIdQuery,
  useCreateUserTitleMutation,
  useUpdateUserTitleMutation,
  useToggleUserTitleStatusMutation,
  useDeleteUserTitleMutation,
} = userTitleApi;
