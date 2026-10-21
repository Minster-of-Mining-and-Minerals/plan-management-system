"use strict";
"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Users,
  Palette,
  Plus,
  Trash2,
  Edit,
  Save,
  Globe,
  CheckCircle2,
  XCircle,
  KeyRound,
  Shield,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ActiveStatusBadge } from "@/components/ui/active-status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  useGetRegionByIdQuery,
  useGetRegionalStructuresQuery,
  useCreateRegionalStructureMutation,
  useUpdateRegionalStructureMutation,
  useDeleteRegionalStructureMutation,
  useGetRegionalBrandingQuery,
  useUpdateRegionalBrandingMutation,
} from "@/redux/api/regionApi";
import {
  useGetUsersQuery,
  useCreateUserMutation,
  useToggleUserStatusMutation,
  useResetUserPasswordMutation,
} from "@/redux/api/userApi";
import { useGetRolesQuery } from "@/redux/api/roleApi";
import { actionFeedback } from "@/components/action-feedback";
import type { RegionalStructure } from "@/redux/types/region";

export function RegionDetail({ regionId }: { regionId: string }) {
  const { data: region, isLoading: isRegionLoading, refetch: refetchRegion } = useGetRegionByIdQuery(regionId);
  const { data: structures = [], isLoading: isStructuresLoading, refetch: refetchStructures } =
    useGetRegionalStructuresQuery({ region_id: regionId });
  const { data: brandingData, isLoading: isBrandingLoading, refetch: refetchBranding } =
    useGetRegionalBrandingQuery(regionId);
  const { data: users = [], isLoading: isUsersLoading, refetch: refetchUsers } = useGetUsersQuery({
    region_id: regionId,
  });
  const { data: roles = [] } = useGetRolesQuery();

  // Mutations
  const [createStructure, { isLoading: isCreatingStructure }] = useCreateRegionalStructureMutation();
  const [updateStructure] = useUpdateRegionalStructureMutation();
  const [deleteStructure] = useDeleteRegionalStructureMutation();
  const [updateBranding, { isLoading: isUpdatingBranding }] = useUpdateRegionalBrandingMutation();
  const [createUser, { isLoading: isCreatingUser }] = useCreateUserMutation();
  const [toggleUserStatus] = useToggleUserStatusMutation();
  const [resetPassword] = useResetUserPasswordMutation();

  // Department Modal State
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<RegionalStructure | null>(null);
  const [deptName, setDeptName] = useState("");
  const [deptParentId, setDeptParentId] = useState<string>("");

  // User Modal State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [userDeptId, setUserDeptId] = useState("");
  const [userRoleId, setUserRoleId] = useState("");

  // Branding Form State
  const [systemFullName, setSystemFullName] = useState("");
  const [systemShortName, setSystemShortName] = useState("");
  const [systemTagline, setSystemTagline] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#0C4A6E");
  const [secondaryColor, setSecondaryColor] = useState("#64748B");
  const [accentColor, setAccentColor] = useState("#CA8A04");
  const [brandingInitialized, setBrandingInitialized] = useState(false);

  // Sync branding form when loaded
  if (brandingData && !brandingInitialized) {
    setSystemFullName(brandingData.system_name_full || "");
    setSystemShortName(brandingData.system_name_short || "");
    setSystemTagline(brandingData.system_tagline || "");
    setPrimaryColor(brandingData.primary_color || "#0C4A6E");
    setSecondaryColor(brandingData.secondary_color || "#64748B");
    setAccentColor(brandingData.accent_color || "#CA8A04");
    setBrandingInitialized(true);
  }

  // Department handlers
  const handleOpenDeptModal = (dept?: RegionalStructure) => {
    if (dept) {
      setEditingDept(dept);
      setDeptName(dept.name);
      setDeptParentId(dept.parent_id || "");
    } else {
      setEditingDept(null);
      setDeptName("");
      setDeptParentId("");
    }
    setIsDeptModalOpen(true);
  };

  const handleSaveDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName.trim()) {
      actionFeedback.error("Department name is required.");
      return;
    }

    try {
      if (editingDept) {
        await updateStructure({
          id: editingDept.regional_structure_id,
          region_id: regionId,
          data: {
            name: deptName.trim(),
            parent_id: deptParentId || null,
          },
        }).unwrap();
        actionFeedback.success(`Department '${deptName}' updated.`);
      } else {
        await createStructure({
          region_id: regionId,
          name: deptName.trim(),
          parent_id: deptParentId || null,
        }).unwrap();
        actionFeedback.success(`Department '${deptName}' created.`);
      }
      setIsDeptModalOpen(false);
      refetchStructures();
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || err?.message || "Failed to save department.");
    }
  };

  const handleDeleteDepartment = async (dept: RegionalStructure) => {
    if (!confirm(`Delete regional department '${dept.name}'?`)) return;
    try {
      await deleteStructure({
        id: dept.regional_structure_id,
        region_id: regionId,
      }).unwrap();
      actionFeedback.success(`Department '${dept.name}' deleted.`);
      refetchStructures();
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || "Failed to delete department.");
    }
  };

  // User handlers
  const handleCreateRegionalUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !userEmail.trim()) {
      actionFeedback.error("Name and email are required.");
      return;
    }

    try {
      await createUser({
        full_name: userName.trim(),
        email: userEmail.trim(),
        phone_number: userPhone.trim() || undefined,
        region_id: regionId,
        regional_structure_id: userDeptId || undefined,
        role_ids: userRoleId ? [userRoleId] : undefined,
      } as any).unwrap();

      actionFeedback.success(`Regional account created for ${userName}.`);
      setIsUserModalOpen(false);
      setUserName("");
      setUserEmail("");
      setUserPhone("");
      setUserDeptId("");
      setUserRoleId("");
      refetchUsers();
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || err?.message || "Failed to create regional account.");
    }
  };

  const handleToggleUser = async (user: any) => {
    try {
      await toggleUserStatus({
        id: user.user_id,
        data: { is_active: !user.is_active },
      }).unwrap();
      actionFeedback.success(`User '${user.full_name}' status updated.`);
      refetchUsers();
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || "Failed to update user status.");
    }
  };

  const handleResetUserPassword = async (user: any) => {
    if (!confirm(`Reset password for ${user.full_name}?`)) return;
    try {
      await resetPassword(user.user_id).unwrap();
      actionFeedback.success(`Password reset link/temporary password sent to ${user.email}.`);
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || "Failed to reset password.");
    }
  };

  // Branding handler
  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateBranding({
        region_id: regionId,
        data: {
          system_name_full: systemFullName.trim(),
          system_name_short: systemShortName.trim(),
          system_tagline: systemTagline.trim() || null,
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          accent_color: accentColor,
        },
      }).unwrap();
      actionFeedback.success("Regional branding updated successfully.");
      refetchBranding();
      refetchRegion();
    } catch (err: any) {
      actionFeedback.error(err?.data?.message || "Failed to update regional branding.");
    }
  };

  if (isRegionLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading regional details...</div>;
  }

  if (!region) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-destructive">Region Not Found</h2>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/admin/regions">Back to Regions</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button and Region Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/admin/regions"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Regional Directory
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Globe className="h-6 w-6 text-primary" />
              {region.name}
            </h1>
            <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-primary/10 text-primary">
              {region.code}
            </span>
            <ActiveStatusBadge isActive={region.is_active} />
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {region.description || "Independent regional planning authority with isolated organizational scope."}
          </p>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="departments" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md bg-muted/60 p-1">
          <TabsTrigger value="departments" className="flex items-center gap-2 text-xs">
            <Building2 className="h-4 w-4" />
            Departments ({structures.length})
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2 text-xs">
            <Users className="h-4 w-4" />
            Users ({users.length})
          </TabsTrigger>
          <TabsTrigger value="branding" className="flex items-center gap-2 text-xs">
            <Palette className="h-4 w-4" />
            Branding & Theme
          </TabsTrigger>
        </TabsList>

        {/* ===================== TAB 1: DEPARTMENTS ===================== */}
        <TabsContent value="departments" className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Regional Departments</h2>
              <p className="text-xs text-muted-foreground">
                Organizational hierarchy confined exclusively within {region.name}.
              </p>
            </div>
            <Button onClick={() => handleOpenDeptModal()} size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Add Department
            </Button>
          </div>

          {structures.length === 0 ? (
            <Card className="border border-dashed p-8 text-center">
              <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-40" />
              <p className="text-sm text-muted-foreground mb-3">No departments created yet for this region.</p>
              <Button onClick={() => handleOpenDeptModal()} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" /> Add First Department
              </Button>
            </Card>
          ) : (
            <div className="border rounded-lg overflow-hidden bg-card shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Department Name</th>
                    <th className="px-4 py-3 text-left font-semibold">Level</th>
                    <th className="px-4 py-3 text-left font-semibold">Parent Department</th>
                    <th className="px-4 py-3 text-center font-semibold">Assigned Staff</th>
                    <th className="px-4 py-3 text-center font-semibold">Status</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {structures.map((struct) => (
                    <tr key={struct.regional_structure_id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium text-foreground flex items-center gap-2">
                        <Layers className="h-4 w-4 text-primary" />
                        {struct.name}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        Level {struct.level}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {struct.parent?.name || <span className="italic text-muted-foreground/60">Root Level</span>}
                      </td>
                      <td className="px-4 py-3 text-center font-medium">
                        {struct.users_count || 0}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <ActiveStatusBadge isActive={struct.is_active} />
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDeptModal(struct)}
                          className="h-8 w-8"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteDepartment(struct)}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ===================== TAB 2: REGIONAL USERS ===================== */}
        <TabsContent value="users" className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Regional Accounts</h2>
              <p className="text-xs text-muted-foreground">
                Staff accounts strictly isolated to {region.name}.
              </p>
            </div>
            <Button onClick={() => setIsUserModalOpen(true)} size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Create Regional Account
            </Button>
          </div>

          {users.length === 0 ? (
            <Card className="border border-dashed p-8 text-center">
              <Users className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-40" />
              <p className="text-sm text-muted-foreground mb-3">No regional accounts created for this region yet.</p>
              <Button onClick={() => setIsUserModalOpen(true)} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" /> Create First Account
              </Button>
            </Card>
          ) : (
            <div className="border rounded-lg overflow-hidden bg-card shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Full Name</th>
                    <th className="px-4 py-3 text-left font-semibold">Email</th>
                    <th className="px-4 py-3 text-left font-semibold">Department</th>
                    <th className="px-4 py-3 text-left font-semibold">Roles</th>
                    <th className="px-4 py-3 text-center font-semibold">Status</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {users.map((u: any) => (
                    <tr key={u.user_id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium text-foreground">{u.full_name}</td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{u.email}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {u.regionalStructure?.name || <span className="italic text-muted-foreground/60">Bureau Wide</span>}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {u.roles?.map((r: any) => r.name).join(", ") || "User"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <ActiveStatusBadge isActive={u.is_active} />
                      </td>
                      <td className="px-4 py-3 text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleUser(u)}
                          className="h-8 text-xs"
                        >
                          {u.is_active ? "Deactivate" : "Activate"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleResetUserPassword(u)}
                          className="h-8 text-xs"
                        >
                          Reset Pwd
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ===================== TAB 3: BRANDING & THEME ===================== */}
        <TabsContent value="branding" className="space-y-6 pt-4">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Branding Settings Form */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">System Identity & Appearance</CardTitle>
                  <CardDescription className="text-xs">
                    Configure independent system name, taglines, and theme colors for {region.name}.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSaveBranding} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold">Full System Name</label>
                        <Input
                          value={systemFullName}
                          onChange={(e) => setSystemFullName(e.target.value)}
                          placeholder="e.g. Oromia Mining Bureau PMS"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold">Short Name</label>
                        <Input
                          value={systemShortName}
                          onChange={(e) => setSystemShortName(e.target.value)}
                          placeholder="e.g. OR PMS"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold">System Tagline</label>
                      <Input
                        value={systemTagline}
                        onChange={(e) => setSystemTagline(e.target.value)}
                        placeholder="e.g. Regional Strategic Planning and Execution"
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3 pt-2">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold">Primary Color</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={primaryColor}
                            onChange={(e) => setPrimaryColor(e.target.value)}
                            className="h-9 w-12 rounded cursor-pointer border"
                          />
                          <Input
                            value={primaryColor}
                            onChange={(e) => setPrimaryColor(e.target.value)}
                            className="font-mono text-xs uppercase"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold">Secondary Color</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={secondaryColor}
                            onChange={(e) => setSecondaryColor(e.target.value)}
                            className="h-9 w-12 rounded cursor-pointer border"
                          />
                          <Input
                            value={secondaryColor}
                            onChange={(e) => setSecondaryColor(e.target.value)}
                            className="font-mono text-xs uppercase"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold">Accent Color</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={accentColor}
                            onChange={(e) => setAccentColor(e.target.value)}
                            className="h-9 w-12 rounded cursor-pointer border"
                          />
                          <Input
                            value={accentColor}
                            onChange={(e) => setAccentColor(e.target.value)}
                            className="font-mono text-xs uppercase"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                      <Button type="submit" disabled={isUpdatingBranding} className="gap-2">
                        <Save className="h-4 w-4" />
                        {isUpdatingBranding ? "Saving Settings..." : "Save Regional Branding"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Live Theme Preview */}
            <div className="space-y-4">
              <Card className="overflow-hidden border shadow-sm">
                <CardHeader className="bg-muted/40 pb-3">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Live Brand Preview
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  {/* Mock Navbar */}
                  <div
                    style={{ backgroundColor: primaryColor }}
                    className="p-3 rounded-md text-white flex items-center justify-between shadow-sm"
                  >
                    <div className="font-bold text-xs truncate">
                      {systemShortName || `${region.code} PMS`}
                    </div>
                    <span
                      style={{ backgroundColor: accentColor }}
                      className="text-[10px] px-2 py-0.5 rounded text-white font-medium"
                    >
                      Region
                    </span>
                  </div>

                  {/* Mock Card */}
                  <div className="p-3 border rounded-md space-y-2 bg-background">
                    <div className="font-semibold text-xs text-foreground">
                      {systemFullName || `${region.name} Mining Bureau`}
                    </div>
                    <div className="text-[11px] text-muted-foreground line-clamp-1">
                      {systemTagline || "Regional Strategic Planning"}
                    </div>
                    <div className="pt-2 flex gap-2">
                      <button
                        type="button"
                        style={{ backgroundColor: primaryColor }}
                        className="text-white text-xs px-3 py-1 rounded font-medium"
                      >
                        Action
                      </button>
                      <button
                        type="button"
                        style={{ borderColor: secondaryColor, color: secondaryColor }}
                        className="border text-xs px-3 py-1 rounded font-medium"
                      >
                        Secondary
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add / Edit Department Modal */}
      <Dialog open={isDeptModalOpen} onOpenChange={setIsDeptModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingDept ? "Edit Department" : "Add Regional Department"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveDepartment} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">
                Department Name <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. Mineral Licensing & Exploration Directorate"
                value={deptName}
                onChange={(e) => setDeptName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Parent Department (Optional)</label>
              <select
                value={deptParentId}
                onChange={(e) => setDeptParentId(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">No Parent (Root Department)</option>
                {structures
                  .filter((s) => s.regional_structure_id !== editingDept?.regional_structure_id)
                  .map((s) => (
                    <option key={s.regional_structure_id} value={s.regional_structure_id}>
                      {s.name} (Level {s.level})
                    </option>
                  ))}
              </select>
              <p className="text-[11px] text-muted-foreground">
                Parent departments are strictly restricted to the same region.
              </p>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDeptModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreatingStructure}>
                {editingDept ? "Update Department" : "Create Department"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Regional User Modal */}
      <Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Regional Account</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateRegionalUser} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">
                Full Name <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. Abebe Bikila"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">
                Email Address <span className="text-destructive">*</span>
              </label>
              <Input
                type="email"
                placeholder="e.g. abebe@oromia-mines.gov.et"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Phone Number</label>
              <Input
                placeholder="e.g. +251 91 123 4567"
                value={userPhone}
                onChange={(e) => setUserPhone(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Assigned Regional Department</label>
              <select
                value={userDeptId}
                onChange={(e) => setUserDeptId(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Bureau Wide (No Specific Department)</option>
                {structures.map((s) => (
                  <option key={s.regional_structure_id} value={s.regional_structure_id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Role</label>
              <select
                value={userRoleId}
                onChange={(e) => setUserRoleId(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Standard User</option>
                {roles
                  .filter((r: any) => r.scope !== "private")
                  .map((r: any) => (
                    <option key={r.role_id} value={r.role_id}>
                      {r.name}
                    </option>
                  ))}
              </select>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsUserModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreatingUser}>
                {isCreatingUser ? "Creating..." : "Create Regional Account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
