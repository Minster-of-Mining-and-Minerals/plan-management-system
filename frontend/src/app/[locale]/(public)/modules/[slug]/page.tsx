import { notFound } from "next/navigation";
import {
  getModuleBySlug,
  PLATFORM_MODULES,
} from "@/features/public/config/modules";
import { ModuleDetailPageView } from "@/features/public/views/ModuleDetailPageView";

export function generateStaticParams() {
  return PLATFORM_MODULES.map((mod) => ({ slug: mod.slug }));
}

export default async function ModuleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (!getModuleBySlug(slug)) {
    notFound();
  }

  return <ModuleDetailPageView slug={slug} />;
}
