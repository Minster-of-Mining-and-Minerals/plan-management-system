"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FormField, FormFieldType, FormFieldStepGroup } from "@/redux/types/formField";
import type { ClinicalSuggestionCategory } from "@/redux/api/clinicalSuggestionApi";
import {
  useCreateDiagnosisFieldMutation,
  useUpdateDiagnosisFieldMutation,
} from "@/redux/api/diagnosisFormApi";
import {
  useCreateTemplateFieldMutation,
  useUpdateTemplateFieldMutation,
} from "@/redux/api/diagnosisTemplateApi";
import type { DiagnosisStructureScope } from "./DiagnosisFormStructureEditor";
import { FileUploadField } from "@/features/template/component/FileUploadField";
import { useListMedicalDiagramsQuery } from "@/redux/api/medicalDiagramApi";
import { toast } from "sonner";

const FIELD_TYPES: FormFieldType[] = [
  "input",
  "textarea",
  "number",
  "select",
  "checkbox",
  "radio",
  "date",
  "time",
  "file",
  "richtext",
  "switch",
  "canvas_annotation",
  "repeater",
];

type Props = {
  scope: DiagnosisStructureScope;
  groups: FormFieldStepGroup[];
  open: boolean;
  field?: FormField | null;
  onClose: () => void;
  onSaved: () => void;
};

export function DiagnosisFieldModal({
  scope,
  groups,
  open,
  field,
  onClose,
  onSaved,
}: Props) {
  const isEdit = Boolean(field);
  const [createConfigField, { isLoading: creatingConfig }] =
    useCreateDiagnosisFieldMutation();
  const [updateConfigField, { isLoading: updatingConfig }] =
    useUpdateDiagnosisFieldMutation();
  const [createTemplateField, { isLoading: creatingTemplate }] =
    useCreateTemplateFieldMutation();
  const [updateTemplateField, { isLoading: updatingTemplate }] =
    useUpdateTemplateFieldMutation();

  const [groupId, setGroupId] = useState("");
  const [fieldKey, setFieldKey] = useState("");
  const [label, setLabel] = useState("");
  const [fieldType, setFieldType] = useState<FormFieldType>("input");
  const [isRequired, setIsRequired] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [optionsText, setOptionsText] = useState("");
  const [placeholder, setPlaceholder] = useState("");
  const [fileMultiple, setFileMultiple] = useState(false);
  const [allowedTypesText, setAllowedTypesText] = useState("");
  const [fieldDescription, setFieldDescription] = useState("");
  const [canvasSourceType, setCanvasSourceType] = useState<"library" | "custom">("library");
  const [diagramId, setDiagramId] = useState("");
  const [customImageUrl, setCustomImageUrl] = useState("");
  const [clinicalSuggestions, setClinicalSuggestions] = useState(true);
  const [selectSearchable, setSelectSearchable] = useState(false);
  const [suggestionCategory, setSuggestionCategory] =
    useState<ClinicalSuggestionCategory>("general");

  const { data: libraryDiagrams = [] } = useListMedicalDiagramsQuery(undefined, {
    skip: fieldType !== "canvas_annotation",
  });
  const activeDiagrams = libraryDiagrams.filter((d) => d.status === "active");

  useEffect(() => {
    if (field) {
      setGroupId(field.group_id || "");
      setFieldKey(field.field_key);
      setLabel(field.label);
      setFieldType(field.field_type);
      setIsRequired(field.is_required);
      setIsVisible(field.is_visible);
      setOptionsText((field.config?.options || []).join("\n"));
      setPlaceholder(field.config?.placeholder || "");
      setFileMultiple(Boolean(field.config?.multiple));
      setAllowedTypesText((field.config?.allowed_types || []).join(", "));
      setFieldDescription(field.config?.description || "");
      setCanvasSourceType(field.config?.canvas_source_type || "library");
      setDiagramId(field.config?.diagram_id || "");
      setCustomImageUrl(field.config?.custom_image_url || "");
      setClinicalSuggestions(field.config?.clinical_suggestions !== false);
      setSelectSearchable(Boolean(field.config?.searchable));
      setSuggestionCategory(
        (field.config?.suggestion_category as ClinicalSuggestionCategory) ||
          "general"
      );
    } else {
      setGroupId(groups[0]?.group_id || "");
      setFieldKey("");
      setLabel("");
      setFieldType("input");
      setIsRequired(false);
      setIsVisible(true);
      setOptionsText("");
      setPlaceholder("");
      setFileMultiple(false);
      setAllowedTypesText("");
      setFieldDescription("");
      setCanvasSourceType("library");
      setDiagramId("");
      setCustomImageUrl("");
      setClinicalSuggestions(true);
      setSuggestionCategory("general");
    }
  }, [field, open, groups]);

  const needsOptions = ["select", "checkbox", "radio"].includes(fieldType);
  const supportsSuggestions = ["input", "textarea", "richtext"].includes(fieldType);

  const handleSubmit = async () => {
    const config: Record<string, unknown> = {};
    if (placeholder) config.placeholder = placeholder;
    if (needsOptions) {
      config.options = optionsText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    if (fieldType === "select") {
      config.multiple = false;
      config.searchable = selectSearchable;
    }
    if (fieldType === "file") {
      config.multiple = fileMultiple;
      const types = allowedTypesText
        .split(",")
        .map((s) => s.trim().replace(/^\./, ""))
        .filter(Boolean);
      if (types.length) config.allowed_types = types;
    }
    if (supportsSuggestions) {
      config.clinical_suggestions = clinicalSuggestions;
      if (clinicalSuggestions) {
        config.suggestion_category = suggestionCategory;
      }
    }
    if (fieldType === "canvas_annotation") {
      if (fieldDescription) config.description = fieldDescription;
      config.canvas_source_type = canvasSourceType;
      if (canvasSourceType === "library") {
        if (!diagramId) {
          toast.error("Select a diagram from the medical library");
          return;
        }
        config.diagram_id = diagramId;
        config.custom_image_url = undefined;
      } else {
        if (!customImageUrl) {
          toast.error("Upload a custom diagram image");
          return;
        }
        config.custom_image_url = customImageUrl;
        config.diagram_id = undefined;
      }
    }

    const body = {
      group_id: groupId,
      field_key: fieldKey,
      label,
      field_type: fieldType,
      is_required: isRequired,
      is_visible: isVisible,
      config,
    };

    try {
      if (scope.type === "template") {
        if (isEdit && field) {
          await updateTemplateField({
            templateId: scope.templateId,
            fieldId: field.field_id,
            body,
          }).unwrap();
        } else {
          await createTemplateField({
            templateId: scope.templateId,
            body,
          }).unwrap();
        }
      } else if (isEdit && field) {
        await updateConfigField({
          configId: scope.configId,
          fieldId: field.field_id,
          body,
        }).unwrap();
      } else {
        await createConfigField({
          configId: scope.configId,
          body,
        }).unwrap();
      }
      toast.success(isEdit ? "Field updated" : "Field created");
      onSaved();
    } catch {
      toast.error("Failed to save field");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit field" : "Add field"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Section</Label>
            <Select value={groupId} onValueChange={setGroupId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {groups.map((g) => (
                  <SelectItem key={g.group_id} value={g.group_id}>
                    {g.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Field key</Label>
            <Input
              value={fieldKey}
              disabled={isEdit}
              onChange={(e) => setFieldKey(e.target.value)}
              placeholder="e.g. blood_pressure"
            />
          </div>
          <div className="space-y-2">
            <Label>Label</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={fieldType}
              onValueChange={(v) => setFieldType(v as FormFieldType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {fieldType !== "canvas_annotation" && (
            <div className="space-y-2">
              <Label>Placeholder</Label>
              <Input value={placeholder} onChange={(e) => setPlaceholder(e.target.value)} />
            </div>
          )}
          {fieldType === "canvas_annotation" && (
            <>
              <div className="space-y-2">
                <Label>Field description</Label>
                <Textarea
                  value={fieldDescription}
                  onChange={(e) => setFieldDescription(e.target.value)}
                  placeholder="Instructions shown to practitioners above the canvas"
                />
              </div>
              <div className="space-y-2">
                <Label>Canvas source type</Label>
                <Select
                  value={canvasSourceType}
                  onValueChange={(v) => setCanvasSourceType(v as "library" | "custom")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="library">Medical library</SelectItem>
                    <SelectItem value="custom">Custom upload</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {canvasSourceType === "library" ? (
                <div className="space-y-2">
                  <Label>Library diagram</Label>
                  <Select value={diagramId} onValueChange={setDiagramId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select diagram…" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeDiagrams.map((d) => (
                        <SelectItem key={d.diagram_id} value={d.diagram_id}>
                          {d.name}
                          {d.category ? ` (${d.category})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {activeDiagrams.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No active diagrams. Add templates under Medical Diagrams in the menu.
                    </p>
                  )}
                </div>
              ) : (
                <FileUploadField
                  id="diagnosis-field-custom-diagram"
                  label="Custom diagram image"
                  value={customImageUrl}
                  onChange={(v) =>
                    setCustomImageUrl(Array.isArray(v) ? v[0] || "" : String(v ?? ""))
                  }
                  accept="image/*"
                  showPreview
                  valueFormat="fileUrls"
                />
              )}
            </>
          )}
          {needsOptions && (
            <div className="space-y-2">
              <Label>Options (one per line)</Label>
              <Textarea value={optionsText} onChange={(e) => setOptionsText(e.target.value)} />
            </div>
          )}
          {fieldType === "select" && (
            <div className="flex items-center justify-between">
              <div>
                <Label>Searchable dropdown</Label>
                <p className="text-xs text-muted-foreground">
                  Type to filter options — recommended for long lists (e.g. ICD-10).
                </p>
              </div>
              <Switch checked={selectSearchable} onCheckedChange={setSelectSearchable} />
            </div>
          )}
          {fieldType === "file" && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Allow multiple files</Label>
                  <p className="text-xs text-muted-foreground">
                    When enabled, users can upload more than one file in this field.
                  </p>
                </div>
                <Switch checked={fileMultiple} onCheckedChange={setFileMultiple} />
              </div>
              <div className="space-y-2">
                <Label>Allowed file types</Label>
                <Input
                  value={allowedTypesText}
                  onChange={(e) => setAllowedTypesText(e.target.value)}
                  placeholder="jpg, png, pdf"
                />
                <p className="text-xs text-muted-foreground">
                  Comma-separated extensions (without dots).
                </p>
              </div>
            </>
          )}
          {supportsSuggestions && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Clinical suggestions</Label>
                  <p className="text-xs text-muted-foreground">
                    Enable smart autocomplete while staff type in this field.
                  </p>
                </div>
                <Switch
                  checked={clinicalSuggestions}
                  onCheckedChange={setClinicalSuggestions}
                />
              </div>
              {clinicalSuggestions && (
                <div className="space-y-2">
                  <Label>Suggestion category</Label>
                  <Select
                    value={suggestionCategory}
                    onValueChange={(v) =>
                      setSuggestionCategory(v as ClinicalSuggestionCategory)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(
                        [
                          "diagnosis",
                          "assessment",
                          "plan",
                          "prescription",
                          "referral",
                          "procedure",
                          "certificate",
                          "general",
                        ] as ClinicalSuggestionCategory[]
                      ).map((c) => (
                        <SelectItem key={c} value={c} className="capitalize">
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}
          <div className="flex items-center justify-between">
            <Label>Required</Label>
            <Switch checked={isRequired} onCheckedChange={setIsRequired} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Visible</Label>
            <Switch checked={isVisible} onCheckedChange={setIsVisible} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={
              creatingConfig ||
              updatingConfig ||
              creatingTemplate ||
              updatingTemplate ||
              !groupId ||
              !fieldKey ||
              !label
            }
            onClick={handleSubmit}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
