export type PrescriptionDocumentTemplate = {
  document_template_id: string;
  name: string;
  code: string;
  category_id?: string | null;
  html_content: string;
  is_default: boolean;
  status: "active" | "inactive";
  category?: Pick<import("./prescription").PrescriptionCategory, "category_id" | "name" | "code">;
  created_at?: string;
  updated_at?: string;
};

export type PrescriptionDocumentPlaceholder = {
  key: string;
  description: string;
};
