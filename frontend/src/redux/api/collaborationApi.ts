import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import type {
  CollaborationDocument,
  CreateDocumentPayload,
  DocumentCountsQuery,
  DocumentVersion,
  EditorSession,
  ListDocumentsQuery,
  UpdateDocumentStatusPayload,
  VersionEditorSession,
  DocumentGrant,
  CreateDocumentSharePayload,
  ForwardDocumentPayload,
} from "../types/document";

const collaborationBaseQuery = fetchBaseQuery({
  baseUrl: process.env.NEXT_PUBLIC_COLLABORATION_API_URL || "http://localhost:4000/api/v1",
  prepareHeaders: (headers) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("authToken");
      if (token) {
        headers.set("authorization", `Bearer ${token}`);
      }
    }
    headers.set("accept", "application/json");
    return headers;
  },
});

const baseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  if (args && typeof args === "object" && "body" in args && args.body instanceof FormData) {
    return collaborationBaseQuery(args, api, extraOptions);
  }

  if (args && typeof args === "object" && "method" in args && args.method && args.method !== "GET") {
    return collaborationBaseQuery(
      {
        ...args,
        headers: {
          ...(typeof args.headers === "object" && args.headers ? args.headers : {}),
          "content-type": "application/json",
        },
      },
      api,
      extraOptions
    );
  }

  return collaborationBaseQuery(args, api, extraOptions);
};

export const collaborationApi = createApi({
  reducerPath: "collaborationApi",
  baseQuery,
  tagTypes: ["CollaborationDocuments", "CollaborationDocumentVersions", "DocumentShares"],
  endpoints: (builder) => ({
    getDocuments: builder.query<CollaborationDocument[], ListDocumentsQuery | void>({
      query: (params) => ({
        url: "/documents",
        params: params || undefined,
      }),
      transformResponse: (response: { success: boolean; data: CollaborationDocument[] }) =>
        response.data,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ document_id }) => ({
                type: "CollaborationDocuments" as const,
                id: document_id,
              })),
              { type: "CollaborationDocuments", id: "LIST" },
            ]
          : [{ type: "CollaborationDocuments", id: "LIST" }],
    }),
    getDocumentById: builder.query<CollaborationDocument, string>({
      query: (id) => `/documents/${id}`,
      transformResponse: (response: { success: boolean; data: CollaborationDocument }) =>
        response.data,
      providesTags: (_result, _error, id) => [{ type: "CollaborationDocuments", id }],
    }),
    createDocument: builder.mutation<CollaborationDocument, CreateDocumentPayload>({
      query: (payload) => {
        if (payload.file) {
          const formData = new FormData();
          formData.append("title", payload.title);
          if (payload.ownerApp) formData.append("ownerApp", payload.ownerApp);
          if (payload.ownerType) formData.append("ownerType", payload.ownerType);
          if (payload.ownerId) formData.append("ownerId", payload.ownerId);
          if (payload.fileType) formData.append("fileType", payload.fileType);
          formData.append("file", payload.file);
          return { url: "/documents", method: "POST", body: formData };
        }

        return {
          url: "/documents",
          method: "POST",
          body: {
            title: payload.title,
            fileType: payload.fileType,
            ownerApp: payload.ownerApp,
            ownerType: payload.ownerType,
            ownerId: payload.ownerId,
          },
        };
      },
      transformResponse: (response: { success: boolean; data: CollaborationDocument }) =>
        response.data,
      invalidatesTags: [{ type: "CollaborationDocuments", id: "LIST" }],
    }),
    deleteDocument: builder.mutation<void, string>({
      query: (id) => ({ url: `/documents/${id}`, method: "DELETE" }),
      invalidatesTags: (_result, _error, id) => [
        { type: "CollaborationDocuments", id },
        { type: "CollaborationDocuments", id: "LIST" },
      ],
    }),
    getEditorSession: builder.query<EditorSession, string>({
      query: (id) => `/documents/${id}/editor-session`,
      transformResponse: (response: { success: boolean; data: EditorSession }) => response.data,
      providesTags: (_result, _error, id) => [{ type: "CollaborationDocuments", id }],
    }),
    getVersionEditorSession: builder.query<
      VersionEditorSession,
      { id: string; versionNumber: number }
    >({
      query: ({ id, versionNumber }) =>
        `/documents/${id}/versions/${versionNumber}/editor-session`,
      transformResponse: (response: { success: boolean; data: VersionEditorSession }) =>
        response.data,
    }),
    getDocumentVersions: builder.query<DocumentVersion[], string>({
      query: (id) => `/documents/${id}/versions`,
      transformResponse: (response: { success: boolean; data: DocumentVersion[] }) => response.data,
      providesTags: (_result, _error, id) => [
        { type: "CollaborationDocumentVersions", id },
        { type: "CollaborationDocuments", id },
      ],
    }),
    getDocumentCounts: builder.query<Record<string, number>, DocumentCountsQuery>({
      query: ({ ownerApp, ownerType, ownerIds }) => ({
        url: "/documents/counts",
        params: {
          ownerApp: ownerApp || "plan-management",
          ownerType,
          ownerIds: ownerIds.join(","),
        },
      }),
      transformResponse: (response: { success: boolean; data: Record<string, number> }) =>
        response.data,
    }),
    restoreDocumentVersion: builder.mutation<
      CollaborationDocument,
      { id: string; versionNumber: number }
    >({
      query: ({ id, versionNumber }) => ({
        url: `/documents/${id}/versions/${versionNumber}/restore`,
        method: "POST",
      }),
      transformResponse: (response: { success: boolean; data: CollaborationDocument }) =>
        response.data,
      invalidatesTags: (_result, _error, { id }) => [
        { type: "CollaborationDocuments", id },
        { type: "CollaborationDocumentVersions", id },
      ],
    }),
    updateDocumentStatus: builder.mutation<CollaborationDocument, UpdateDocumentStatusPayload>({
      query: ({ id, status }) => ({
        url: `/documents/${id}/status`,
        method: "PATCH",
        body: { status },
      }),
      transformResponse: (response: { success: boolean; data: CollaborationDocument }) =>
        response.data,
      invalidatesTags: (_result, _error, { id }) => [
        { type: "CollaborationDocuments", id },
        { type: "CollaborationDocuments", id: "LIST" },
      ],
    }),
    getDocumentShares: builder.query<DocumentGrant[], string>({
      query: (documentId) => `/documents/${documentId}/shares`,
      transformResponse: (response: { success: boolean; data: DocumentGrant[] }) => response.data,
      providesTags: (_result, _error, documentId) => [{ type: "DocumentShares", id: documentId }],
    }),
    createDocumentShare: builder.mutation<DocumentGrant, CreateDocumentSharePayload>({
      query: ({ documentId, principalType, principalId, role }) => ({
        url: `/documents/${documentId}/shares`,
        method: "POST",
        body: {
          principalType: principalType || "user",
          principalId,
          role: role || "viewer",
        },
      }),
      transformResponse: (response: { success: boolean; data: DocumentGrant }) => response.data,
      invalidatesTags: (_result, _error, { documentId }) => [
        { type: "DocumentShares", id: documentId },
        { type: "CollaborationDocuments", id: documentId },
      ],
    }),
    revokeDocumentShare: builder.mutation<void, { documentId: string; grantId: string }>({
      query: ({ documentId, grantId }) => ({
        url: `/documents/${documentId}/shares/${grantId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { documentId }) => [
        { type: "DocumentShares", id: documentId },
        { type: "CollaborationDocuments", id: documentId },
      ],
    }),
    forwardDocument: builder.mutation<
      { document_id: string; recipient_user_id: string; grant_access: boolean },
      ForwardDocumentPayload
    >({
      query: ({ documentId, recipientUserId, message, grantAccess }) => ({
        url: `/documents/${documentId}/forward`,
        method: "POST",
        body: {
          recipientUserId,
          message,
          grantAccess,
        },
      }),
      transformResponse: (response: {
        success: boolean;
        data: { document_id: string; recipient_user_id: string; grant_access: boolean };
      }) => response.data,
    }),
  }),
});

export const {
  useGetDocumentsQuery,
  useGetDocumentByIdQuery,
  useCreateDocumentMutation,
  useDeleteDocumentMutation,
  useGetEditorSessionQuery,
  useGetVersionEditorSessionQuery,
  useGetDocumentVersionsQuery,
  useGetDocumentCountsQuery,
  useRestoreDocumentVersionMutation,
  useUpdateDocumentStatusMutation,
  useGetDocumentSharesQuery,
  useCreateDocumentShareMutation,
  useRevokeDocumentShareMutation,
  useForwardDocumentMutation,
} = collaborationApi;

export function getDocumentVersionDownloadUrl(documentId: string, versionNumber: number) {
  const baseUrl =
    process.env.NEXT_PUBLIC_COLLABORATION_API_URL || "http://localhost:4000/api/v1";
  return `${baseUrl}/documents/${documentId}/versions/${versionNumber}/file`;
}
