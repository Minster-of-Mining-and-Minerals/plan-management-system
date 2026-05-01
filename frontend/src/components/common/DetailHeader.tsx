"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight } from "lucide-react";

interface Crumb {
  title?: string;
  link?: string; // if no link = not clickable
  className?: string;
}

interface DetailHeaderProps {
  breadcrumbs?: Crumb[];
  className?: string;
}

const DetailHeader = ({
  breadcrumbs = [],
  className = "",
}: DetailHeaderProps) => {
  const router = useRouter();

  return (
    <div className={className}>
      {/* Breadcrumb Section */}
      {breadcrumbs.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-5">
          {breadcrumbs.map((crumb, idx) => (
            <div key={idx} className="flex items-center gap-2">
              {crumb.link ? (
                <Link
                  href={crumb.link}
                  className="text-[#094C81] hover:font-medium hover:text-[#073954]"
                >
                  {crumb.title}
                </Link>
              ) : (
                <span className="font-medium text-gray-800">
                  {crumb.title}
                </span>
              )}

              {idx < breadcrumbs.length - 1 && (
                <ChevronRight className="h-4 w-4 text-gray-400" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 rounded-md bg-slate-200 px-5 py-1
          text-[#094C81] transition-colors hover:bg-slate-300 hover:text-[#073954]"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back</span>
      </button>
    </div>
  );
};

export default DetailHeader;
