"use strict";
"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import {
  Building2,
  Building,
  Users,
  Eye,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  Plus,
  Download,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
} from "lucide-react";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { ActiveStatusBadge } from "@/components/ui/active-status-badge";
import { matchesActiveInactiveFilter } from "@/utils/tableUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  useGetCompaniesQuery,
  useCreateCompanyMutation,
  useUpdateCompanyMutation,
  useToggleCompanyStatusMutation,
  useDeleteCompanyMutation,
} from "@/redux/api/companyApi";
import { actionFeedback } from "@/components/action-feedback";
import { LogoUploadField } from "@/components/common/LogoUploadField";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/hooks/use-auth";
import { getFileUrl } from "@/utils/fileUrl";
import type { Company } from "@/redux/types/company";
import type { FilterField, ActionButton } from "@/types/tableLayout";

export function CompanyList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("search") || "";

  const [statusFilter, setStatusFilter] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [logoPath, setLogoPath] = useState("");

  const { can } = usePermissions();
  const { roles } = useAuth();
  const isSuperAdmin = roles?.some((r) => String(r).toLowerCase() === "super admin");
  const canCreate = can("COMPANIES:CREATE") || can("COMPANIES:MANAGE") || isSuperAdmin;
  const canUpdate = can("COMPANIES:UPDATE") || can("COMPANIES:MANAGE") || isSuperAdmin;
  const canDelete = can("COMPANIES:DELETE") || can("COMPANIES:MANAGE") || isSuperAdmin;

  const { data: companies = [], isLoading, refetch } = useGetCompaniesQuery({
    search: searchQuery || undefined,
  });

  const [createCompany, { isLoading: isCreating }] = useCreateCompanyMutation();
  const [updateCompany, { isLoading: isUpdating }] = useUpdateCompanyMutation();
  const [toggleStatus] = useToggleCompanyStatusMutation();
  const [deleteCompany] = useDeleteCompanyMutation();

  const resetForm = () => {
    setName("");
    setCode("");
    setDescription("");
    setEmail("");
    setPhoneNumber("");
    setAddress("");
    setLogoPath("");
    setEditingCompany(null);
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (company: Company) => {
    setEditingCompany(company);
    setName(company.name);
    setCode(company.code);
    setDescription(company.description || "");
    setEmail(company.email || "");
    setPhoneNumber(company.phone_number || "");
    setAddress(company.address || "");
    setLogoPath(company.logo_path || "");
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      actionFeedback.error("Company name and code are required.");
      return;
    }

    try {
      if (editingCompany) {
        await updateCompany({
          id: editingCompany.company_id,
          data: {
            name: name.trim(),
            code: code.trim().toUpperCase(),
            description: description.trim() || undefined,
            email: email.trim() || undefined,
            phone_number: phoneNumber.trim() || undefined,
            address: address.trim() || undefined,
            logo_path: logoPath.trim() || undefined,
          },
        }).unwrap();
        actionFeedback.success(`Company '${name}' updated successfully.`);
      } else {
        await createCompany({
          name: name.trim(),
          code: code.trim().toUpperCase(),
          description: description.trim() || undefined,
          email: email.trim() || undefined,
          phone_number: phoneNumber.trim() || undefined,
          address: address.trim() || undefined,
          logo_path: logoPath.trim() || undefined,
        }).unwrap();
        actionFeedback.success(`Company '${name}' registered successfully.`);
      }
      setIsModalOpen(false);
      resetForm();
      refetch();
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || "Failed to save company.");
    }
  };

  const handleToggleActive = async (company: Company) => {
    try {
      await toggleStatus({
        id: company.company_id,
        is_active: !company.is_active,
      }).unwrap();
      actionFeedback.success(
        `Company '${company.name}' ${!company.is_active ? "activated" : "deactivated"} successfully.`
      );
      refetch();
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || "Failed to update company status.");
    }
  };

  const handleDelete = async (company: Company) => {
    if (
      !confirm(
        `Are you sure you want to deactivate company "${company.name}"? Historical records and users will be safely preserved.`
      )
    ) {
      return;
    }
    try {
      await deleteCompany(company.company_id).unwrap();
      actionFeedback.success(`Company '${company.name}' deactivated successfully.`);
      refetch();
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || "Failed to delete company.");
    }
  };

  const filteredData = useMemo(() => {
    return companies.filter((c) => matchesActiveInactiveFilter(statusFilter, c.is_active));
  }, [companies, statusFilter]);

  const columns = useMemo<ColumnDef<Company>[]>(() => {
    return [
      {
        accessorKey: "name",
        header: "Company",
        cell: ({ row }) => {
          const comp = row.original;
          const logoUrl = comp.logo_path ? getFileUrl(comp.logo_path) : null;
          return (
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-border bg-muted flex items-center justify-center shrink-0">
                {logoUrl ? (
                  <Image
                    src={logoUrl}
                    alt={comp.name}
                    fill
                    className="object-cover"
                    sizes="40px"
                    unoptimized
                  />
                ) : (
                  <Building2 className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0">
                <div className="font-medium text-foreground flex items-center gap-2">
                  <span>{comp.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono font-semibold">
                    {comp.code}
                  </span>
                </div>
                {comp.email && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Mail className="w-3 h-3" />
                    <span>{comp.email}</span>
                  </div>
                )}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "structures_count",
        header: "Departments",
        cell: ({ row }) => {
          const count = row.original.structures_count ?? 0;
          return (
            <div className="flex items-center gap-1.5 text-sm">
              <Building className="w-4 h-4 text-muted-foreground" />
              <span>{count}</span>
            </div>
          );
        },
      },
      {
        accessorKey: "active_users_count",
        header: "Active Users",
        cell: ({ row }) => {
          const count = row.original.active_users_count ?? 0;
          return (
            <div className="flex items-center gap-1.5 text-sm">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span>{count}</span>
            </div>
          );
        },
      },
      {
        accessorKey: "is_active",
        header: "Status",
        cell: ({ row }) => <ActiveStatusBadge isActive={row.original.is_active} />,
      },
      {
        accessorKey: "created_at",
        header: "Registered",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {new Date(row.original.created_at).toLocaleDateString()}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const comp = row.original;
          return (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/admin/companies/${comp.company_id}`)}
                className="h-8 px-2 text-primary hover:text-primary hover:bg-primary/10"
                title="View Company Details"
              >
                <Eye className="w-4 h-4 mr-1" />
                <span className="text-xs">Manage</span>
              </Button>

              {canUpdate && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEditModal(comp)}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                  title="Edit Company Info"
                >
                  <Edit className="w-4 h-4" />
                </Button>
              )}

              {canUpdate && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleActive(comp)}
                  className={`h-8 w-8 p-0 ${
                    comp.is_active
                      ? "text-destructive hover:text-destructive hover:bg-destructive/10"
                      : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                  }`}
                  title={comp.is_active ? "Deactivate Company" : "Activate Company"}
                >
                  {comp.is_active ? (
                    <XCircle className="w-4 h-4" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                </Button>
              )}

              {canDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(comp)}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                  title="Delete/Deactivate Company"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          );
        },
      },
    ];
  }, [canUpdate, canDelete, router]);

  const filterFields = useMemo<FilterField[]>(() => {
    return [
      {
        key: "status",
        label: "Status",
        type: "select",
        options: [
          { label: "Active", value: "active" },
          { label: "Inactive", value: "inactive" },
        ],
        value: statusFilter,
        onChange: (val) => setStatusFilter(String(val || "")),
      },
    ];
  }, [statusFilter]);

  const actionButtons = useMemo<ActionButton[]>(() => {
    const btns: ActionButton[] = [];
    if (canCreate) {
      btns.push({
        label: "Register Company",
        icon: <Plus className="h-4 w-4" />,
        variant: "default",
        onClick: openCreateModal,
      });
    }
    return btns;
  }, [canCreate]);

  return (
    <div className="space-y-6">
      <TableLayout
        title="Companies Management"
        description="Federal administration of mining and exploration companies, independent organizational departments, accounts, and branding."
        filters={filterFields}
        actions={actionButtons}
      >
        <DataTable
          columns={columns}
          data={filteredData}
          isLoading={isLoading}
        />
      </TableLayout>

      {/* Create / Edit Company Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>
                {editingCompany ? "Edit Company Details" : "Register New Company"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-2">
                  <label className="text-sm font-medium">Company Name *</label>
                  <Input
                    required
                    placeholder="e.g. Adola Gold Mining Share Company"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Unique Code *</label>
                  <Input
                    required
                    placeholder="e.g. AGMSC"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Corporate Email</label>
                  <Input
                    type="email"
                    placeholder="info@adola-gold.et"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone Number</label>
                  <Input
                    placeholder="+251-11-..."
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Headquarters Address</label>
                <Input
                  placeholder="e.g. Bole Sub-city, Woreda 03, Addis Ababa"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description & Scope</label>
                <Textarea
                  placeholder="Operational scope, mineral licenses, or company background notes..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Company Logo</label>
                <LogoUploadField
                  value={logoPath}
                  onChange={(val) => setLogoPath(val || "")}
                  label="Upload Company Emblem / Logo"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating || isUpdating}>
                {isCreating || isUpdating
                  ? "Saving..."
                  : editingCompany
                  ? "Update Company"
                  : "Register Company"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
