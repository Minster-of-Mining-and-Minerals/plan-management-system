"use client";

import { useSearchParams } from "next/navigation";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PrescriptionCategoryList } from "./PrescriptionCategoryList";
import { PrescriptionTemplateList } from "./PrescriptionTemplateList";
import { PrescriptionDocumentTemplateList } from "./PrescriptionDocumentTemplateList";
import { MedicalCertificateTemplateList } from "@/features/medical-certificate/MedicalCertificateTemplateList";

export function PrescriptionManagement() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") || "templates";

  return (
    <TableLayout
      title="Prescription configuration"
      description="Manage prescription categories, reusable templates, and printable document layouts. Branding (hospital name, logo, location) is loaded from system branding."
      showSearch={false}
    >
      <Tabs defaultValue={defaultTab} key={defaultTab} className="w-full">
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="documents">Document layouts</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="certificates">Medical certificates</TabsTrigger>
        </TabsList>
        <TabsContent value="templates" className="mt-4">
          <PrescriptionTemplateList />
        </TabsContent>
        <TabsContent value="documents" className="mt-4">
          <PrescriptionDocumentTemplateList />
        </TabsContent>
        <TabsContent value="categories" className="mt-4">
          <PrescriptionCategoryList />
        </TabsContent>
        <TabsContent value="certificates" className="mt-4">
          <MedicalCertificateTemplateList />
        </TabsContent>
      </Tabs>
    </TableLayout>
  );
}
