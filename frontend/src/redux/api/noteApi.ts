import { baseApi } from "../baseApi";
import type {
  CreateNotePayload,
  Note,
  NotesListQuery,
  NotesListResponse,
  UpdateNotePayload,
} from "../types/note";

export const noteApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getNotes: builder.query<NotesListResponse, NotesListQuery | void>({
      query: (params) => ({
        url: "/notes",
        params: params || undefined,
      }),
      transformResponse: (response: { success: boolean; data: Note[]; meta: NotesListResponse["meta"] }) => ({
        data: response.data,
        meta: response.meta,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ note_id }) => ({ type: "Notes" as const, id: note_id })),
              { type: "Notes", id: "LIST" },
            ]
          : [{ type: "Notes", id: "LIST" }],
    }),
    getNoteById: builder.query<Note, string>({
      query: (id) => `/notes/${id}`,
      transformResponse: (response: { data: Note }) => response.data,
      providesTags: (_result, _error, id) => [{ type: "Notes", id }],
    }),
    createNote: builder.mutation<Note, CreateNotePayload>({
      query: (body) => ({ url: "/notes", method: "POST", body }),
      transformResponse: (response: { data: Note }) => response.data,
      invalidatesTags: [{ type: "Notes", id: "LIST" }, "SystemAuditLog"],
    }),
    updateNote: builder.mutation<Note, { id: string; body: UpdateNotePayload }>({
      query: ({ id, body }) => ({ url: `/notes/${id}`, method: "PUT", body }),
      transformResponse: (response: { data: Note }) => response.data,
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Notes", id },
        { type: "Notes", id: "LIST" },
        "SystemAuditLog",
      ],
    }),
    deleteNote: builder.mutation<void, string>({
      query: (id) => ({ url: `/notes/${id}`, method: "DELETE" }),
      invalidatesTags: (_r, _e, id) => [
        { type: "Notes", id },
        { type: "Notes", id: "LIST" },
        "SystemAuditLog",
      ],
    }),
    logNoteAttachmentDownload: builder.mutation<void, { noteId: string; attachmentId: string }>({
      query: ({ noteId, attachmentId }) => ({
        url: `/notes/${noteId}/attachments/${attachmentId}/download-log`,
        method: "POST",
      }),
      invalidatesTags: ["SystemAuditLog"],
    }),
  }),
});

export const {
  useGetNotesQuery,
  useGetNoteByIdQuery,
  useCreateNoteMutation,
  useUpdateNoteMutation,
  useDeleteNoteMutation,
  useLogNoteAttachmentDownloadMutation,
} = noteApi;
