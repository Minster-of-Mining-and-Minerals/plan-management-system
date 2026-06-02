import { redirect } from "next/navigation";

export default function PharmacyReceivedRedirect() {
  redirect("/pharmacy/prescriptions?status=received");
}
