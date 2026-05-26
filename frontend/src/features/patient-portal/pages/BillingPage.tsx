"use client";

import { Download, Receipt, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { PatientPortalShell } from "../components/PatientPortalShell";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { DemoBanner } from "../components/DemoBanner";
import {
  MOCK_INVOICES,
  MOCK_INSURANCE,
  formatCurrency,
  formatDate,
} from "../data/mockPatientPortalData";

export function BillingPage() {
  const pending = MOCK_INVOICES.filter((i) => i.status === "pending" || i.status === "overdue");
  const outstanding = pending.reduce((s, i) => s + i.amount, 0);
  const paidTotal = MOCK_INVOICES.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);

  return (
    <PatientPortalShell
      title="Billing & Payments"
      description="Invoices, receipts, insurance claims, and payment history."
    >
      <DemoBanner />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Outstanding Balance"
          value={formatCurrency(outstanding)}
          subtext={`${pending.length} invoice(s) due`}
          icon={Receipt}
        />
        <StatCard
          label="Paid This Year"
          value={formatCurrency(paidTotal)}
          icon={Receipt}
          trend="up"
        />
        <StatCard
          label="Insurance"
          value={MOCK_INSURANCE.provider}
          subtext="Active coverage"
          icon={Shield}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Invoices & Receipts</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all">
              <TabsList className="mb-4">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="pending">Outstanding</TabsTrigger>
                <TabsTrigger value="paid">Paid</TabsTrigger>
              </TabsList>
              <TabsContent value="all" className="space-y-3">
                {MOCK_INVOICES.map((inv) => (
                  <InvoiceRow key={inv.id} invoice={inv} />
                ))}
              </TabsContent>
              <TabsContent value="pending" className="space-y-3">
                {MOCK_INVOICES.filter((i) => i.status === "pending" || i.status === "overdue").map(
                  (inv) => (
                    <InvoiceRow key={inv.id} invoice={inv} showPay />
                  )
                )}
              </TabsContent>
              <TabsContent value="paid" className="space-y-3">
                {MOCK_INVOICES.filter((i) => i.status === "paid").map((inv) => (
                  <InvoiceRow key={inv.id} invoice={inv} />
                ))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-section-accent-subtle-10">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Insurance Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              ["Provider", MOCK_INSURANCE.provider],
              ["Policy #", MOCK_INSURANCE.policyNumber],
              ["Group #", MOCK_INSURANCE.groupNumber],
              ["Coverage", MOCK_INSURANCE.coverageType],
              ["Policy holder", MOCK_INSURANCE.policyHolder],
              ["Valid until", MOCK_INSURANCE.validUntil],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-2 border-b border-border/40 pb-2">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium text-right">{value}</span>
              </div>
            ))}
            <Button variant="outline" className="w-full mt-2" size="sm">
              View Claims History
            </Button>
          </CardContent>
        </Card>
      </div>
    </PatientPortalShell>
  );
}

function InvoiceRow({
  invoice,
  showPay,
}: {
  invoice: (typeof MOCK_INVOICES)[0];
  showPay?: boolean;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border/50 p-4">
      <div>
        <p className="font-medium text-sm">{invoice.description}</p>
        <p className="text-xs text-muted-foreground">
          {invoice.id} · {formatDate(invoice.date)} · {invoice.provider}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <p className="font-bold text-primary">{formatCurrency(invoice.amount)}</p>
        <StatusBadge status={invoice.status} />
        {showPay ? (
          <Button
            size="sm"
            onClick={() => toast.success("Payment — demo", { description: "Payment gateway integration pending." })}
          >
            Pay Now
          </Button>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className="gap-1"
            onClick={() => toast.message("Download receipt — demo")}
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
