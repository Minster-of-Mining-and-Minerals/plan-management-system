"use client";

import { useState, useMemo, useEffect } from "react";
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
  Sparkles,
  CheckCircle2,
  Sliders,
  Calendar,
  Layers,
  FileText,
  BadgeCheck,
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
  useGetActiveGoldPriceQuery,
} from "@/redux/api/goldApi";
import { useGetCompaniesQuery } from "@/redux/api/companyApi";
import { useGoldParameters } from "./goldParametersConfig";

export function RecordPurchaseForm() {
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const centerId = params?.id;
  const basePath = centerId ? `/purchasing-centers/${centerId}` : "/purchasing-center";

  const { can } = usePermissions();
  const {
    isSpecsModuleEnabled,
    isPurchasingPremiumEnabled,
    purchasingPremiumRate,
    availableGoldTypes,
    availableKaratGrades,
    availableQualityGrades,
  } = useGoldParameters();

  // Form State
  const [sellerType, setSellerType] = useState<"company" | "asm">("company");
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [selectedAsmId, setSelectedAsmId] = useState("");
  const [measurementUnitId, setMeasurementUnitId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");

  const defaultGoldType = availableGoldTypes[0]?.name || "Raw/Placer Gold";
  const defaultKarat = availableKaratGrades[0]?.karat || "24K";
  const defaultPurity = String(availableKaratGrades[0]?.default_purity_percentage || 99.9);
  const defaultQuality = availableQualityGrades[0]?.grade || "Grade A";

  const [goldType, setGoldType] = useState<string>(defaultGoldType);
  const [karat, setKarat] = useState<string>(defaultKarat);
  const [qualityGrade, setQualityGrade] = useState<string>(defaultQuality);
  const [purityPercentage, setPurityPercentage] = useState<string>(defaultPurity);

  // Sync if available lists change or defaults are empty
  useEffect(() => {
    if (availableGoldTypes.length > 0 && !availableGoldTypes.some((t) => t.name === goldType)) {
      setGoldType(availableGoldTypes[0].name);
    }
  }, [availableGoldTypes, goldType]);

  useEffect(() => {
    if (availableKaratGrades.length > 0 && !availableKaratGrades.some((k) => k.karat === karat)) {
      setKarat(availableKaratGrades[0].karat);
      setPurityPercentage(String(availableKaratGrades[0].default_purity_percentage));
    }
  }, [availableKaratGrades, karat]);

  useEffect(() => {
    if (availableQualityGrades.length > 0 && !availableQualityGrades.some((q) => q.grade === qualityGrade)) {
      setQualityGrade(availableQualityGrades[0].grade);
    }
  }, [availableQualityGrades, qualityGrade]);

  const [priceMode, setPriceMode] = useState<"configured" | "custom">("configured");
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

  const { data: activePriceConfig, isFetching: isPriceConfigLoading } = useGetActiveGoldPriceQuery({
    gold_type: isSpecsModuleEnabled ? goldType : undefined,
    karat: isSpecsModuleEnabled ? karat : undefined,
    quality_grade: isSpecsModuleEnabled ? qualityGrade : undefined,
    measurement_unit_id: measurementUnitId || undefined,
  });

  const [searchCandidates, { data: candidateMatches }] = useLazySearchAsmCandidatesQuery();
  const [registerAsm, { isLoading: isRegisteringAsm }] = useRegisterAsmMinerMutation();
  const [recordPurchase, { isLoading: isSubmittingPurchase }] = useRecordGoldPurchaseMutation();

  // Auto-populate unit price when using configured pricing benchmark
  useEffect(() => {
    if (priceMode === "configured" && activePriceConfig?.price_per_unit) {
      setUnitPrice(String(activePriceConfig.price_per_unit));
    }
  }, [activePriceConfig, priceMode]);

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
  const baseTotalAmount = parsedQuantity > 0 && parsedPrice > 0 ? parseFloat((parsedQuantity * parsedPrice).toFixed(2)) : 0;
  const activePremiumPercentage = isPurchasingPremiumEnabled ? (parseFloat(String(purchasingPremiumRate)) || 0) : 0;
  const premiumAmount = baseTotalAmount > 0 && activePremiumPercentage > 0 ? parseFloat(((baseTotalAmount * activePremiumPercentage) / 100).toFixed(2)) : 0;
  const finalTotalAmount = parseFloat((baseTotalAmount + premiumAmount).toFixed(2));
  // Backward compatible alias
  const totalAmount = finalTotalAmount;

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

  // Handle switching seller type
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
        amount_before_premium: baseTotalAmount,
        premium_percentage: activePremiumPercentage,
        premium_amount: premiumAmount,
        total_amount: finalTotalAmount,
        gold_type: isSpecsModuleEnabled ? goldType : undefined,
        karat: isSpecsModuleEnabled ? karat : undefined,
        quality_grade: isSpecsModuleEnabled ? qualityGrade : undefined,
        purity_percentage: isSpecsModuleEnabled && purityPercentage ? parseFloat(purityPercentage) : undefined,
        is_custom_price: priceMode === "custom",
        price_configuration_id: priceMode === "configured" ? activePriceConfig?.price_config_id : undefined,
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Button asChild variant="ghost" size="sm" className="gap-1 mb-1 text-muted-foreground hover:text-foreground">
            <Link href={`${basePath}/purchases`}>
              <ArrowLeft className="h-4 w-4" /> Back to Purchase Register
            </Link>
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Coins className="h-7 w-7 text-amber-500" />
            Record Gold Purchase
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Register gold acquisition with seller attribution, purity calibration, benchmark pricing, and verifiable receipt generation.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Badge variant="outline" className="gap-1.5 py-1 px-3 text-xs bg-card border-border">
            <Calendar className="h-3.5 w-3.5 text-amber-500" />
            <span>Business Date: <strong>{businessDate}</strong></span>
          </Badge>
        </div>
      </div>

      {/* ----------------- 2-COLUMN COCKPIT LAYOUT ----------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: FORM CARDS (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">

          {/* CARD 1: SELLER IDENTIFICATION */}
          <div className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">
                    1
                  </span>
                  Seller Identification & Sourcing
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Distinguish between corporate licensed producers and artisanal small-scale miners.
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
            <div className="grid grid-cols-2 gap-3 p-1.5 rounded-2xl bg-muted/40 border border-border">
              <button
                type="button"
                onClick={() => handleSellerTypeChange("company")}
                className={`py-3 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2.5 transition-all ${
                  sellerType === "company"
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
                className={`py-3 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2.5 transition-all ${
                  sellerType === "asm"
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
              <div className="space-y-3 pt-1">
                <Label className="text-xs font-semibold text-foreground">Select Sourcing Mining Company</Label>
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search company by name or identification code..."
                      value={companySearch}
                      onChange={(e) => setCompanySearch(e.target.value)}
                      className="pl-9 h-10 text-sm rounded-xl"
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto divide-y divide-border rounded-2xl border border-border bg-background">
                    {filteredCompanies.map((c) => (
                      <div
                        key={c.company_id}
                        onClick={() => setSelectedCompanyId(c.company_id)}
                        className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                          selectedCompanyId === c.company_id
                            ? "bg-sky-500/10 border-l-4 border-l-sky-500"
                            : "hover:bg-muted/40"
                        }`}
                      >
                        <div className="space-y-0.5">
                          <p className="text-sm font-semibold text-foreground">{c.name}</p>
                          <p className="text-xs font-mono text-muted-foreground">code: {c.code}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">
                            {c.is_active ? "Active" : "Inactive"}
                          </Badge>
                          {selectedCompanyId === c.company_id && (
                            <Check className="h-4 w-4 text-sky-600 dark:text-sky-400" />
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
                  <div className="p-3.5 rounded-2xl bg-sky-500/10 border border-sky-400/20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-600 flex items-center justify-center">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-sky-950 dark:text-sky-100">
                          {selectedCompany.name}
                        </p>
                        <p className="text-[11px] font-mono text-sky-700 dark:text-sky-300">
                          Code: {selectedCompany.code}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-sky-600 text-white text-[10px]">Verified Company</Badge>
                  </div>
                )}
              </div>
            )}

            {/* ASM MINER SELECTOR */}
            {sellerType === "asm" && (
              <div className="space-y-3 pt-1">
                <Label className="text-xs font-semibold text-foreground">Select Registered ASM Miner</Label>
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search miner by name, national ID, phone, or license..."
                      value={asmSearch}
                      onChange={(e) => setAsmSearch(e.target.value)}
                      className="pl-9 h-10 text-sm rounded-xl"
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto divide-y divide-border rounded-2xl border border-border bg-background">
                    {asmData?.items && asmData.items.length > 0 ? (
                      asmData.items.map((m) => (
                        <div
                          key={m.asm_id}
                          onClick={() => setSelectedAsmId(m.asm_id)}
                          className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                            selectedAsmId === m.asm_id
                              ? "bg-amber-500/10 border-l-4 border-l-amber-500"
                              : "hover:bg-muted/40"
                          }`}
                        >
                          <div className="space-y-0.5">
                            <p className="text-sm font-semibold text-foreground">{m.full_name}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-2 font-mono">
                              {m.national_id_number && <span>ID: {m.national_id_number}</span>}
                              {m.phone_number && <span>Tel: {m.phone_number}</span>}
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
                        <p>No matching ASM miner found in the registry.</p>
                        {can("ASM:CREATE") && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsRegisterAsmOpen(true)}
                            className="h-8 text-xs rounded-xl"
                          >
                            <PlusCircle className="h-3.5 w-3.5 mr-1" /> Register New Miner
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {selectedAsm && (
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-400/20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center">
                        <HardHat className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-amber-950 dark:text-amber-100">
                          {selectedAsm.full_name}
                        </p>
                        <p className="text-[11px] font-mono text-amber-700 dark:text-amber-300">
                          {selectedAsm.national_id_number ? `ID: ${selectedAsm.national_id_number}` : ""}
                          {selectedAsm.phone_number ? ` • Tel: ${selectedAsm.phone_number}` : ""}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-amber-600 text-white text-[10px]">Verified ASM Miner</Badge>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* CARD 2: GOLD SPECIFICATION & QUALITY STANDARDS (CONDITIONALLY RENDERED WHEN MODULE IS ACTIVE) */}
          {isSpecsModuleEnabled && (
            <div className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs flex items-center justify-center font-bold">
                      2
                    </span>
                    Gold Quality & Karat Specifications
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Select configured physical gold type, karat purity rating, and certification quality grade.
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                  Configured Standards
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-2xl bg-muted/20 border border-border">
                {/* Gold Type */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Gold Type *</Label>
                  <Select value={goldType} onValueChange={setGoldType}>
                    <SelectTrigger className="h-9 text-xs rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableGoldTypes.map((t) => (
                        <SelectItem key={t.id} value={t.name}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Karat Grade */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Karat Grade *</Label>
                  <Select
                    value={karat}
                    onValueChange={(val) => {
                      setKarat(val);
                      const matched = availableKaratGrades.find((k) => k.karat === val);
                      if (matched) setPurityPercentage(String(matched.default_purity_percentage));
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableKaratGrades.map((k) => (
                        <SelectItem key={k.id} value={k.karat}>
                          {k.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Purity % */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Purity Percentage (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={purityPercentage}
                    onChange={(e) => setPurityPercentage(e.target.value)}
                    placeholder="e.g. 99.9"
                    className="h-9 text-xs font-mono rounded-xl"
                  />
                </div>

                {/* Quality Grade */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Quality Grading *</Label>
                  <Select value={qualityGrade} onValueChange={setQualityGrade}>
                    <SelectTrigger className="h-9 text-xs rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableQualityGrades.map((q) => (
                        <SelectItem key={q.id} value={q.grade}>
                          {q.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* CARD 3: MEASUREMENT INTAKE & UNIT CONVERSION */}
          <div className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-5">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs flex items-center justify-center font-bold">
                  {isSpecsModuleEnabled ? 3 : 2}
                </span>
                Measurement Intake & Unit Conversion
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Input measured weight using any active center unit. The platform automatically harmonizes to standardized metric grams.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Measurement Unit */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Configurable Unit *</Label>
                <Select value={measurementUnitId} onValueChange={setMeasurementUnitId}>
                  <SelectTrigger className="h-10 text-sm rounded-xl">
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
                <Label className="text-xs font-semibold">Quantity ({selectedUnit?.symbol || "unit"}) *</Label>
                <Input
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  placeholder="0.0000"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="h-10 text-sm font-mono rounded-xl"
                />
              </div>
            </div>

            {/* LIVE CONVERSION CALLOUT */}
            {parsedQuantity > 0 && (
              <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <Scale className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Standardized Canonical Weight</p>
                    <p className="text-base font-bold font-mono text-foreground">
                      {canonicalGrams.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} grams
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs font-mono text-amber-700 dark:text-amber-300 border-amber-500/30">
                  1 {selectedUnit?.symbol} = {conversionFactor}g canonical base
                </Badge>
              </div>
            )}
          </div>

          {/* CARD 4: PRICING BENCHMARK & FINANCIAL VALUATION */}
          <div className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs flex items-center justify-center font-bold">
                    {isSpecsModuleEnabled ? 4 : 3}
                  </span>
                  Valuation Rate & Pricing Benchmark
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Apply official price schedule or provide assayer expert valuation.
                </p>
              </div>

              {/* Mode Toggle */}
              <div className="flex items-center gap-1.5 bg-muted/50 p-1 rounded-xl border border-border shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setPriceMode("configured");
                    if (activePriceConfig?.price_per_unit) {
                      setUnitPrice(String(activePriceConfig.price_per_unit));
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    priceMode === "configured"
                      ? "bg-background text-foreground shadow-xs border border-border"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Configured Benchmark
                </button>
                <button
                  type="button"
                  onClick={() => setPriceMode("custom")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    priceMode === "custom"
                      ? "bg-background text-foreground shadow-xs border border-border"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Custom Override
                </button>
              </div>
            </div>

            {/* Active Benchmark Info */}
            {priceMode === "configured" ? (
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-600 text-white font-semibold text-[11px]">
                    Official Benchmark: {activePriceConfig ? `${parseFloat(String(activePriceConfig.price_per_unit)).toLocaleString()} ETB / ${selectedUnit?.symbol || "g"}` : "Loading..."}
                  </Badge>
                  {activePriceConfig?.min_price_per_unit && activePriceConfig?.max_price_per_unit && (
                    <span className="text-muted-foreground font-mono text-[11px]">
                      (Allowed: {parseFloat(String(activePriceConfig.min_price_per_unit)).toLocaleString()} – {parseFloat(String(activePriceConfig.max_price_per_unit)).toLocaleString()} ETB)
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-muted-foreground">
                  Synchronized with Federal Price Configuration
                </span>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300">
                <Sparkles className="h-4 w-4 shrink-0 text-amber-500" />
                <span>
                  Custom Rate Mode: Registrar manually specifies the negotiated or assayed price for this specific transaction batch.
                </span>
              </div>
            )}

            {/* Unit Price Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">
                  Unit Price (ETB / {selectedUnit?.symbol || "unit"}) *
                </Label>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {priceMode === "configured" ? "Automated Rate" : "Manual Rate"}
                </span>
              </div>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                className={`h-11 text-base font-mono font-bold rounded-xl ${
                  priceMode === "configured"
                    ? "bg-muted/40 border-border text-foreground"
                    : "border-primary/50 text-foreground"
                }`}
              />
            </div>
          </div>

          {/* CARD 5: OPERATIONAL METADATA */}
          <div className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-5">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 text-xs flex items-center justify-center font-bold">
                  {isSpecsModuleEnabled ? 5 : 4}
                </span>
                Operational Metadata & Audit Notes
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Specify transaction accounting date and physical scale/lot reference.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Business Accounting Date</Label>
                <Input
                  type="date"
                  value={businessDate}
                  onChange={(e) => setBusinessDate(e.target.value)}
                  className="h-10 text-sm rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Assay & Scale Notes (Optional)</Label>
                <Textarea
                  placeholder="Scale serial no, batch density, assay notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="text-xs resize-none rounded-xl"
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: STICKY TRANSACTION SUMMARY COCKPIT (4 Cols) */}
        <div className="lg:col-span-4 sticky top-6 space-y-4">
          <div className="p-6 rounded-3xl bg-card border border-border shadow-md space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-amber-500" />
                <h3 className="font-bold text-foreground text-sm">Purchase Receipt Audit</h3>
              </div>
              <Badge variant="outline" className="text-[10px] uppercase font-mono">
                {priceMode === "configured" ? "Benchmark" : "Override"}
              </Badge>
            </div>

            {/* TWO RESULTS TRANSACTION PAYOUT HERO */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-emerald-500/5 to-transparent border border-amber-500/20 space-y-3">
              {/* RESULT 1: TOTAL WITHOUT PERCENTAGE */}
              <div className="space-y-0.5 pb-2.5 border-b border-border/70">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    1. Base Total (Without Percentage)
                  </span>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    Net Valuation
                  </Badge>
                </div>
                <p className="text-xl font-bold font-mono text-foreground">
                  {baseTotalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  <span className="text-xs font-normal text-muted-foreground ml-1">ETB</span>
                </p>
                <p className="text-[11px] text-muted-foreground font-mono">
                  {parsedQuantity > 0 && parsedPrice > 0
                    ? `${parsedQuantity.toLocaleString()} ${selectedUnit?.symbol || "unit"} × ${parsedPrice.toLocaleString()} ETB`
                    : "Awaiting valid quantity & unit price"}
                </p>
              </div>

              {/* INCENTIVE PERCENTAGE ADDITION */}
              {isPurchasingPremiumEnabled && activePremiumPercentage > 0 && (
                <div className="flex items-center justify-between text-xs py-1.5 bg-emerald-500/10 px-3 rounded-xl border border-emerald-500/20">
                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-500" /> +{activePremiumPercentage}% Incentive:
                  </span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    +{premiumAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
                  </span>
                </div>
              )}

              {/* RESULT 2: FINAL TOTAL INCLUDING PERCENTAGE */}
              <div className="space-y-0.5 pt-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                    2. Final Total Payout (With Percentage)
                  </span>
                  <Badge className="bg-emerald-600 text-white text-[10px] font-mono font-bold">
                    Payable
                  </Badge>
                </div>
                <p className="text-3xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                  {finalTotalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  <span className="text-sm font-semibold text-muted-foreground ml-1.5">ETB</span>
                </p>
                <p className="text-[11px] text-muted-foreground font-mono">
                  {isPurchasingPremiumEnabled && activePremiumPercentage > 0
                    ? `Base ${baseTotalAmount.toLocaleString()} ETB + ${activePremiumPercentage}% (+${premiumAmount.toLocaleString()} ETB)`
                    : "No additional percentage applied"}
                </p>
              </div>
            </div>

            {/* TRANSACTION SPECIFICATION SUMMARY */}
            <div className="space-y-3 text-xs divide-y divide-border">
              {isSpecsModuleEnabled ? (
                <>
                  {/* Gold Quality */}
                  <div className="pt-2 flex justify-between items-center">
                    <span className="text-muted-foreground">Gold Specification:</span>
                    <span className="font-semibold text-foreground">
                      {karat} • {goldType}
                    </span>
                  </div>

                  {/* Quality & Purity */}
                  <div className="pt-2 flex justify-between items-center">
                    <span className="text-muted-foreground">Quality & Purity:</span>
                    <span className="font-semibold text-foreground">
                      {qualityGrade} ({purityPercentage}% pure)
                    </span>
                  </div>
                </>
              ) : (
                <div className="pt-2 flex justify-between items-center">
                  <span className="text-muted-foreground">Specifications:</span>
                  <Badge variant="secondary" className="text-[10px] bg-muted text-muted-foreground font-mono">
                    Standard Intake (Module Bypassed)
                  </Badge>
                </div>
              )}

              {/* Standardized Canonical Weight */}
              <div className="pt-2 flex justify-between items-center">
                <span className="text-muted-foreground">Standardized Weight:</span>
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                  {canonicalGrams.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} g
                </span>
              </div>

              {/* Seller attribution */}
              <div className="pt-2 flex justify-between items-start">
                <span className="text-muted-foreground">Seller:</span>
                <div className="text-right max-w-[160px]">
                  {sellerType === "company" ? (
                    selectedCompany ? (
                      <div>
                        <p className="font-semibold text-foreground truncate">{selectedCompany.name}</p>
                        <p className="text-[10px] text-sky-600 font-mono">Company ({selectedCompany.code})</p>
                      </div>
                    ) : (
                      <span className="text-amber-600 font-medium">None Selected</span>
                    )
                  ) : selectedAsm ? (
                    <div>
                      <p className="font-semibold text-foreground truncate">{selectedAsm.full_name}</p>
                      <p className="text-[10px] text-amber-600 font-mono">ASM Miner</p>
                    </div>
                  ) : (
                    <span className="text-amber-600 font-medium">None Selected</span>
                  )}
                </div>
              </div>

              {/* Unit Rate */}
              <div className="pt-2 flex justify-between items-center">
                <span className="text-muted-foreground">Unit Rate:</span>
                <span className="font-mono text-foreground font-semibold">
                  {parsedPrice > 0 ? `${parsedPrice.toLocaleString()} ETB / ${selectedUnit?.symbol || "g"}` : "—"}
                </span>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="space-y-2 pt-2 border-t border-border">
              <Button
                type="button"
                onClick={() => setIsConfirmOpen(true)}
                disabled={
                  (sellerType === "company" && !selectedCompanyId) ||
                  (sellerType === "asm" && !selectedAsmId) ||
                  parsedQuantity <= 0 ||
                  parsedPrice <= 0
                }
                className="w-full gap-2 font-bold h-11 rounded-xl shadow-md bg-amber-500 hover:bg-amber-600 text-slate-950 dark:text-slate-950"
              >
                <ShieldCheck className="h-4 w-4" />
                Review & Commit Purchase
              </Button>

              <Button asChild variant="ghost" className="w-full text-xs text-muted-foreground rounded-xl">
                <Link href={`${basePath}/purchases`}>Cancel and Discard</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ----------------- CONFIRMATION MODAL ----------------- */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-amber-500" />
              Confirm Gold Purchase Recording
            </DialogTitle>
            <DialogDescription>
              Please verify all transaction metrics before signing and committing into the immutable purchase register.
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
            {isSpecsModuleEnabled ? (
              <>
                <div className="flex justify-between py-1.5">
                  <span className="text-muted-foreground">Gold Spec:</span>
                  <span className="font-semibold text-foreground">
                    {karat} ({goldType})
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-muted-foreground">Quality & Purity:</span>
                  <span className="text-foreground">
                    {qualityGrade} ({purityPercentage}% pure)
                  </span>
                </div>
              </>
            ) : (
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">Quality & Specs:</span>
                <span className="text-xs text-muted-foreground italic">
                  Standard Ingest (Module Inactive)
                </span>
              </div>
            )}
            <div className="flex justify-between py-1.5">
              <span className="text-muted-foreground">Pricing Mode:</span>
              <Badge variant={priceMode === "configured" ? "default" : "secondary"} className="text-xs">
                {priceMode === "configured" ? "Configured Benchmark" : "Expert Custom Override"}
              </Badge>
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
              <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                {canonicalGrams.toLocaleString()} grams
              </span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-muted-foreground">Unit Rate:</span>
              <span className="font-mono text-foreground">{parsedPrice.toLocaleString()} ETB</span>
            </div>
            
            {/* TWO RESULTS IN CONFIRMATION MODAL */}
            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/80 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-semibold">1. Base Total (Without Percentage):</span>
                <span className="font-mono font-bold text-foreground">
                  {baseTotalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
                </span>
              </div>
              {isPurchasingPremiumEnabled && activePremiumPercentage > 0 && (
                <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400">
                  <span className="font-semibold flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> +{activePremiumPercentage}% Additional Incentive:
                  </span>
                  <span className="font-mono font-bold">
                    +{premiumAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-border/60 text-sm font-bold">
                <span className="text-emerald-700 dark:text-emerald-300">2. Final Total (With Percentage):</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 text-base">
                  {finalTotalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
                </span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsConfirmOpen(false)} className="rounded-xl">
              Back to Edit
            </Button>
            <Button onClick={handleSubmitPurchase} disabled={isSubmittingPurchase} className="gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold">
              {isSubmittingPurchase ? "Saving..." : "Commit Transaction"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ----------------- REGISTER NEW ASM MODAL ----------------- */}
      <Dialog open={isRegisterAsmOpen} onOpenChange={setIsRegisterAsmOpen}>
        <DialogContent className="max-w-lg rounded-3xl">
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
                <div className="p-3 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs space-y-1">
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
                  className="h-10 text-sm rounded-xl"
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
                    className="h-10 text-sm font-mono rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Mining License No. (If held)</Label>
                  <Input
                    placeholder="e.g. ML-7890"
                    value={newAsmLicense}
                    onChange={(e) => setNewAsmLicense(e.target.value)}
                    className="h-10 text-sm font-mono rounded-xl"
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
                    className="h-10 text-sm font-mono rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Region</Label>
                  <Input
                    placeholder="e.g. Oromia, Benishangul"
                    value={newAsmRegion}
                    onChange={(e) => setNewAsmRegion(e.target.value)}
                    className="h-10 text-sm rounded-xl"
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
                    className="h-10 text-sm rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Kebele</Label>
                  <Input
                    placeholder="e.g. Reji"
                    value={newAsmKebele}
                    onChange={(e) => setNewAsmKebele(e.target.value)}
                    className="h-10 text-sm rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Notes</Label>
                <Input
                  placeholder="Optional miner background info..."
                  value={newAsmNotes}
                  onChange={(e) => setNewAsmNotes(e.target.value)}
                  className="h-10 text-sm rounded-xl"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setIsRegisterAsmOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button type="submit" disabled={isRegisteringAsm} className="rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold">
                {isRegisteringAsm ? "Registering..." : "Save & Select Miner"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
