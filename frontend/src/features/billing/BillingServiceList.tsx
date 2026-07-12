"use client";

import { useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Plus, Pencil, Power, PowerOff } from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "@/features/template/component/tableList/DataTable";
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
import {
  useActivateBillingServiceMutation,
  useCreateBillingServiceMutation,
  useDeactivateBillingServiceMutation,
  useListBillingServicesQuery,
  useUpdateBillingServiceMutation,
} from "@/redux/api/billingServiceApi";
import { useGetDepartmentsQuery } from "@/redux/api/departmentApi";
import type { BillingService } from "@/redux/types/billing";
import { formatBillingCurrency } from "./billingUtils";

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
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BillingService | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data, isLoading, refetch } = useListBillingServicesQuery({
    page,
    limit: 10,
    search: search || undefined,
    status: statusFilter || undefined,
  });
  const { data: departments = [] } = useGetDepartmentsQuery({ page: 1, limit: 100 });

  const [createService] = useCreateBillingServiceMutation();
  const [updateService] = useUpdateBillingServiceMutation();
  const [activateService] = useActivateBillingServiceMutation();
  const [deactivateService] = useDeactivateBillingServiceMutation();

  const columns: ColumnDef<BillingService>[] = useMemo(
    () => [
      { accessorKey: "name", header: "Service" },
      { accessorKey: "code", header: "Code" },
      { accessorKey: "department_name", header: "Department" },
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
        cell: ({ row }) => (
          <Badge variant={row.original.status === "active" ? "default" : "secondary"}>
            {row.original.status}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setEditing(row.original);
                setForm({
                  name: row.original.name,
                  code: row.original.code || "",
                  department_id: row.original.department_id || "",
                  unit_price: String(row.original.unit_price),
                  tax_percent: String(row.original.tax_percent ?? 0),
                  currency: row.original.currency,
                  status: row.original.status,
                });
                setOpen(true);
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            {row.original.status === "active" ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={async () => {
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
                onClick={async () => {
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
    [activateService, deactivateService, refetch]
  );

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  };

  const handleSubmit = async () => {
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <Label>Search</Label>
          <Input
            className="mt-1"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            placeholder="Name or code"
          />
        </div>
        <div className="w-40">
          <Label>Status</Label>
          <Select
            value={statusFilter || "all"}
            onValueChange={(v) => {
              setPage(1);
              setStatusFilter(v === "all" ? "" : v);
            }}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-1.5 h-4 w-4" />
          New service
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <DataTable
          columns={columns}
          data={data?.results ?? []}
          isLoading={isLoading}
          totalPageCount={data?.totalPages ?? 1}
          handlePagination={(index) => setPage(index + 1)}
          tablePageSize={10}
          currentIndex={page - 1}
        />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit service" : "New billing service"}</DialogTitle>
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
                onChange={(e) => setForm((f) => ({ ...f, unit_price: e.target.value }))}
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
                onChange={(e) => setForm((f) => ({ ...f, tax_percent: e.target.value }))}
              />
            </div>
            <div>
              <Label>Currency</Label>
              <Input
                className="mt-1"
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
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
              <Button onClick={handleSubmit}>
                {editing ? "Save changes" : "Create service"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
