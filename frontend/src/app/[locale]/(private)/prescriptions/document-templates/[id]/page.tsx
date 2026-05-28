import { PrescriptionDocumentTemplateEditor } from "@/features/prescription-forms/PrescriptionDocumentTemplateEditor";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditPrescriptionDocumentTemplatePage({ params }: Props) {
  const { id } = await params;
  return <PrescriptionDocumentTemplateEditor documentTemplateId={id} />;
}
