"use strict";
"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Globe,
  Plus,
  Search,
  Building2,
  Users,
  MoreVertical,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActiveStatusBadge } from "@/components/ui/active-status-badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useGetRegionsQuery,
  useCreateRegionMutation,
  useUpdateRegionMutation,
  useToggleRegionStatusMutation,
  useDeleteRegionMutation,
} from "@/redux/api/regionApi";
import { actionFeedback } from "@/components/action-feedback";
import type { Region } from "@/redux/types/region";

export function RegionList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRegion, setEditingRegion] = useState<Region | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [logoPath, setLogoPath] = useState("");

  const { data: regions = [], isLoading, refetch } = useGetRegionsQuery({
    search: searchTerm || undefined,
  });

  const [createRegion, { isLoading: isCreating }] = useCreateRegionMutation();
  const [updateRegion, { isLoading: isUpdating }] = useUpdateRegionMutation();
  const [toggleStatus] = useToggleRegionStatusMutation();
  const [deleteRegion] = useDeleteRegionMutation();

  const filteredRegions = regions.filter((r) => {
    if (statusFilter === "active") return r.is_active;
    if (statusFilter === "inactive") return !r.is_active;
    return true;
  });

  const totalActive = regions.filter((r) => r.is_active).length;
  const totalDepartments = regions.reduce(
    (sum, r) => sum + (r.structures_count || 0),
    0
  );
  const totalUsers = regions.reduce(
    (sum, r) => sum + (r.active_users_count || 0),
    0
  );

  const resetForm = () => {
    setName("");
    setCode("");
    setDescription("");
    setLogoPath("");
    setEditingRegion(null);
  };

  const openCreateModal = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const openEditModal = (region: Region) => {
    setEditingRegion(region);
    setName(region.name);
    setCode(region.code);
    setDescription(region.description || "");
    setLogoPath(region.logo_path || "");
    setIsCreateOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      actionFeedback.error("Region name and code are required.");
      return;
    }

    try {
      if (editingRegion) {
        await updateRegion({
          id: editingRegion.region_id,
          data: {
            name: name.trim(),
            code: code.trim().toUpperCase(),
            description: description.trim() || undefined,
            logo_path: logoPath.trim() || undefined,
          },
        }).unwrap();
        actionFeedback.success(`Region '${name}' updated successfully.`);
      } else {
        await createRegion({
          name: name.trim(),
          code: code.trim().toUpperCase(),
          description: description.trim() || undefined,
          logo_path: logoPath.trim() || undefined,
        }).unwrap();
        actionFeedback.success(`Region '${name}' registered successfully.`);
      }
      setIsCreateOpen(false);
      resetForm();
      refetch();
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || err?.message || "Failed to save region.");
    }
  };

  const handleToggleActive = async (region: Region) => {
    try {
      await toggleStatus({
        id: region.region_id,
        is_active: !region.is_active,
      }).unwrap();
      actionFeedback.success(
        `Region '${region.name}' ${region.is_active ? "deactivated" : "activated"}.`
      );
      refetch();
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || "Failed to update region status.");
    }
  };

  const handleDelete = async (region: Region) => {
    if (
      !confirm(
        `Are you sure you want to delete region '${region.name}'? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      await deleteRegion(region.region_id).unwrap();
      actionFeedback.success(`Region '${region.name}' deleted successfully.`);
      refetch();
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || "Failed to delete region.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Stats */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Globe className="h-6 w-6 text-primary" />
            Regional Administration
          </h1>
          <p className="text-sm text-muted-foreground">
            Register and manage autonomous regional authorities, organizational departments, and branding.
          </p>
        </div>
        <Button onClick={openCreateModal} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Register Region
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Registered Regions
            </CardTitle>
            <Globe className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{regions.length}</div>
            <p className="text-xs text-muted-foreground">
              {totalActive} active regions configured
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Regional Departments
            </CardTitle>
            <Building2 className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDepartments}</div>
            <p className="text-xs text-muted-foreground">
              Isolated regional organizational units
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Regional Accounts
            </CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              Active regional domain accounts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-card p-4 rounded-lg border border-border/60 shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search regions by name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Regions Grid / Table */}
      {isLoading ? (
        <div className="flex items-center justify-center p-12 text-muted-foreground">
          Loading regional directory...
        </div>
      ) : filteredRegions.length === 0 ? (
        <Card className="border border-dashed p-12 text-center">
          <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
          <h3 className="text-lg font-semibold text-foreground">No Regions Found</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {searchTerm
              ? "No regions match your search criteria."
              : "No regions have been registered yet."}
          </p>
          <Button onClick={openCreateModal} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-1" /> Register First Region
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredRegions.map((region) => (
            <Card
              key={region.region_id}
              className={`border transition-all hover:shadow-md ${
                region.is_active ? "border-border/80" : "border-destructive/30 bg-muted/20"
              }`}
            >
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-primary/10 text-primary">
                      {region.code}
                    </span>
                    <ActiveStatusBadge isActive={region.is_active} />
                  </div>
                  <CardTitle className="text-lg font-bold text-foreground">
                    {region.name}
                  </CardTitle>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/admin/regions/${region.region_id}`}>
                        <ExternalLink className="h-4 w-4 mr-2" /> View Details & Setup
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openEditModal(region)}>
                      <Edit className="h-4 w-4 mr-2" /> Edit Region
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleToggleActive(region)}>
                      {region.is_active ? (
                        <>
                          <XCircle className="h-4 w-4 mr-2 text-amber-600" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-600" />
                          Activate
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDelete(region)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Delete Region
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>

              <CardContent className="space-y-4 pt-2">
                <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                  {region.description || "No description provided for this region."}
                </p>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-primary" />
                    <span>{region.structures_count || 0} Departments</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-blue-600" />
                    <span>{region.active_users_count || 0} Active Users</span>
                  </div>
                </div>

                <div className="pt-2">
                  <Button asChild variant="outline" size="sm" className="w-full">
                    <Link href={`/admin/regions/${region.region_id}`}>
                      Manage Region & Departments →
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Registration & Edit Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingRegion ? `Edit Region: ${editingRegion.name}` : "Register New Region"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Region Name <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. Oromia Mining Bureau"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Region Code <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. OR, AM, SN"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="uppercase font-mono"
                required
              />
              <p className="text-[11px] text-muted-foreground">
                Unique, stable code used for identifying regional scope and domain isolation.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Description</label>
              <Input
                placeholder="Brief administrative description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Logo URL / Path</label>
              <Input
                placeholder="e.g. /logos/oromia-logo.png"
                value={logoPath}
                onChange={(e) => setLogoPath(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating || isUpdating}>
                {isCreating || isUpdating
                  ? "Saving..."
                  : editingRegion
                  ? "Update Region"
                  : "Register Region"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
