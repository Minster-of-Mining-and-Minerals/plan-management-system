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
            <div className="space-y-4">
              {groups.map((g, groupIdx) => {
                const sectionFields = [...(g.fields || [])].sort(
                  (a, b) => a.sort_order - b.sort_order
                );
                return (
                  <div key={g.group_id} className="rounded-xl border bg-card p-4 space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{g.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {sectionFields.length} fields · order {g.sort_order}
                        </p>
                      </div>
                      {!readOnly && (
                        <div className="flex flex-wrap gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingGroup(g);
                              setGroupModalOpen(true);
                            }}
                          >
                            Edit section
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={groupIdx === 0}
                            onClick={async () => {
                              const ids = groups.map((x) => x.group_id);
                              [ids[groupIdx - 1], ids[groupIdx]] = [ids[groupIdx], ids[groupIdx - 1]];
                              await handlers.onReorderGroups(ids);
                              handlers.refetch();
                            }}
                          >
                            ↑
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={groupIdx === groups.length - 1}
                            onClick={async () => {
                              const ids = groups.map((x) => x.group_id);
                              [ids[groupIdx], ids[groupIdx + 1]] = [ids[groupIdx + 1], ids[groupIdx]];
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
                            Delete
                          </Button>
                        </div>
                      )}
                    </div>

                    {sectionFields.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No fields in this section yet.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {sectionFields.map((f) => {
                          const fieldIndex = fields.findIndex((x) => x.field_id === f.field_id);
                          return (
                            <div
                              key={f.field_id}
                              className="rounded-lg border bg-background px-3 py-3 space-y-2"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="font-medium truncate">{f.label}</p>
                                  <p className="text-xs text-muted-foreground font-mono truncate">
                                    {f.field_key} · {f.field_type}
                                  </p>
                                </div>
                                {f.is_required && <Badge>Required</Badge>}
                              </div>
                              {!readOnly && (
                                <div className="flex flex-wrap gap-1">
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
                                    disabled={fieldIndex <= 0}
                                    onClick={async () => {
                                      const ids = fields.map((x) => x.field_id);
                                      [ids[fieldIndex - 1], ids[fieldIndex]] = [
                                        ids[fieldIndex],
                                        ids[fieldIndex - 1],
                                      ];
                                      await handlers.onReorderFields(ids);
                                      handlers.refetch();
                                    }}
                                  >
                                    ↑
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    disabled={
                                      fieldIndex < 0 || fieldIndex === fields.length - 1
                                    }
                                    onClick={async () => {
                                      const ids = fields.map((x) => x.field_id);
                                      [ids[fieldIndex], ids[fieldIndex + 1]] = [
                                        ids[fieldIndex + 1],
                                        ids[fieldIndex],
                                      ];
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
                                    Delete
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
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
