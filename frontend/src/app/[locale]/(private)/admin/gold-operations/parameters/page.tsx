import { GoldParameterConfigurationView } from "@/features/gold-purchasing/GoldParameterConfigurationView";

export const metadata = {
  title: "Gold Parameters & Standards | Plan Management System",
  description: "Configure gold physical types, karat purity benchmarks, and quality grades.",
};

export default function GoldParametersPage() {
  return <GoldParameterConfigurationView />;
}
