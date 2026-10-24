import { GoldPriceConfigurationTable } from "@/features/gold-purchasing/GoldPriceConfigurationTable";

export const metadata = {
  title: "Gold Price Configuration | Plan Management System",
  description: "Configure gold benchmark unit rates and tolerances by karat, purity, quality grade, and measurement unit.",
};

export default function GoldPriceConfigurationPage() {
  return <GoldPriceConfigurationTable />;
}
