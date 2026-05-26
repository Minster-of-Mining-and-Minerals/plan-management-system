"use client";

import { useMemo, useState } from "react";
import { Download, FileText, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { PatientPortalShell } from "../components/PatientPortalShell";
import { StatusBadge } from "../components/StatusBadge";
import { DemoBanner } from "../components/DemoBanner";
import {
  MOCK_LAB_RESULTS,
  MOCK_LAB_DETAIL,
  formatDate,
} from "../data/mockPatientPortalData";
import type { LabResult } from "../types";

export function LabResultsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selected, setSelected] = useState<LabResult | null>(null);

  const filtered = useMemo(() => {
    return MOCK_LAB_RESULTS.filter((lab) => {
      const matchSearch =
        !search ||
        lab.name.toLowerCase().includes(search.toLowerCase()) ||
        lab.category.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || lab.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [search, statusFilter]);

  const detail = selected ? MOCK_LAB_DETAIL[selected.id] : null;

  return (
    <PatientPortalShell
      title="Lab Results"
      description="Review test results, download reports, and track abnormal indicators."
    >
      <DemoBanner />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tests..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="ready">Ready</TabsTrigger>
            <TabsTrigger value="processing">Processing</TabsTrigger>
            <TabsTrigger value="reviewed">Reviewed</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((lab) => (
          <Card
            key={lab.id}
            className="cursor-pointer border-border/60 bg-card/80 transition-all hover:border-primary/30 hover:shadow-md"
            onClick={() => setSelected(lab)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base leading-snug">{lab.name}</CardTitle>
                <StatusBadge status={lab.status} />
              </div>
              <p className="text-xs text-muted-foreground">{lab.category}</p>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Ordered {formatDate(lab.orderedDate)}
                {lab.resultDate ? ` · Result ${formatDate(lab.resultDate)}` : ""}
              </p>
              <p className="text-sm text-muted-foreground">{lab.doctor}</p>
              {lab.abnormal ? (
                <span className="inline-flex text-xs font-medium text-amber-600">
                  ⚠ Contains abnormal values
                </span>
              ) : null}
              {lab.summary ? (
                <p className="text-sm rounded-md bg-muted/40 p-2">{lab.summary}</p>
              ) : null}
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    toast.message("Download — demo", {
                      description: "PDF report download will be available when integrated.",
                    });
                  }}
                >
                  <Download className="h-3.5 w-3.5" />
                  Report
                </Button>
                <Button size="sm" variant="ghost" className="gap-1">
                  <FileText className="h-3.5 w-3.5" />
                  View
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selected?.name}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={selected.status} />
                {selected.abnormal ? (
                  <span className="text-xs font-medium text-amber-600">Abnormal flag</span>
                ) : null}
              </div>
              {detail ? (
                <div className="overflow-hidden rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Test</th>
                        <th className="px-3 py-2 text-right font-medium">Value</th>
                        <th className="px-3 py-2 text-right font-medium">Range</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.tests.map((t) => (
                        <tr key={t.name} className="border-t border-border/50">
                          <td className="px-3 py-2">{t.name}</td>
                          <td className="px-3 py-2 text-right font-medium">
                            {t.value} {t.unit}
                            {t.flag ? (
                              <span className="ml-1 text-xs text-amber-600">({t.flag})</span>
                            ) : null}
                          </td>
                          <td className="px-3 py-2 text-right text-muted-foreground text-xs">
                            {t.range}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Full report viewer — connect to document service for PDF rendering.
                </p>
              )}
              <Button
                className="w-full gap-2"
                onClick={() =>
                  toast.message("Download started — demo")
                }
              >
                <Download className="h-4 w-4" />
                Download PDF Report
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PatientPortalShell>
  );
}
