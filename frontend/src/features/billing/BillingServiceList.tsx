"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { Plus, Pencil, Power, PowerOff } from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FilterField, ActionButton } from "@/types/tableLayout";
import {
  useActivateBillingServiceMutation,
  useCreateBillingServiceMutation,
  useDeactivateBillingServiceMutation,
  useListBillingServicesQuery,
  useUpdateBillingServiceMutation,
} from "@/redux/api/billingServiceApi";
import { useGetDepartmentsQuery } from "@/redux/api/departmentApi";
import type { BillingService } from "@/redux/types/billing";
import { formatBillingCurrency, BILLING_PERMISSIONS } from "./billingUtils";
import { usePermissions } from "@/hooks/usePermissions";
import { formatStatus } from "@/utils/statusFormatter";

const EMPTY_FORM = {
  name: "",
  code: "",
  department_id: "",
  unit_price: "",
  tax_percent: "0",
  currency: "ETB",
  status: "active",
};

export function BillingServiceList() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("search") || "";

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BillingService | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data, isLoading, refetch } = useListBillingServicesQuery({
    page: pageIndex + 1,
    limit: pageSize,
    search: searchQuery.trim() || undefined,
    status: statusFilter || undefined,
  });
  const { data: departments = [] } = useGetDepartmentsQuery({ page: 1, limit: 100 });

  const [createService] = useCreateBillingServiceMutation();
  const [updateService] = useUpdateBillingServiceMutation();
  const [activateService] = useActivateBillingServiceMutation();
  const [deactivateService] = useDeactivateBillingServiceMutation();

  const { can } = usePermissions();
  const canCreate = can(BILLING_PERMISSIONS.SERVICE_CREATE);
  const canUpdate = can(BILLING_PERMISSIONS.SERVICE_UPDATE);
  const canActivate = can(BILLING_PERMISSIONS.SERVICE_ACTIVATE);
  const canDeactivate = can(BILLING_PERMISSIONS.SERVICE_DEACTIVATE);

  useEffect(() => {
    setPageIndex(0);
  }, [searchQuery, statusFilter]);

  const openCreate = () => {
    if (!canCreate) return;
    setEditing(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  };

  const openEdit = useCallback(
    (service: BillingService) => {
      if (!canUpdate) return;
      setEditing(service);
      setForm({
        name: service.name,
        code: service.code || "",
        department_id: service.department_id || "",
        unit_price: String(service.unit_price),
        tax_percent: String(service.tax_percent ?? 0),
        currency: service.currency,
        status: service.status,
      });
      setOpen(true);
    },
    [canUpdate]
  );

  const columns: ColumnDef<BillingService>[] = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Service",
        cell: ({ row }) => (
          <span className="font-medium text-primary">{row.original.name}</span>
        ),
      },
      {
        accessorKey: "code",
        header: "Code",
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.original.code || "—"}</span>
        ),
      },
      {
        accessorKey: "department_name",
        header: "Department",
        cell: ({ row }) => row.original.department_name || "—",
      },
      {
        accessorKey: "unit_price",
        header: "Unit price",
        cell: ({ row }) => formatBillingCurrency(row.original.unit_price),
      },
      {
        accessorKey: "tax_percent",
        header: "Tax %",
        cell: ({ row }) => `${row.original.tax_percent}%`,
      },
      {
        accessorKey: "total_amount",
        header: "Total",
        cell: ({ row }) => formatBillingCurrency(row.original.total_amount),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const isActive = row.original.status === "active";
          return (
            <Badge variant={isActive ? "default" : "secondary"}>
              {formatStatus(isActive ? "Active" : "Inactive")}
            </Badge>
          );
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              disabled={!canUpdate}
              title={
                canUpdate
                  ? "Edit service"
                  : "You do not have permission to edit services"
              }
              onClick={() => openEdit(row.original)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            {row.original.status === "active" ? (
              <Button
                variant="ghost"
                size="icon"
                disabled={!canDeactivate}
                title={
                  canDeactivate
                    ? "Deactivate service"
                    : "You do not have permission to deactivate services"
                }
                onClick={async () => {
                  if (!canDeactivate) return;
                  try {
                    await deactivateService(row.original.service_id).unwrap();
                    toast.success("Service deactivated");
                    refetch();
                  } catch {
                    toast.error("Failed to deactivate");
                  }
                }}
              >
                <PowerOff className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                disabled={!canActivate}
                title={
                  canActivate
                    ? "Activate service"
                    : "You do not have permission to activate services"
                }
                onClick={async () => {
                  if (!canActivate) return;
                  try {
                    await activateService(row.original.service_id).unwrap();
                    toast.success("Service activated");
                    refetch();
                  } catch {
                    toast.error("Failed to activate");
                  }
                }}
              >
                <Power className="h-4 w-4" />
              </Button>
            )}
          </div>
        ),
      },
    ],
    [
      activateService,
      canActivate,
      canDeactivate,
      canUpdate,
      deactivateService,
      openEdit,
      refetch,
    ]
  );

  const filters: FilterField[] = [
    {
      key: "status",
      label: "Status",
      type: "multiselect",
      placeholder: "Select status",
      value: statusFilter,
      onChange: setStatusFilter,
      options: [
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
      ],
    },
  ];

  const actions: ActionButton[] = [
    {
      label: "New service",
      icon: <Plus className="h-4 w-4" />,
      variant: "default",
      permissions: [BILLING_PERMISSIONS.SERVICE_CREATE],
      onClick: openCreate,
    },
  ];

  const handlePagination = (index: number, size: number) => {
    setPageIndex(index);
    setPageSize(size);
  };

  const handleSubmit = async () => {
    if (editing && !canUpdate) {
      toast.error("You do not have permission to update services");
      return;
    }
    if (!editing && !canCreate) {
      toast.error("You do not have permission to create services");
      return;
    }

    const taxPercent =
      form.tax_percent.trim() === "" ? 0 : Number(form.tax_percent);
    const body = {
      name: form.name,
      code: form.code || null,
      department_id: form.department_id || null,
      unit_price: Number(form.unit_price),
      tax_percent: taxPercent,
      currency: form.currency,
      status: form.status,
    };

    try {
      if (editing) {
        await updateService({ id: editing.service_id, body }).unwrap();
        toast.success("Service updated");
      } else {
        await createService(body).unwrap();
        toast.success("Service created");
      }
      setOpen(false);
      refetch();
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "data" in err
          ? String((err as { data?: { message?: string } }).data?.message)
          : "Save failed";
      toast.error(message);
    }
  };

  return (
    <>
      <TableLayout
        title="Billing service catalog"
        description="Manage billable services, unit price, optional tax, and department assignment."
        actions={actions}
        filters={filters}
        filterColumnsPerRow={1}
      >
        <DataTable
          columns={columns}
          data={data?.results ?? []}
          isLoading={isLoading}
          totalPageCount={data?.totalPages ?? 1}
          handlePagination={handlePagination}
          tablePageSize={pageSize}
          currentIndex={pageIndex}
        />
      </TableLayout>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit service" : "New billing service"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Service name</Label>
              <Input
                className="mt-1"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <Label>Code</Label>
              <Input
                className="mt-1"
                value={form.code}
                disabled={Boolean(editing)}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              />
            </div>
            <div>
              <Label>Unit price</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                className="mt-1"
                value={form.unit_price}
                onChange={(e) =>
                  setForm((f) => ({ ...f, unit_price: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Tax % (0 = no tax)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step="0.01"
                className="mt-1"
                value={form.tax_percent}
                onChange={(e) =>
                  setForm((f) => ({ ...f, tax_percent: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Currency</Label>
              <Input
                className="mt-1"
                value={form.currency}
                onChange={(e) =>
                  setForm((f) => ({ ...f, currency: e.target.value }))
                }
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Department</Label>
              <Select
                value={form.department_id || "none"}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, department_id: v === "none" ? "" : v }))
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.department_id} value={d.department_id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Button
                onClick={handleSubmit}
                disabled={editing ? !canUpdate : !canCreate}
              >
                {editing ? "Save changes" : "Create service"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
