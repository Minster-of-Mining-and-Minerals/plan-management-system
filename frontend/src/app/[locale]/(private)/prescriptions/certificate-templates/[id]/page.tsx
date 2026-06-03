import { MedicalCertificateTemplateEditor } from "@/features/medical-certificate/MedicalCertificateTemplateEditor";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditMedicalCertificateTemplatePage({ params }: Props) {
  const { id } = await params;
  return <MedicalCertificateTemplateEditor templateId={id} />;
}
