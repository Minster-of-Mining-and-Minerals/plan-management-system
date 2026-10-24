import { RecordPurchaseForm } from "@/features/gold-purchasing/RecordPurchaseForm";

export const metadata = {
  title: "Record Gold Purchase | Plan Management System",
  description: "Record individual gold acquisitions with seller attribution and dynamic measurement units.",
};

export default function RecordPurchasePage() {
  return <RecordPurchaseForm />;
}
