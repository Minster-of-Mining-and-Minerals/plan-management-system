// src/redux/apis/attachmentApi.ts
import { baseApi } from "../baseApi";

export interface Attachment {
  attachment_id: string;
  file_name: string;
  /** @deprecated Prefer download_url / authenticated file endpoint */
  file_path?: string;
  download_url?: string;
  uploaded_by?: string;
  created_at?: string;
}

export interface UploadFilesDto {
  files: File[];
}

// Inject endpoints into the base API
export const attachmentApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get all attachments
    getAttachments: builder.query<
      { success: boolean; count: number; attachments: Attachment[] },
      void
    >({
      query: () => `/attachments`,
      providesTags: (result) =>
        result
          ? [
            ...result.attachments.map(({ attachment_id }) => ({
              type: "Attachment" as const,
              id: attachment_id,
            })),
            { type: "Attachment", id: "LIST" },
          ]
          : [{ type: "Attachment", id: "LIST" }],
    }),

    // Upload multiple files
    uploadAttachments: builder.mutation<
      { success: boolean; message: string; attachments: Attachment[] },
      UploadFilesDto
    >({
      query: (data) => {
        const formData = new FormData();
        data.files.forEach((file) => formData.append("files", file));
        return {
          url: `/attachments`,
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: [{ type: "Attachment", id: "LIST" }],
    }), 

    // Delete an attachment
    deleteAttachment: builder.mutation<
      { success: boolean; message: string; deleted_attachment: Attachment },
      string
    >({
      query: (attachment_id) => ({
        url: `/attachments/${attachment_id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, attachment_id) => [
        { type: "Attachment", id: attachment_id },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetAttachmentsQuery,
  useUploadAttachmentsMutation,
  useDeleteAttachmentMutation,
} = attachmentApi;
