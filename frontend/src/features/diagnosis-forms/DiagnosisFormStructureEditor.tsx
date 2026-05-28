"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfigTabPanel } from "@/features/form-field-management/ConfigTabPanel";
import type { FormField } from "@/redux/types/formField";
import type { FormFieldGroup } from "@/redux/types/formFieldGroup";
import type { UserFormConfigGrouped } from "@/redux/types/formField";
import { flattenFormFields } from "@/redux/types/formField";
import { DiagnosisGroupModal } from "./DiagnosisGroupModal";
import { DiagnosisFieldModal } from "./DiagnosisFieldModal";
import { DynamicUserFormFields } from "@/components/dynamic-form/DynamicUserFormFields";

export type DiagnosisStructureScope =
  | { type: "template"; templateId: string }
  | { type: "config"; configId: string };

type StructureHandlers = {
  grouped?: UserFormConfigGrouped;
  refetch: () => void;
  onDeleteGroup: (groupId: string) => Promise<void>;
  onReorderGroups: (ids: string[]) => Promise<void>;
  onDeleteField: (fieldId: string) => Promise<void>;
  onReorderFields: (ids: string[]) => Promise<void>;
};

type Props = {
  scope: DiagnosisStructureScope;
  handlers: StructureHandlers;
  readOnly?: boolean;
  showPreview?: boolean;
};

export function DiagnosisFormStructureEditor({
  scope,
  handlers,
  readOnly = false,
  showPreview = false,
}: Props) {
  const [tab, setTab] = useState<"structure" | "preview">("structure");
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [fieldModalOpen, setFieldModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<FormFieldGroup | null>(null);
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [previewValues, setPreviewValues] = useState<Record<string, unknown>>({});

  const groups = handlers.grouped?.groups ?? [];
  const fields = useMemo(() => flattenFormFields(handlers.grouped), [handlers.grouped]);

  const scopeId = scope.type === "template" ? scope.templateId : scope.configId;

  return (
    <div className="space-y-4">
      {showPreview && (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={tab === "structure" ? "default" : "outline"}
            onClick={() => setTab("structure")}
          >
            Structure
          </Button>
          <Button
            size="sm"
            variant={tab === "preview" ? "default" : "outline"}
            onClick={() => setTab("preview")}
          >
            Preview
          </Button>
        </div>
      )}

      {tab === "preview" && handlers.grouped ? (
        <ConfigTabPanel>
          <DynamicUserFormFields
            grouped={handlers.grouped}
            values={previewValues}
            onChange={(key, value) =>
              setPreviewValues((prev) => ({ ...prev, [key]: value }))
            }
          />
        </ConfigTabPanel>
      ) : (
        <>
          {!readOnly && (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => {
                  setEditingGroup(null);
                  setGroupModalOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add section
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditingField(null);
                  setFieldModalOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add field
              </Button>
            </div>
          )}

          <ConfigTabPanel>
            <div className="space-y-2">
              {groups.map((g, idx) => (
                <div
                  key={g.group_id}
                  className="flex items-center justify-between rounded-lg border px-4 py-3"
                >
                  <div>
                    <p className="font-medium">{g.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {g.fields?.length ?? 0} fields · order {g.sort_order}
                    </p>
                  </div>
                  {!readOnly && (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingGroup(g);
                          setGroupModalOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={idx === 0}
                        onClick={async () => {
                          const ids = groups.map((x) => x.group_id);
                          [ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]];
                          await handlers.onReorderGroups(ids);
                          handlers.refetch();
                        }}
                      >
                        ↑
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={idx === groups.length - 1}
                        onClick={async () => {
                          const ids = groups.map((x) => x.group_id);
                          [ids[idx], ids[idx + 1]] = [ids[idx + 1], ids[idx]];
                          await handlers.onReorderGroups(ids);
                          handlers.refetch();
                        }}
                      >
                        ↓
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={async () => {
                          await handlers.onDeleteGroup(g.group_id);
                          handlers.refetch();
                        }}
                      >
                        Del
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ConfigTabPanel>

          <ConfigTabPanel>
            <div className="space-y-2">
              {fields.map((f, idx) => (
                <div
                  key={f.field_id}
                  className="flex items-center justify-between rounded-lg border px-4 py-3"
                >
                  <div>
                    <p className="font-medium">{f.label}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {f.field_key} · {f.field_type}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {f.is_required && <Badge>Required</Badge>}
                    {!readOnly && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingField(f);
                            setFieldModalOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={idx === 0}
                          onClick={async () => {
                            const ids = fields.map((x) => x.field_id);
                            [ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]];
                            await handlers.onReorderFields(ids);
                            handlers.refetch();
                          }}
                        >
                          ↑
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={idx === fields.length - 1}
                          onClick={async () => {
                            const ids = fields.map((x) => x.field_id);
                            [ids[idx], ids[idx + 1]] = [ids[idx + 1], ids[idx]];
                            await handlers.onReorderFields(ids);
                            handlers.refetch();
                          }}
                        >
                          ↓
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={async () => {
                            await handlers.onDeleteField(f.field_id);
                            handlers.refetch();
                          }}
                        >
                          Del
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ConfigTabPanel>
        </>
      )}

      {!readOnly && (
        <>
          <DiagnosisGroupModal
            scope={scope}
            open={groupModalOpen}
            group={editingGroup}
            onClose={() => setGroupModalOpen(false)}
            onSaved={() => {
              handlers.refetch();
              setGroupModalOpen(false);
            }}
          />
          <DiagnosisFieldModal
            scope={scope}
            groups={groups}
            open={fieldModalOpen}
            field={editingField}
            onClose={() => setFieldModalOpen(false)}
            onSaved={() => {
              handlers.refetch();
              setFieldModalOpen(false);
            }}
          />
        </>
      )}
    </div>
  );
}
