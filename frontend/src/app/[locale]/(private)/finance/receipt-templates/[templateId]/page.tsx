import { ReceiptTemplateEditor } from "@/features/finance/ReceiptTemplateEditor";

type Props = {
  params: Promise<{ templateId: string }>;
};

export default async function EditReceiptTemplatePage({ params }: Props) {
  const { templateId } = await params;
  return <ReceiptTemplateEditor templateId={templateId} />;
}
