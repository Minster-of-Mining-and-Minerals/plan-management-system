import { redirect } from "next/navigation";

export default function PharmacyCompletedRedirect() {
  redirect("/pharmacy/prescriptions?status=completed");
}
