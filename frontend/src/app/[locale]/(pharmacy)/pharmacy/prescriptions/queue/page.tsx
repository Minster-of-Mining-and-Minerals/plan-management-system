import { redirect } from "next/navigation";

/** Legacy route — dispensing queue is a status filter on Prescriptions */
export default function PharmacyQueueRedirect() {
  redirect("/pharmacy/prescriptions?status=reviewing");
}
