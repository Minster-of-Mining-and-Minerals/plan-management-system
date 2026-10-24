"use client";

import { useState } from "react";
import {
  HardHat,
  Search,
  PlusCircle,
  RefreshCw,
  Edit,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";
import {
  useGetAsmMinersQuery,
  useLazySearchAsmCandidatesQuery,
  useRegisterAsmMinerMutation,
  useUpdateAsmMinerMutation,
  useToggleAsmMinerStatusMutation,
} from "@/redux/api/goldApi";
import Loading01 from "@/features/template/component/Loading/Loading01";
import type { AsmMiner } from "@/redux/types/gold";

interface AsmRegistryViewProps {
  isFederalOversight?: boolean;
}

export function AsmRegistryView({
  isFederalOversight = false,
}: AsmRegistryViewProps) {
  const { can } = usePermissions();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 15;

  // New ASM Registration Modal
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [license, setLicense] = useState("");
  const [phone, setPhone] = useState("");
  const [region, setRegion] = useState("Oromia");
  const [zone, setZone] = useState("");
  const [kebele, setKebele] = useState("");
  const [notes, setNotes] = useState("");

  // Edit Modal
  const [editingMiner, setEditingMiner] = useState<AsmMiner | null>(null);

  // Queries & Mutations
  const { data, isLoading, isFetching, refetch } = useGetAsmMinersQuery({
    search: search.trim() || undefined,
    page,
    limit,
  });

  const [searchCandidates, { data: candidateMatches }] = useLazySearchAsmCandidatesQuery();
  const [registerAsm, { isLoading: isRegistering }] = useRegisterAsmMinerMutation();
  const [updateAsm, { isLoading: isUpdating }] = useUpdateAsmMinerMutation();
  const [toggleStatus] = useToggleAsmMinerStatusMutation();

  const miners = data?.items || [];
  const pagination = data?.pagination;

  // Check candidates before registration on blur
  const handlePreCheck = () => {
    if (nationalId.trim() || phone.trim() || fullName.trim().length >= 3) {
      searchCandidates({
        national_id_number: nationalId.trim() || undefined,
        phone_number: phone.trim() || undefined,
        full_name: fullName.trim() || undefined,
      });
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("Miner full name is required.");
      return;
    }

    try {
      const res = await registerAsm({
        full_name: fullName.trim(),
        national_id_number: nationalId.trim() || undefined,
        mining_license_number: license.trim() || undefined,
        phone_number: phone.trim() || undefined,
        region: region.trim() || undefined,
        zone_or_woreda: zone.trim() || undefined,
        kebele: kebele.trim() || undefined,
        notes: notes.trim() || undefined,
      }).unwrap();

      toast.success(`ASM Miner '${res.full_name}' registered successfully!`);
      setIsRegisterOpen(false);
      refetch();

      // Reset
      setFullName("");
      setNationalId("");
      setLicense("");
      setPhone("");
      setZone("");
      setKebele("");
      setNotes("");
    } catch (err: unknown) {
      const errorObj = err as { data?: { message?: string }; message?: string };
      toast.error(errorObj?.data?.message || errorObj?.message || "Failed to register ASM miner.");
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMiner) return;

    try {
      await updateAsm({
        id: editingMiner.asm_id,
        data: {
          full_name: editingMiner.full_name,
          national_id_number: editingMiner.national_id_number || undefined,
          mining_license_number: editingMiner.mining_license_number || undefined,
          phone_number: editingMiner.phone_number || undefined,
          region: editingMiner.region || undefined,
          zone_or_woreda: editingMiner.zone_or_woreda || undefined,
          kebele: editingMiner.kebele || undefined,
          notes: editingMiner.notes || undefined,
        },
      }).unwrap();

      toast.success("ASM Miner details updated successfully.");
      setEditingMiner(null);
      refetch();
    } catch (err: unknown) {
      const errorObj = err as { data?: { message?: string }; message?: string };
      toast.error(errorObj?.data?.message || errorObj?.message || "Failed to update ASM miner.");
    }
  };

  const handleToggleStatus = async (miner: AsmMiner) => {
    try {
      await toggleStatus({
        id: miner.asm_id,
        is_active: !miner.is_active,
      }).unwrap();

      toast.success(`ASM Miner '${miner.full_name}' ${!miner.is_active ? "activated" : "deactivated"}.`);
      refetch();
    } catch (err: unknown) {
      const errorObj = err as { data?: { message?: string }; message?: string };
      toast.error(errorObj?.data?.message || errorObj?.message || "Failed to update miner status.");
    }
  };

  return (
    <div className="space-y-6">
      {/* ----------------- TOP HEADER ----------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <HardHat className="h-7 w-7 text-amber-500" />
            Artisanal & Small-Scale Miners (ASM) Registry
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isFederalOversight
              ? "Centralized oversight of artisanal and small-scale gold miners across all registered centers."
              : "Shared national registry of registered artisanal gold miners, supporting search before registration and cross-center seller identification."}
          </p>
        </div>

        {can("ASM:CREATE") && (
          <Button onClick={() => setIsRegisterOpen(true)} className="gap-2 font-semibold shadow-sm shrink-0">
            <PlusCircle className="h-4 w-4" /> Register New Miner
          </Button>
        )}
      </div>

      {/* ----------------- SEARCH & CONTROLS BAR ----------------- */}
      <div className="p-4 rounded-2xl bg-card border border-border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, national ID, license, or phone..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9 h-9 text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          {search && (
            <Button variant="ghost" size="sm" onClick={() => setSearch("")} className="h-8 text-xs">
              Clear
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-8 text-xs gap-1.5"
          >
            <RefreshCw className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ----------------- MINERS TABLE ----------------- */}
      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12">
            <Loading01 />
          </div>
        ) : miners.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-xs text-muted-foreground uppercase bg-muted/40">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Miner Name</th>
                  <th className="py-3.5 px-4 font-semibold">National ID</th>
                  <th className="py-3.5 px-4 font-semibold">Mining License</th>
                  <th className="py-3.5 px-4 font-semibold">Phone Number</th>
                  <th className="py-3.5 px-4 font-semibold">Location</th>
                  <th className="py-3.5 px-4 font-semibold">Registered Origin</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {miners.map((m) => (
                  <tr key={m.asm_id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-foreground flex items-center gap-2">
                        <HardHat className="h-4 w-4 text-amber-500 shrink-0" />
                        {m.full_name}
                      </div>
                      {m.notes && <p className="text-xs text-muted-foreground line-clamp-1">{m.notes}</p>}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs">
                      {m.national_id_number ? (
                        <Badge variant="outline" className="text-[11px] font-mono">
                          {m.national_id_number}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs">
                      {m.mining_license_number ? (
                        <Badge variant="outline" className="text-[11px] font-mono border-amber-500/30 text-amber-700 dark:text-amber-300">
                          {m.mining_license_number}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-muted-foreground">
                      {m.phone_number || "—"}
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      {m.region ? (
                        <span className="text-foreground">
                          {m.region}
                          {m.zone_or_woreda ? ` / ${m.zone_or_woreda}` : ""}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-muted-foreground">
                      {m.registeredCenter?.name || "Federal Registry"}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant={m.is_active ? "default" : "secondary"}
                        className={
                          m.is_active
                            ? "bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[11px]"
                            : "text-[11px]"
                        }
                      >
                        {m.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {can("ASM:UPDATE") && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingMiner(m)}
                            className="h-8 px-2 text-xs"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {can("ASM:DEACTIVATE") && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleStatus(m)}
                            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                          >
                            {m.is_active ? "Deactivate" : "Activate"}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center space-y-3">
            <HardHat className="h-12 w-12 mx-auto text-muted-foreground/30" />
            <h3 className="text-base font-semibold text-foreground">No ASM miners found</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              No registered artisanal and small-scale miners match your search criteria.
            </p>
          </div>
        )}

        {/* Pagination Bar */}
        {pagination && pagination.total_pages > 1 && (
          <div className="p-4 border-t border-border flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Page {pagination.page} of {pagination.total_pages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pagination.page <= 1}
                className="h-8 gap-1 text-xs"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(pagination.total_pages, p + 1))}
                disabled={pagination.page >= pagination.total_pages}
                className="h-8 gap-1 text-xs"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ----------------- REGISTER MODAL ----------------- */}
      <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
        <DialogContent className="max-w-lg">
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <HardHat className="h-5 w-5 text-amber-500" />
                Register Artisanal & Small-Scale Miner
              </DialogTitle>
              <DialogDescription>
                Searches for duplicate candidates in real-time before registering into the shared national registry.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {candidateMatches && candidateMatches.exact_matches.length > 0 && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4" /> Existing Miner Match Found!
                  </p>
                  <p>
                    A miner with this identifier is already registered:{" "}
                    <strong>{candidateMatches.exact_matches[0].full_name}</strong>
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Full Legal Name *</Label>
                <Input
                  required
                  placeholder="e.g. Gemechu Desta"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  onBlur={handlePreCheck}
                  className="h-9 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">National ID / Kebele ID</Label>
                  <Input
                    placeholder="e.g. ETH-12345"
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    onBlur={handlePreCheck}
                    className="h-9 text-sm font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Mining License No.</Label>
                  <Input
                    placeholder="e.g. ML-7890"
                    value={license}
                    onChange={(e) => setLicense(e.target.value)}
                    className="h-9 text-sm font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Phone Number</Label>
                  <Input
                    placeholder="+251 9..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onBlur={handlePreCheck}
                    className="h-9 text-sm font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Region</Label>
                  <Input
                    placeholder="e.g. Oromia, Benishangul"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Zone / Woreda</Label>
                  <Input
                    placeholder="e.g. Guji / Shakiso"
                    value={zone}
                    onChange={(e) => setZone(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Kebele</Label>
                  <Input
                    placeholder="e.g. Reji"
                    value={kebele}
                    onChange={(e) => setKebele(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Notes</Label>
                <Input
                  placeholder="Optional notes or references..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setIsRegisterOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isRegistering}>
                {isRegistering ? "Saving..." : "Register Miner"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ----------------- EDIT MODAL ----------------- */}
      <Dialog open={Boolean(editingMiner)} onOpenChange={(open) => !open && setEditingMiner(null)}>
        <DialogContent className="max-w-lg">
          {editingMiner && (
            <form onSubmit={handleUpdate}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Edit className="h-5 w-5 text-primary" />
                  Edit ASM Miner Details
                </DialogTitle>
                <DialogDescription>
                  Update authorized contact and location records for {editingMiner.full_name}.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Full Legal Name *</Label>
                  <Input
                    required
                    value={editingMiner.full_name}
                    onChange={(e) =>
                      setEditingMiner({ ...editingMiner, full_name: e.target.value })
                    }
                    className="h-9 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">National ID</Label>
                    <Input
                      value={editingMiner.national_id_number || ""}
                      onChange={(e) =>
                        setEditingMiner({
                          ...editingMiner,
                          national_id_number: e.target.value,
                        })
                      }
                      className="h-9 text-sm font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Mining License No.</Label>
                    <Input
                      value={editingMiner.mining_license_number || ""}
                      onChange={(e) =>
                        setEditingMiner({
                          ...editingMiner,
                          mining_license_number: e.target.value,
                        })
                      }
                      className="h-9 text-sm font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Phone Number</Label>
                    <Input
                      value={editingMiner.phone_number || ""}
                      onChange={(e) =>
                        setEditingMiner({ ...editingMiner, phone_number: e.target.value })
                      }
                      className="h-9 text-sm font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Region</Label>
                    <Input
                      value={editingMiner.region || ""}
                      onChange={(e) =>
                        setEditingMiner({ ...editingMiner, region: e.target.value })
                      }
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Zone / Woreda</Label>
                    <Input
                      value={editingMiner.zone_or_woreda || ""}
                      onChange={(e) =>
                        setEditingMiner({
                          ...editingMiner,
                          zone_or_woreda: e.target.value,
                        })
                      }
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Kebele</Label>
                    <Input
                      value={editingMiner.kebele || ""}
                      onChange={(e) =>
                        setEditingMiner({ ...editingMiner, kebele: e.target.value })
                      }
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Notes</Label>
                  <Input
                    value={editingMiner.notes || ""}
                    onChange={(e) =>
                      setEditingMiner({ ...editingMiner, notes: e.target.value })
                    }
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setEditingMiner(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating ? "Saving..." : "Update Miner"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
