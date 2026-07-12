"use client";

import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { BillingServiceList } from "./BillingServiceList";

export function BillingServiceManagement() {
  return (
    <TableLayout
      title="Billing service catalog"
      description="Manage billable services, unit price, optional tax, and department assignment."
      showSearch={false}
    >
      <BillingServiceList />
    </TableLayout>
  );
}
