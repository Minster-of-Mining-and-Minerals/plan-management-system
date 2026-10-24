"use client";

import { useState, useMemo } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import {
  Coins,
  Building2,
  HardHat,
  Scale,
  DollarSign,
  AlertCircle,
  PlusCircle,
  Search,
  ArrowLeft,
  ShieldCheck,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  useGetGoldUnitsQuery,
  useGetAsmMinersQuery,
  useLazySearchAsmCandidatesQuery,
  useRegisterAsmMinerMutation,
  useRecordGoldPurchaseMutation,
} from "@/redux/api/goldApi";
import { useGetCompaniesQuery } from "@/redux/api/companyApi";

export function RecordPurchaseForm() {
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const centerId = params?.id;
  const basePath = centerId ? `/purchasing-centers/${centerId}` : "/purchasing-center";

  const { can } = usePermissions();

  // Form State
  const [sellerType, setSellerType] = useState<"company" | "asm">("company");
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [selectedAsmId, setSelectedAsmId] = useState("");
  const [measurementUnitId, setMeasurementUnitId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [businessDate, setBusinessDate] = useState(() => {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Addis_Ababa",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  });
  const [notes, setNotes] = useState("");

  // Search filters
  const [companySearch, setCompanySearch] = useState("");
  const [asmSearch, setAsmSearch] = useState("");

  // Confirmation Modal
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // New ASM Registration Modal
  const [isRegisterAsmOpen, setIsRegisterAsmOpen] = useState(false);
  const [newAsmFullName, setNewAsmFullName] = useState("");
  const [newAsmNationalId, setNewAsmNationalId] = useState("");
  const [newAsmLicense, setNewAsmLicense] = useState("");
  const [newAsmPhone, setNewAsmPhone] = useState("");
  const [newAsmRegion, setNewAsmRegion] = useState("Oromia");
  const [newAsmZone, setNewAsmZone] = useState("");
  const [newAsmKebele, setNewAsmKebele] = useState("");
  const [newAsmNotes, setNewAsmNotes] = useState("");

  // RTK Queries
  const { data: units = [] } = useGetGoldUnitsQuery({ is_active: true });
  const { data: companies = [] } = useGetCompaniesQuery({ is_active: true });
  const { data: asmData, refetch: refetchAsm } = useGetAsmMinersQuery({
    search: asmSearch.trim() || undefined,
    is_active: true,
    limit: 50,
  });

  const [searchCandidates, { data: candidateMatches }] = useLazySearchAsmCandidatesQuery();
  const [registerAsm, { isLoading: isRegisteringAsm }] = useRegisterAsmMinerMutation();
  const [recordPurchase, { isLoading: isSubmittingPurchase }] = useRecordGoldPurchaseMutation();

  // Selected Unit metadata & conversion calculation
  const selectedUnit = useMemo(() => {
    return units.find((u) => u.unit_id === measurementUnitId) || null;
  }, [units, measurementUnitId]);

  // Set default unit to canonical Gram if not chosen
  if (!measurementUnitId && units.length > 0) {
    const gram = units.find((u) => u.is_canonical_base) || units[0];
    if (gram) setMeasurementUnitId(gram.unit_id);
  }

  // Live calculations
  const parsedQuantity = parseFloat(quantity) || 0;
  const parsedPrice = parseFloat(unitPrice) || 0;
  const conversionFactor = selectedUnit ? parseFloat(String(selectedUnit.conversion_factor)) || 1.0 : 1.0;
  const canonicalGrams = parsedQuantity > 0 ? parseFloat((parsedQuantity * conversionFactor).toFixed(4)) : 0;
  const totalAmount = parsedQuantity > 0 && parsedPrice > 0 ? parseFloat((parsedQuantity * parsedPrice).toFixed(2)) : 0;

  // Selected Seller Information
  const selectedCompany = useMemo(() => {
    return companies.find((c) => c.company_id === selectedCompanyId) || null;
  }, [companies, selectedCompanyId]);

  const selectedAsm = useMemo(() => {
    return asmData?.items?.find((m) => m.asm_id === selectedAsmId) || null;
  }, [asmData, selectedAsmId]);

  // Filtered Companies
  const filteredCompanies = useMemo(() => {
    if (!companySearch.trim()) return companies;
    const s = companySearch.toLowerCase();
    return companies.filter(
      (c) => c.name.toLowerCase().includes(s) || c.code.toLowerCase().includes(s)
    );
  }, [companies, companySearch]);

  // Handle switching seller type (resets conflicting selection)
  const handleSellerTypeChange = (type: "company" | "asm") => {
    setSellerType(type);
    if (type === "company") {
      setSelectedAsmId("");
    } else {
      setSelectedCompanyId("");
    }
  };

  // Handle ASM Candidate Search before registration
  const handleAsmFieldBlur = () => {
    if (newAsmNationalId.trim() || newAsmPhone.trim() || newAsmFullName.trim().length >= 3) {
      searchCandidates({
        national_id_number: newAsmNationalId.trim() || undefined,
        phone_number: newAsmPhone.trim() || undefined,
        full_name: newAsmFullName.trim() || undefined,
      });
    }
  };

  // Submit new ASM registration
  const handleRegisterNewAsm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAsmFullName.trim()) {
      toast.error("ASM full name is required.");
      return;
    }

    try {
      const result = await registerAsm({
        full_name: newAsmFullName.trim(),
        national_id_number: newAsmNationalId.trim() || undefined,
        mining_license_number: newAsmLicense.trim() || undefined,
        phone_number: newAsmPhone.trim() || undefined,
        region: newAsmRegion.trim() || undefined,
        zone_or_woreda: newAsmZone.trim() || undefined,
        kebele: newAsmKebele.trim() || undefined,
        notes: newAsmNotes.trim() || undefined,
      }).unwrap();

      toast.success(`ASM Miner '${result.full_name}' registered successfully!`);
      setIsRegisterAsmOpen(false);
      await refetchAsm();
      setSelectedAsmId(result.asm_id);

      // Reset form
      setNewAsmFullName("");
      setNewAsmNationalId("");
      setNewAsmLicense("");
      setNewAsmPhone("");
      setNewAsmZone("");
      setNewAsmKebele("");
      setNewAsmNotes("");
    } catch (err: unknown) {
      const errorObj = err as { data?: { message?: string }; message?: string };
      toast.error(errorObj?.data?.message || errorObj?.message || "Failed to register ASM miner.");
    }
  };

  // Submit Purchase
  const handleSubmitPurchase = async () => {
    if (sellerType === "company" && !selectedCompanyId) {
      toast.error("Please select a registered company as the seller.");
      return;
    }
    if (sellerType === "asm" && !selectedAsmId) {
      toast.error("Please select an ASM miner as the seller.");
      return;
    }
    if (!measurementUnitId) {
      toast.error("Please select a measurement unit.");
      return;
    }
    if (parsedQuantity <= 0) {
      toast.error("Please enter a valid positive gold quantity.");
      return;
    }
    if (parsedPrice < 0) {
      toast.error("Unit price cannot be negative.");
      return;
    }

    try {
      const res = await recordPurchase({
        purchasing_center_id: centerId,
        seller_type: sellerType,
        company_id: sellerType === "company" ? selectedCompanyId : undefined,
        asm_id: sellerType === "asm" ? selectedAsmId : undefined,
        quantity: parsedQuantity,
        measurement_unit_id: measurementUnitId,
        unit_price: parsedPrice,
        business_date: businessDate,
        notes: notes.trim() || undefined,
      }).unwrap();

      toast.success(`Purchase recorded successfully! Ref: ${res.purchase_reference}`);
      setIsConfirmOpen(false);
      router.push(`${basePath}/purchases/${res.purchase_id}`);
    } catch (err: unknown) {
      const errorObj = err as { data?: { message?: string }; message?: string };
      toast.error(errorObj?.data?.message || errorObj?.message || "Failed to record gold purchase.");
    }
  };

  return (
    <div className="w-full mx-auto space-y-6">
      {/* ----------------- TOP HEADER ----------------- */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <Button asChild variant="ghost" size="sm" className="gap-1 mb-1 text-muted-foreground">
            <Link href={`${basePath}/purchases`}>
              <ArrowLeft className="h-4 w-4" /> Back to Purchase Register
            </Link>
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Coins className="h-7 w-7 text-amber-500" />
            Record Gold Purchase
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Register individual gold acquisition with seller attribution, configurable measurement units, and auditable receipt generation.
          </p>
        </div>
      </div>

      {/* ----------------- MAIN FORM CARD ----------------- */}
      <div className="p-6 sm:p-8 rounded-3xl bg-card border border-border shadow-xs space-y-8">
        {/* SECTION 1: SELLER ATTRIBUTION */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">
                  1
                </span>
                Seller Identification
              </h3>
              <p className="text-xs text-muted-foreground">
                Select whether the gold is purchased from an established corporate entity or an ASM miner.
              </p>
            </div>
            {sellerType === "asm" && can("ASM:CREATE") && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsRegisterAsmOpen(true)}
                className="gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/5"
              >
                <PlusCircle className="h-3.5 w-3.5" /> Register New ASM
              </Button>
            )}
          </div>

          {/* Seller Type Toggle */}
          <div className="grid grid-cols-2 gap-3 p-1.5 rounded-2xl bg-muted/50 border border-border">
            <button
              type="button"
              onClick={() => handleSellerTypeChange("company")}
              className={`py-3 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2.5 transition-all ${sellerType === "company"
                ? "bg-background text-foreground shadow-xs border border-border"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <Building2 className="h-4 w-4 text-sky-500" />
              Registered Company
            </button>
            <button
              type="button"
              onClick={() => handleSellerTypeChange("asm")}
              className={`py-3 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2.5 transition-all ${sellerType === "asm"
                ? "bg-background text-foreground shadow-xs border border-border"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <HardHat className="h-4 w-4 text-amber-500" />
              ASM Miner
            </button>
          </div>

          {/* COMPANY SELECTOR */}
          {sellerType === "company" && (
            <div className="space-y-3 pt-2">
              <Label className="text-xs font-semibold">Select Company from Registry</Label>
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search company name or code..."
                    value={companySearch}
                    onChange={(e) => setCompanySearch(e.target.value)}
                    className="pl-9 h-9 text-sm"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto divide-y divide-border rounded-xl border border-border bg-background">
                  {filteredCompanies.map((c) => (
                    <div
                      key={c.company_id}
                      onClick={() => setSelectedCompanyId(c.company_id)}
                      className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${selectedCompanyId === c.company_id
                        ? "bg-primary/10 border-l-4 border-l-primary"
                        : "hover:bg-muted/40"
                        }`}
                    >
                      <div className="space-y-0.5">
                        <p className="text-sm font-semibold text-foreground">{c.name}</p>
                        <p className="text-xs font-mono text-muted-foreground">{c.code}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {c.is_active ? "Active" : "Inactive"}
                        </Badge>
                        {selectedCompanyId === c.company_id && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </div>
                    </div>
                  ))}
                  {filteredCompanies.length === 0 && (
                    <div className="p-4 text-center text-xs text-muted-foreground">
                      No companies match your search.
                    </div>
                  )}
                </div>
              </div>

              {selectedCompany && (
                <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-400/20 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Building2 className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                    <div>
                      <p className="text-xs font-semibold text-sky-950 dark:text-sky-100">
                        Selected: {selectedCompany.name}
                      </p>
                      <p className="text-[11px] font-mono text-sky-700 dark:text-sky-300">
                        Code: {selectedCompany.code}
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-sky-600 text-white text-[10px]">Company Seller</Badge>
                </div>
              )}
            </div>
          )}

          {/* ASM MINER SELECTOR */}
          {sellerType === "asm" && (
            <div className="space-y-3 pt-2">
              <Label className="text-xs font-semibold">Select Artisanal & Small-Scale Miner (ASM)</Label>
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search miner by name, national ID, or phone..."
                    value={asmSearch}
                    onChange={(e) => setAsmSearch(e.target.value)}
                    className="pl-9 h-9 text-sm"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto divide-y divide-border rounded-xl border border-border bg-background">
                  {asmData?.items && asmData.items.length > 0 ? (
                    asmData.items.map((m) => (
                      <div
                        key={m.asm_id}
                        onClick={() => setSelectedAsmId(m.asm_id)}
                        className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${selectedAsmId === m.asm_id
                          ? "bg-amber-500/10 border-l-4 border-l-amber-500"
                          : "hover:bg-muted/40"
                          }`}
                      >
                        <div className="space-y-0.5">
                          <p className="text-sm font-semibold text-foreground">{m.full_name}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-2 font-mono">
                            {m.national_id_number && <span>ID: {m.national_id_number}</span>}
                            {m.phone_number && <span>Phone: {m.phone_number}</span>}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">
                            {m.region || "ASM"}
                          </Badge>
                          {selectedAsmId === m.asm_id && (
                            <Check className="h-4 w-4 text-amber-600" />
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs text-muted-foreground space-y-2">
                      <p>No matching ASM miner found in the shared registry.</p>
                      {can("ASM:CREATE") && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setIsRegisterAsmOpen(true)}
                          className="h-7 text-xs"
                        >
                          <PlusCircle className="h-3.5 w-3.5 mr-1" /> Register New Miner
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {selectedAsm && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-400/20 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <HardHat className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <div>
                      <p className="text-xs font-semibold text-amber-950 dark:text-amber-100">
                        Selected: {selectedAsm.full_name}
                      </p>
                      <p className="text-[11px] font-mono text-amber-700 dark:text-amber-300">
                        {selectedAsm.national_id_number ? `ID: ${selectedAsm.national_id_number}` : ""}
                        {selectedAsm.phone_number ? ` • Tel: ${selectedAsm.phone_number}` : ""}
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-amber-600 text-white text-[10px]">ASM Miner</Badge>
                </div>
              )}
            </div>
          )}
        </div>

        {/* SECTION 2: MEASUREMENT, QUANTITY & FINANCIALS */}
        <div className="space-y-4 pt-4 border-t border-border">
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">
                2
              </span>
              Gold Quantity & Pricing
            </h3>
            <p className="text-xs text-muted-foreground">
              Select an approved measurement unit, enter measured weight, and specify the transaction rate.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Measurement Unit */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Configurable Unit</Label>
              <Select value={measurementUnitId} onValueChange={setMeasurementUnitId}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue placeholder="Select Measurement Unit" />
                </SelectTrigger>
                <SelectContent>
                  {units.map((u) => (
                    <SelectItem key={u.unit_id} value={u.unit_id}>
                      {u.name} ({u.symbol}) {u.is_canonical_base ? "— Base Unit" : `(${u.conversion_factor}g)`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quantity */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Quantity ({selectedUnit?.symbol || "unit"})</Label>
              <Input
                type="number"
                step="0.0001"
                min="0.0001"
                placeholder="0.0000"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="h-10 text-sm font-mono"
              />
            </div>

            {/* Unit Price */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Unit Price (ETB / {selectedUnit?.symbol || "unit"})</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                className="h-10 text-sm font-mono"
              />
            </div>
          </div>

          {/* LIVE CONVERSION & TOTAL PAYOUT CALLOUT */}
          {parsedQuantity > 0 && (
            <div className="p-4 rounded-2xl bg-muted/60 border border-border grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Scale className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Standardized Base Weight</p>
                  <p className="text-lg font-bold font-mono text-foreground">
                    {canonicalGrams.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} grams
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    1 {selectedUnit?.symbol} = {conversionFactor}g canonical base
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 sm:border-l sm:border-border sm:pl-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <DollarSign className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Authoritative Purchase Total</p>
                  <p className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Computed server-side ({parsedQuantity} × {parsedPrice} ETB)
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 3: BUSINESS DATE & REFERENCE NOTES */}
        <div className="space-y-4 pt-4 border-t border-border">
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">
                3
              </span>
              Operational Metadata
            </h3>
            <p className="text-xs text-muted-foreground">
              Define the accounting business date and optional batch notes.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Business Date (Application Timezone)</Label>
              <Input
                type="date"
                value={businessDate}
                onChange={(e) => setBusinessDate(e.target.value)}
                className="h-10 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Notes & Reference (Optional)</Label>
              <Textarea
                placeholder="Weighing scale serial, batch purity test, assay remarks..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="text-sm resize-none"
              />
            </div>
          </div>
        </div>

        {/* SUBMIT BUTTON */}
        <div className="pt-4 flex items-center justify-end gap-3 border-t border-border">
          <Button asChild variant="outline">
            <Link href={`${basePath}/purchases`}>Cancel</Link>
          </Button>
          <Button
            type="button"
            onClick={() => setIsConfirmOpen(true)}
            disabled={
              (sellerType === "company" && !selectedCompanyId) ||
              (sellerType === "asm" && !selectedAsmId) ||
              parsedQuantity <= 0
            }
            className="gap-2 font-semibold shadow-sm"
          >
            <ShieldCheck className="h-4 w-4" />
            Review & Confirm Purchase
          </Button>
        </div>
      </div>

      {/* ----------------- CONFIRMATION MODAL ----------------- */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Confirm Gold Purchase Recording
            </DialogTitle>
            <DialogDescription>
              Please review transaction details before committing to the official purchasing register.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-sm divide-y divide-border">
            <div className="flex justify-between py-1.5">
              <span className="text-muted-foreground">Business Date:</span>
              <span className="font-medium text-foreground">{businessDate}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-muted-foreground">Seller Type:</span>
              <Badge variant="outline" className="text-xs uppercase">
                {sellerType}
              </Badge>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-muted-foreground">Seller:</span>
              <span className="font-semibold text-foreground text-right max-w-[200px] truncate">
                {sellerType === "company" ? selectedCompany?.name : selectedAsm?.full_name}
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-muted-foreground">Recorded Quantity:</span>
              <span className="font-mono font-bold text-foreground">
                {parsedQuantity.toLocaleString()}{" "}
                <span className="text-xs text-muted-foreground">{selectedUnit?.symbol}</span>
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-muted-foreground">Canonical Weight:</span>
              <span className="font-mono font-bold text-amber-600">
                {canonicalGrams.toLocaleString()} grams
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-muted-foreground">Unit Rate:</span>
              <span className="font-mono text-foreground">{parsedPrice.toLocaleString()} ETB</span>
            </div>
            <div className="flex justify-between py-2 text-base font-bold">
              <span>Total Payout:</span>
              <span className="font-mono text-emerald-600">
                {totalAmount.toLocaleString()} ETB
              </span>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>
              Back to Edit
            </Button>
            <Button onClick={handleSubmitPurchase} disabled={isSubmittingPurchase} className="gap-2">
              {isSubmittingPurchase ? "Saving..." : "Commit Transaction"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ----------------- REGISTER NEW ASM MODAL ----------------- */}
      <Dialog open={isRegisterAsmOpen} onOpenChange={setIsRegisterAsmOpen}>
        <DialogContent className="max-w-lg">
          <form onSubmit={handleRegisterNewAsm}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <HardHat className="h-5 w-5 text-amber-500" />
                Register New Artisanal & Small-Scale Miner (ASM)
              </DialogTitle>
              <DialogDescription>
                Registers into the shared national ASM registry, accessible across all purchasing centers and federal oversight.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Duplicate Detection Alert if candidates found */}
              {candidateMatches && candidateMatches.exact_matches.length > 0 && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4" /> Potential Duplicate Detected!
                  </p>
                  <p>
                    An ASM miner with this identifier is already registered:{" "}
                    <strong>{candidateMatches.exact_matches[0].full_name}</strong>
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Full Name *</Label>
                <Input
                  required
                  placeholder="Miner full legal name"
                  value={newAsmFullName}
                  onChange={(e) => setNewAsmFullName(e.target.value)}
                  onBlur={handleAsmFieldBlur}
                  className="h-9 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">National ID / Kebele ID</Label>
                  <Input
                    placeholder="e.g. ETH-12345"
                    value={newAsmNationalId}
                    onChange={(e) => setNewAsmNationalId(e.target.value)}
                    onBlur={handleAsmFieldBlur}
                    className="h-9 text-sm font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Mining License No. (If held)</Label>
                  <Input
                    placeholder="e.g. ML-7890"
                    value={newAsmLicense}
                    onChange={(e) => setNewAsmLicense(e.target.value)}
                    className="h-9 text-sm font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Phone Number</Label>
                  <Input
                    placeholder="+251 9..."
                    value={newAsmPhone}
                    onChange={(e) => setNewAsmPhone(e.target.value)}
                    onBlur={handleAsmFieldBlur}
                    className="h-9 text-sm font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Region</Label>
                  <Input
                    placeholder="e.g. Oromia, Benishangul"
                    value={newAsmRegion}
                    onChange={(e) => setNewAsmRegion(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Zone / Woreda</Label>
                  <Input
                    placeholder="e.g. Guji / Shakiso"
                    value={newAsmZone}
                    onChange={(e) => setNewAsmZone(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Kebele</Label>
                  <Input
                    placeholder="e.g. Reji"
                    value={newAsmKebele}
                    onChange={(e) => setNewAsmKebele(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Notes</Label>
                <Input
                  placeholder="Optional miner background info..."
                  value={newAsmNotes}
                  onChange={(e) => setNewAsmNotes(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setIsRegisterAsmOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isRegisteringAsm}>
                {isRegisteringAsm ? "Registering..." : "Save & Select Miner"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
