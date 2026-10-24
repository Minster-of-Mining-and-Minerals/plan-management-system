import { ProductionFrequenciesView } from "@/features/production/ProductionFrequenciesView";

export const metadata = {
  title: "Reporting Frequencies | Plan Management System",
  description: "Configure dynamic reporting frequencies and period generation rules for company reporting.",
};

export default function ProductionFrequenciesPage() {
  return <ProductionFrequenciesView />;
}
