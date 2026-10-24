"use client";

import { useState } from "react";
import {
  HardHat,
  PlusCircle,
  Edit,
  AlertCircle,
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
import { ActiveStatusBadge } from "@/components/ui/active-status-badge";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import type { ActionButton, FilterField } from "@/types/tableLayout";
import { useSearchParams } from "next/navigation";
import { GoldOperationsTabsHeader } from "./GoldOperationsTabsHeader";
import type { AsmMiner } from "@/redux/types/gold";

interface AsmRegistryViewProps {
  isFederalOversight?: boolean;
}

export function AsmRegistryView({
  isFederalOversight = false,
}: AsmRegistryViewProps) {
  const { can } = usePermissions();
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("search") || "";

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [statusFilter, setStatusFilter] = useState("");

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
  const { data, isLoading, isError, refetch } = useGetAsmMinersQuery({
    search: searchQuery.trim() || undefined,
    page,
    limit,
  });

  const [searchCandidates, { data: candidateMatches }] = useLazySearchAsmCandidatesQuery();
  const [registerAsm, { isLoading: isRegistering }] = useRegisterAsmMinerMutation();
  const [updateAsm, { isLoading: isUpdating }] = useUpdateAsmMinerMutation();
  const [toggleStatus] = useToggleAsmMinerStatusMutation();

  const miners = data?.items || [];
  const pagination = data?.pagination;
  const topCandidate = candidateMatches?.exact_matches?.[0] || candidateMatches?.potential_matches?.[0];

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

      toast.success(`Miner "${res.full_name}" registered successfully.`);

      setIsRegisterOpen(false);
      setFullName("");
      setNationalId("");
      setLicense("");
      setPhone("");
      setZone("");
      setKebele("");
      setNotes("");
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || "Failed to register miner.");
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

      toast.success("Miner profile updated successfully.");
      setEditingMiner(null);
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || "Failed to update miner profile.");
    }
  };

  const handleToggleStatus = async (miner: AsmMiner) => {
    try {
      await toggleStatus({ id: miner.asm_id, is_active: !miner.is_active }).unwrap();
      toast.success(`Miner marked as ${miner.is_active ? "inactive" : "active"}.`);
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || "Failed to change miner status.");
    }
  };

  const columns: ColumnDef<AsmMiner>[] = [
    {
      accessorKey: "full_name",
      header: "Miner Name",
      cell: ({ row }) => {
        const m = row.original;
        return (
          <div>
            <div className="font-semibold text-foreground flex items-center gap-2 text-xs">
              <HardHat className="h-4 w-4 text-amber-500 shrink-0" />
              {m.full_name}
            </div>
            {m.notes && <p className="text-[11px] text-muted-foreground line-clamp-1">{m.notes}</p>}
          </div>
        );
      },
    },
    {
      accessorKey: "national_id_number",
      header: "National ID",
      cell: ({ row }) =>
        row.original.national_id_number ? (
          <Badge variant="outline" className="text-[11px] font-mono">
            {row.original.national_id_number}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        ),
    },
    {
      accessorKey: "mining_license_number",
      header: "Mining License",
      cell: ({ row }) =>
        row.original.mining_license_number ? (
          <Badge
            variant="outline"
            className="text-[11px] font-mono border-amber-500/30 text-amber-700 dark:text-amber-300"
          >
            {row.original.mining_license_number}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        ),
    },
    {
      accessorKey: "phone_number",
      header: "Phone Number",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.original.phone_number || "—"}
        </span>
      ),
    },
    {
      id: "location",
      header: "Location",
      cell: ({ row }) => {
        const m = row.original;
        return m.region ? (
          <span className="text-foreground text-xs">
            {m.region}
            {m.zone_or_woreda ? ` / ${m.zone_or_woreda}` : ""}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        );
      },
    },
    {
      id: "registeredCenter",
      header: "Registered Origin",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.original.registeredCenter?.name || "Federal Registry"}
        </span>
      ),
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => <ActiveStatusBadge isActive={row.original.is_active} />,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const m = row.original;
        return (
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
        );
      },
    },
  ];

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

  const actions: ActionButton[] = can("ASM:CREATE")
    ? [
        {
          label: "Register ASM Miner",
          icon: <PlusCircle className="h-4 w-4" />,
          variant: "default",
          onClick: () => setIsRegisterOpen(true),
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {isFederalOversight && <GoldOperationsTabsHeader />}

      <TableLayout
        title="Artisanal & Small-Scale Mining (ASM) Registry"
        description="Official registry of artisanal miners authorized to sell gold to National Bank and licensed purchasing centers."
        actions={actions}
        filters={filters}
        filterColumnsPerRow={1}
      >
        <DataTable
          columns={columns}
          data={miners}
          isLoading={isLoading}
          isError={isError}
          errorMessage="Failed to load ASM miners."
          onRetry={refetch}
          paginationMode="server"
          totalRowCount={pagination?.total || 0}
          pageIndex={page - 1}
          pageSize={limit}
          onPaginationChange={(newPageIndex, newPageSize) => {
            setPage(newPageIndex + 1);
            if (newPageSize !== limit) {
              setLimit(newPageSize);
            }
          }}
          resetKey={`${searchQuery}-${statusFilter}`}
        />
      </TableLayout>

      {/* ----------------- REGISTER MODAL ----------------- */}
      <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HardHat className="h-5 w-5 text-amber-500" /> Register ASM Miner
            </DialogTitle>
            <DialogDescription>
              Record identity and licensing information to authorize transactions.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="miner-name" className="text-xs font-semibold">
                Full Name *
              </Label>
              <Input
                id="miner-name"
                placeholder="e.g. Abebe Bikila"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                onBlur={handlePreCheck}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="national-id" className="text-xs font-semibold">
                  Fayda / National ID
                </Label>
                <Input
                  id="national-id"
                  placeholder="e.g. ET-12345678"
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  onBlur={handlePreCheck}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mining-license" className="text-xs font-semibold">
                  Mining License / Card
                </Label>
                <Input
                  id="mining-license"
                  placeholder="e.g. ASM-2026-091"
                  value={license}
                  onChange={(e) => setLicense(e.target.value)}
                />
              </div>
            </div>

            {topCandidate && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-200">
                  <AlertCircle className="h-4 w-4" /> Potential Existing Record Found
                </div>
                <p className="text-muted-foreground">
                  A registered miner was detected with matching national ID or phone:
                </p>
                <div className="font-semibold text-foreground">
                  {topCandidate.full_name} ({topCandidate.phone_number || "No phone"})
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-semibold">
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  placeholder="0911..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onBlur={handlePreCheck}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="region" className="text-xs font-semibold">
                  Region
                </Label>
                <Input
                  id="region"
                  placeholder="e.g. Oromia, Benishangul"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="zone" className="text-xs font-semibold">
                  Zone / Woreda
                </Label>
                <Input
                  id="zone"
                  placeholder="e.g. Guji"
                  value={zone}
                  onChange={(e) => setZone(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="kebele" className="text-xs font-semibold">
                  Kebele / Association
                </Label>
                <Input
                  id="kebele"
                  placeholder="e.g. Shakiso"
                  value={kebele}
                  onChange={(e) => setKebele(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-xs font-semibold">
                Notes / Mining Site Details
              </Label>
              <Input
                id="notes"
                placeholder="Optional remarks"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsRegisterOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isRegistering}>
                {isRegistering ? "Registering..." : "Save Miner Record"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ----------------- EDIT MODAL ----------------- */}
      {editingMiner && (
        <Dialog open={!!editingMiner} onOpenChange={(open) => !open && setEditingMiner(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5" /> Edit ASM Miner Details
              </DialogTitle>
              <DialogDescription>Update miner identification and contact details.</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Full Name *</Label>
                <Input
                  value={editingMiner.full_name}
                  onChange={(e) => setEditingMiner({ ...editingMiner, full_name: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">National ID</Label>
                  <Input
                    value={editingMiner.national_id_number || ""}
                    onChange={(e) => setEditingMiner({ ...editingMiner, national_id_number: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Mining License</Label>
                  <Input
                    value={editingMiner.mining_license_number || ""}
                    onChange={(e) => setEditingMiner({ ...editingMiner, mining_license_number: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Phone Number</Label>
                  <Input
                    value={editingMiner.phone_number || ""}
                    onChange={(e) => setEditingMiner({ ...editingMiner, phone_number: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Region</Label>
                  <Input
                    value={editingMiner.region || ""}
                    onChange={(e) => setEditingMiner({ ...editingMiner, region: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Zone / Woreda</Label>
                  <Input
                    value={editingMiner.zone_or_woreda || ""}
                    onChange={(e) => setEditingMiner({ ...editingMiner, zone_or_woreda: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Kebele</Label>
                  <Input
                    value={editingMiner.kebele || ""}
                    onChange={(e) => setEditingMiner({ ...editingMiner, kebele: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Notes</Label>
                <Input
                  value={editingMiner.notes || ""}
                  onChange={(e) => setEditingMiner({ ...editingMiner, notes: e.target.value })}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingMiner(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
