import { baseApi } from "../baseApi";

export interface StructureNode {
  government_structure_id?: string;
  internal_structure_id?: string;
  name: string;
  parent_id: string | null;
  level: number;
  is_active: boolean;
  children?: StructureNode[];
}

export const structureApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getGovernmentStructures: builder.query<StructureNode[], { search?: string; is_active?: boolean } | void>({
      query: (params) => ({
        url: "/government-structures",
        params: params || {},
      }),
      transformResponse: (response: any): StructureNode[] => response.data ?? [],
      providesTags: ["User"],
    }),

    getInternalStructures: builder.query<StructureNode[], { government_structure_id?: string; search?: string; is_active?: boolean } | void>({
      query: (params) => ({
        url: "/internal-structures",
        params: params || {},
      }),
      transformResponse: (response: any): StructureNode[] => response.data ?? [],
      providesTags: ["User"],
    }),
  }),
});

export const {
  useGetGovernmentStructuresQuery,
  useGetInternalStructuresQuery,
} = structureApi;
