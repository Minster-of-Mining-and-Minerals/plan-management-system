"use client";

import { Badge } from "@/components/ui/badge";
import {
  ISSUE_ENTITY_TYPE_LABELS,
  IssueCategoryFormConfig,
  IssueEntityType,
} from "@/redux/types/issue";
import {
  ISSUE_STANDARD_FIELD_DEFINITIONS,
  normalizeFormConfig,
} from "../utils/issueFormConfig";

interface IssueCategoryFormConfigPreviewProps {
  formConfig?: IssueCategoryFormConfig | null;
}

export function IssueCategoryFormConfigPreview({
  formConfig,
}: IssueCategoryFormConfigPreviewProps) {
  const config = normalizeFormConfig(formConfig);
  const visibleStandardFields = ISSUE_STANDARD_FIELD_DEFINITIONS.filter((definition) => {
    const rule = config.standardFields[definition.key];
    return rule?.visible !== false;
  });

  return (
    <div className="space-y-4 rounded-lg border bg-muted/10 p-4">
      <div>
        <h3 className="text-sm font-semibold">Form Preview</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Read-only summary of the raise-issue form for this category.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Standard fields</p>
        {visibleStandardFields.length === 0 ? (
          <p className="text-sm text-muted-foreground">No standard fields visible.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {visibleStandardFields.map((definition) => {
              const rule = config.standardFields[definition.key];
              const required =
                rule?.required === true ||
                (rule?.required === undefined && definition.defaultRequired);
              return (
                <Badge key={definition.key} variant="outline">
                  {definition.label}
                  {required ? " *" : ""}
                </Badge>
              );
            })}
          </div>
        )}
        {config.standardFields.entity_type?.allowedTypes?.length ? (
          <p className="text-xs text-muted-foreground">
            Entity types:{" "}
            {config.standardFields.entity_type.allowedTypes
              .map((type) => ISSUE_ENTITY_TYPE_LABELS[type as IssueEntityType] ?? type)
              .join(", ")}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Custom fields</p>
        {config.fields.length === 0 ? (
          <p className="text-sm text-muted-foreground">No custom fields configured.</p>
        ) : (
          <ul className="space-y-2">
            {config.fields.map((field) => (
              <li
                key={field.key}
                className="rounded-md border bg-background px-3 py-2 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{field.label}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {field.type}
                  </Badge>
                  {field.required ? (
                    <Badge variant="outline" className="text-[10px]">
                      required
                    </Badge>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground font-mono mt-1">{field.key}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
