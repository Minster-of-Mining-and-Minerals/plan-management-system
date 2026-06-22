import NoteEditorPage from "@/features/settings/notes/NoteEditorPage";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <NoteEditorPage noteId={id} />;
}
