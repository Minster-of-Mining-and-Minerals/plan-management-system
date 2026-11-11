"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Globe2,
} from "lucide-react";

interface Props {
  defaultTab?: string;
}

export function NationalReportingView({ defaultTab = "dashboard" }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlTab = searchParams.get("tab");

  const [activeTab, setActiveTab] = useState<string>(urlTab || defaultTab);

  useEffect(() => {
    if (urlTab) {
      setActiveTab(urlTab);
    } else if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [urlTab, defaultTab]);

  const handleTabChange = (val: string) => {
    setActiveTab(val);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold text-xs tracking-wider uppercase">
            <Globe2 className="h-4 w-4" />
            Federal Gateway & National Aggregation Framework
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
            National Reporting Framework
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Define national indicators, assign reporting mandates to regional states, and monitor validated provincial achievements.
          </p>
        </div>
      </div>
    </div>
  );
}

