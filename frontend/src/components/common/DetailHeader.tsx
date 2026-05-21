"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

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
  return (
    <div className={className}>
      {/* Breadcrumb Section */}
      {breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-2 text-sm text-gray-400 mb-2">
          {breadcrumbs.map((crumb, idx) => (
            <div key={idx} className="flex items-center gap-2">
              {crumb.link ? (
                <Link
                  href={crumb.link}
                  className="hover:text-section-accent transition-colors"
                >
                  {crumb.title}
                </Link>
              ) : (
                <span className="font-medium text-gray-900">
                  {crumb.title}
                </span>
              )}

              {idx < breadcrumbs.length - 1 && (
                <ChevronRight className="h-3 w-3 text-gray-300" />
              )}
            </div>
          ))}
        </nav>
      )}
    </div>
  );
};

export default DetailHeader;