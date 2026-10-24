import { AsmRegistryView } from "@/features/gold-purchasing/AsmRegistryView";

export const metadata = {
  title: "Federal ASM Seller Registry | Plan Management System",
  description: "Manage Artisanal and Small-Scale Miner (ASM) seller registry with duplicate detection, status controls, and cross-center search.",
};

export default function FederalAsmRegistryPage() {
  return <AsmRegistryView isFederalOversight={true} />;
}
