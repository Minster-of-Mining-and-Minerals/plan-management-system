import { baseApi } from "../baseApi";
import type {
  CreateDepartmentPayload,
  Department,
  DepartmentListParams,
  DepartmentStatus,
  UpdateDepartmentPayload,
} from "../types/department";

type DepartmentListResponse = {
  data: Department[];
  count: number;
  totalPages?: number;
  currentPage?: number;
  limit?: number;
};

export const departmentApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDepartments: builder.query<Department[], DepartmentListParams | void>({
      query: (params) => ({
        url: "/departments",
        params: params || {},
      }),
      transformResponse: (response: DepartmentListResponse) =>
        response.data ?? [],
      providesTags: ["Department"],
    }),

    getDepartmentById: builder.query<Department, string>({
      query: (id) => `/departments/${id}`,
      transformResponse: (response: { data: Department }) => response.data,
      providesTags: (_r, _e, id) => [{ type: "Department", id }],
    }),

    createDepartment: builder.mutation<Department, CreateDepartmentPayload>({
      query: (body) => ({
        url: "/departments",
        method: "POST",
        body,
      }),
      transformResponse: (response: { data: Department }) => response.data,
      invalidatesTags: ["Department"],
    }),

    updateDepartment: builder.mutation<
      Department,
      { id: string; data: UpdateDepartmentPayload }
    >({
      query: ({ id, data }) => ({
        url: `/departments/${id}`,
        method: "PUT",
        body: data,
      }),
      transformResponse: (response: { data: Department }) => response.data,
      invalidatesTags: (_r, _e, { id }) => [{ type: "Department", id }, "Department"],
    }),

    toggleDepartmentStatus: builder.mutation<
      Department,
      { id: string; status: DepartmentStatus }
    >({
      query: ({ id, status }) => ({
        url: `/departments/${id}/status`,
        method: "PATCH",
        body: { status },
      }),
      transformResponse: (response: { data: Department }) => response.data,
      invalidatesTags: (_r, _e, { id }) => [{ type: "Department", id }, "Department"],
    }),

    deleteDepartment: builder.mutation<{ message?: string }, string>({
      query: (id) => ({
        url: `/departments/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Department"],
    }),
  }),
});

export const {
  useGetDepartmentsQuery,
  useGetDepartmentByIdQuery,
  useCreateDepartmentMutation,
  useUpdateDepartmentMutation,
  useToggleDepartmentStatusMutation,
  useDeleteDepartmentMutation,
} = departmentApi;
