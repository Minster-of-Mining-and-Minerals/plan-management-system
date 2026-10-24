import { ProductionItemsView } from "@/features/production/ProductionItemsView";

export const metadata = {
  title: "Production Items Registry | Plan Management System",
  description: "Define mineral and commodity production items, supported measurement units, and conversion rules.",
};

export default function ProductionItemsPage() {
  return <ProductionItemsView />;
}
