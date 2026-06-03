import { baseApi } from "../baseApi";

export type MedicalDiagram = {
  diagram_id: string;
  name: string;
  code: string;
  image_file?: string | null;
  category?: string | null;
  status: "active" | "inactive";
  created_at?: string;
  updated_at?: string;
};

export const medicalDiagramApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listMedicalDiagrams: builder.query<
      MedicalDiagram[],
      { include_inactive?: boolean; status?: string } | void
    >({
      query: (params) => ({
        url: "/medical-diagrams",
        params: params?.include_inactive
          ? { include_inactive: "true", status: params?.status }
          : params?.status
            ? { status: params.status }
            : undefined,
      }),
      transformResponse: (r: { data: MedicalDiagram[] }) => r.data ?? [],
      providesTags: ["MedicalDiagram"],
    }),

    getMedicalDiagramMeta: builder.query<{ categories: string[] }, void>({
      query: () => "/medical-diagrams/meta",
      transformResponse: (r: { data: { categories: string[] } }) => r.data,
    }),

    getMedicalDiagram: builder.query<MedicalDiagram, string>({
      query: (id) => `/medical-diagrams/${id}`,
      transformResponse: (r: { data: MedicalDiagram }) => r.data,
      providesTags: (_r, _e, id) => [{ type: "MedicalDiagram", id }],
    }),

    createMedicalDiagram: builder.mutation<
      MedicalDiagram,
      {
        name: string;
        code: string;
        image_file?: string;
        category?: string;
        status?: "active" | "inactive";
      }
    >({
      query: (body) => ({ url: "/medical-diagrams", method: "POST", body }),
      transformResponse: (r: { data: MedicalDiagram }) => r.data,
      invalidatesTags: ["MedicalDiagram"],
    }),

    updateMedicalDiagram: builder.mutation<
      MedicalDiagram,
      { diagramId: string; body: Partial<MedicalDiagram> }
    >({
      query: ({ diagramId, body }) => ({
        url: `/medical-diagrams/${diagramId}`,
        method: "PUT",
        body,
      }),
      transformResponse: (r: { data: MedicalDiagram }) => r.data,
      invalidatesTags: ["MedicalDiagram"],
    }),

    deleteMedicalDiagram: builder.mutation<void, string>({
      query: (id) => ({ url: `/medical-diagrams/${id}`, method: "DELETE" }),
      invalidatesTags: ["MedicalDiagram"],
    }),

    seedMedicalDiagramDefaults: builder.mutation<{ seeded: number }, void>({
      query: () => ({ url: "/medical-diagrams/seed-defaults", method: "POST" }),
      transformResponse: (r: { data: { seeded: number } }) => r.data,
      invalidatesTags: ["MedicalDiagram"],
    }),
  }),
});

export const {
  useListMedicalDiagramsQuery,
  useGetMedicalDiagramMetaQuery,
  useGetMedicalDiagramQuery,
  useCreateMedicalDiagramMutation,
  useUpdateMedicalDiagramMutation,
  useDeleteMedicalDiagramMutation,
  useSeedMedicalDiagramDefaultsMutation,
} = medicalDiagramApi;
