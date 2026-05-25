"use client";

import { useMemo, useState } from "react";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Layers, ListTree, Plus } from "lucide-react";
import type { ActionButton } from "@/types/tableLayout";
import FormFieldGroupList from "./FormFieldGroupList";
import FormFieldList from "./FormFieldList";
import FormConfigurationGuide from "./FormConfigurationGuide";
import { ConfigTabPanel } from "./ConfigTabPanel";

type Tab = "guide" | "groups" | "fields";

export default function FormFieldManagement() {
  const [tab, setTab] = useState<Tab>("groups");
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [groupModalCreateMode, setGroupModalCreateMode] = useState(false);
  const [fieldModalOpen, setFieldModalOpen] = useState(false);
  const [fieldModalCreateMode, setFieldModalCreateMode] = useState(false);

  const actions: ActionButton[] = useMemo(() => {
    if (tab === "groups") {
      return [
        {
          label: "Add form step",
          icon: <Plus className="h-4 w-4" />,
          variant: "default",
          onClick: () => {
            setGroupModalCreateMode(true);
            setGroupModalOpen(true);
          },
        },
      ];
    }
    if (tab === "fields") {
      return [
        {
          label: "Add custom field",
          icon: <Plus className="h-4 w-4" />,
          variant: "default",
          onClick: () => {
            setFieldModalCreateMode(true);
            setFieldModalOpen(true);
          },
        },
      ];
    }
    return [];
  }, [tab]);

  const showSearch = tab === "groups" || tab === "fields";

  return (
    <TableLayout
      title="Configure Patient Forms"
      description="Eight default categories (Account, Personal Information, Demographics, Emergency, Insurance, Medical, Address, Guardian) are seeded on install. Extend with custom fields anytime."
      actions={actions}
      showSearch={showSearch}
    >
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as Tab)}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-3 h-12 rounded-lg border border-section-accent/30 bg-slate-50 p-1 gap-1 shadow-inner">
          <TabsTrigger
            value="guide"
            className="rounded-md gap-2 text-sm font-medium text-muted-foreground data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-section-accent/30"
          >
            <BookOpen className="h-4 w-4" />
            Guidelines
          </TabsTrigger>
          <TabsTrigger
            value="groups"
            className="rounded-md gap-2 text-sm font-medium text-muted-foreground data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-section-accent/30"
          >
            <Layers className="h-4 w-4" />
            Form steps
          </TabsTrigger>
          <TabsTrigger
            value="fields"
            className="rounded-md gap-2 text-sm font-medium text-muted-foreground data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-section-accent/30"
          >
            <ListTree className="h-4 w-4" />
            Custom fields
          </TabsTrigger>
        </TabsList>

        <TabsContent value="guide" className="mt-6 outline-none">
          <ConfigTabPanel
            title="Configuration reference"
            description="Field types, validation JSON, step rules, and API payload format"
            noPadding
          >
            <div className="p-5 md:p-6">
              <FormConfigurationGuide />
            </div>
          </ConfigTabPanel>
        </TabsContent>

        <TabsContent value="groups" className="mt-6 outline-none">
          <ConfigTabPanel
            title="Form steps (groups)"
            description="Each step is one screen in the create-user wizard. Use search above to filter steps."
          >
            <FormFieldGroupList
              embedded
              modalOpen={groupModalOpen}
              createMode={groupModalCreateMode}
              onEditGroup={() => setGroupModalCreateMode(false)}
              onModalOpenChange={(open) => {
                setGroupModalOpen(open);
                if (!open) setGroupModalCreateMode(false);
              }}
            />
          </ConfigTabPanel>
        </TabsContent>

        <TabsContent value="fields" className="mt-6 outline-none">
          <ConfigTabPanel
            title="Custom fields"
            description="Dynamic fields stored per user. Use search above to filter by label, key, or type."
          >
            <FormFieldList
              embedded
              modalOpen={fieldModalOpen}
              createMode={fieldModalCreateMode}
              onEditField={() => setFieldModalCreateMode(false)}
              onModalOpenChange={(open) => {
                setFieldModalOpen(open);
                if (!open) setFieldModalCreateMode(false);
              }}
            />
          </ConfigTabPanel>
        </TabsContent>
      </Tabs>
    </TableLayout>
  );
}
