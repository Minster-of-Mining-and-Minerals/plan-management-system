"use client";

import { getModuleBySlug } from "../config/modules";
import { ModuleDetailView } from "../components/ModuleDetailView";

export function ModuleDetailPageView({ slug }: { slug: string }) {
  const module = getModuleBySlug(slug);

  if (!module) {
    return null;
  }

  return <ModuleDetailView module={module} />;
}
