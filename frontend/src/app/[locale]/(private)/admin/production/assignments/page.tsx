import { CompanyProductionAssignmentsView } from "@/features/production/CompanyProductionAssignmentsView";

export const metadata = {
  title: "Company Production Assignments | Plan Management System",
  description: "Assign production items, configure reporting frequencies and target allocation hierarchies across companies.",
};

export default function CompanyProductionAssignmentsPage() {
  return <CompanyProductionAssignmentsView />;
}
