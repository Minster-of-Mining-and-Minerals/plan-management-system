import { redirect } from "next/navigation";

export default async function LegacyUserFormFieldsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/patients/form-fields`);
}
