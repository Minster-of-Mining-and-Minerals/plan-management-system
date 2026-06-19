"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { createFormResolver } from "@/lib/zod-form";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { actionFeedback } from "@/components/action-feedback";
import {
  useCreateIssueMutation,
  useGetIssueCategoriesQuery,
  useGetIssuePrioritiesQuery,
} from "@/redux/api/issueApi";
import {
  ISSUE_ENTITY_TYPE_LABELS,
  IssueEntityType,
} from "@/redux/types/issue";
import { IssueCategoryFormFields } from "../components/IssueCategoryFormFields";
import {
  getAllowedEntityTypes,
  getSubCategories,
  getTopLevelCategories,
  isStandardFieldRequired,
  isStandardFieldVisible,
  validateDynamicFormData,
} from "../utils/issueFormConfig";

const entityTypes = Object.keys(ISSUE_ENTITY_TYPE_LABELS) as IssueEntityType[];

const formSchema = z.object({
  top_category_id: z.string().uuid("Select a top-level category"),
  issue_category_id: z.string().uuid("Select an issue type"),
  issue_priority_id: z.string().uuid("Select a priority"),
  title: z.string().min(3, "Title is required").max(255),
  entity_type: z.enum(entityTypes as [IssueEntityType, ...IssueEntityType[]]),
  entity_id: z.string().uuid("Entity ID must be a valid UUID"),
  current_value: z.string().optional(),
  suggested_value: z.string().optional(),
  description: z.string().min(3, "Description is required"),
  justification: z.string().min(3, "Justification is required"),
  attachment_path: z.string().max(500).optional(),
  form_data: z.record(z.string()).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEntityType?: IssueEntityType;
  defaultEntityId?: string;
  lockEntityFields?: boolean;
}

export function CreateIssueModal({
  isOpen,
  onClose,
  defaultEntityType,
  defaultEntityId,
  lockEntityFields = false,
}: CreateIssueModalProps) {
  const [createIssue, { isLoading }] = useCreateIssueMutation();
  const { data: categories = [] } = useGetIssueCategoriesQuery({ is_active: true });
  const { data: priorities = [] } = useGetIssuePrioritiesQuery();

  const form = useForm<FormValues>({
    resolver: createFormResolver<FormValues>(formSchema),
    defaultValues: {
      top_category_id: "",
      issue_category_id: "",
      issue_priority_id: "",
      title: "",
      entity_type: defaultEntityType || "objective",
      entity_id: defaultEntityId || "",
      current_value: "",
      suggested_value: "",
      description: "",
      justification: "",
      attachment_path: "",
      form_data: {},
    },
  });

  const topCategoryId = form.watch("top_category_id");
  const selectedCategoryId = form.watch("issue_category_id");

  const topCategories = useMemo(() => getTopLevelCategories(categories), [categories]);
  const subCategories = useMemo(
    () => (topCategoryId ? getSubCategories(categories, topCategoryId) : []),
    [categories, topCategoryId]
  );
  const selectedCategory = useMemo(
    () => categories.find((c) => c.issue_category_id === selectedCategoryId),
    [categories, selectedCategoryId]
  );
  const formConfig = selectedCategory?.form_config ?? null;
  const allowedEntityTypes = useMemo(
    () =>
      getAllowedEntityTypes(formConfig, entityTypes).filter(
        (type): type is IssueEntityType => type in ISSUE_ENTITY_TYPE_LABELS
      ),
    [formConfig]
  );

  useEffect(() => {
    if (isOpen) {
      form.reset({
        top_category_id: "",
        issue_category_id: "",
        issue_priority_id: priorities[0]?.issue_priority_id || "",
        title: "",
        entity_type: defaultEntityType || "objective",
        entity_id: defaultEntityId || "",
        current_value: "",
        suggested_value: "",
        description: "",
        justification: "",
        attachment_path: "",
        form_data: {},
      });
    }
  }, [isOpen, defaultEntityType, defaultEntityId, priorities, form]);

  useEffect(() => {
    if (!selectedCategory) return;
    const nextFormData: Record<string, string> = {};
    for (const field of selectedCategory.form_config?.fields ?? []) {
      nextFormData[field.key] = "";
    }
    form.setValue("form_data", nextFormData);

    const currentEntityType = form.getValues("entity_type");
    if (
      allowedEntityTypes.length &&
      !allowedEntityTypes.includes(currentEntityType)
    ) {
      form.setValue(
        "entity_type",
        (allowedEntityTypes[0] as IssueEntityType) || defaultEntityType || "objective"
      );
    }
  }, [selectedCategory, allowedEntityTypes, defaultEntityType, form]);

  const onSubmit = async (values: FormValues) => {
    const dynamicError = validateDynamicFormData(formConfig, values.form_data);
    if (dynamicError) {
      actionFeedback.error(dynamicError);
      return;
    }

    if (
      isStandardFieldRequired(formConfig, "current_value") &&
      !values.current_value?.trim()
    ) {
      actionFeedback.error("Current value is required for this issue type");
      return;
    }

    if (
      isStandardFieldRequired(formConfig, "suggested_value") &&
      !values.suggested_value?.trim()
    ) {
      actionFeedback.error("Suggested value is required for this issue type");
      return;
    }

    try {
      await createIssue({
        issue_category_id: values.issue_category_id,
        issue_priority_id: values.issue_priority_id,
        title: values.title,
        entity_type: values.entity_type,
        entity_id: values.entity_id,
        current_value: values.current_value || undefined,
        suggested_value: values.suggested_value || undefined,
        form_data: values.form_data,
        description: values.description,
        justification: values.justification,
        attachment_path: values.attachment_path || undefined,
      }).unwrap();
      actionFeedback.success("Issue submitted");
      onClose();
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      actionFeedback.error(error.data?.message || "Failed to create issue");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Raise Issue</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="top_category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Issue Area *</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        form.setValue("issue_category_id", "");
                        form.setValue("form_data", {});
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select issue area" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {topCategories.map((cat) => (
                          <SelectItem
                            key={cat.issue_category_id}
                            value={cat.issue_category_id}
                          >
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="issue_category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Issue Type *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={!topCategoryId}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select issue type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {subCategories.map((cat) => (
                          <SelectItem
                            key={cat.issue_category_id}
                            value={cat.issue_category_id}
                          >
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedCategory?.description ? (
                      <p className="text-xs text-muted-foreground">
                        {selectedCategory.description}
                      </p>
                    ) : null}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="issue_priority_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="max-w-xs">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {priorities.map((p) => (
                        <SelectItem
                          key={p.issue_priority_id}
                          value={p.issue_priority_id}
                        >
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input placeholder="Brief issue title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isStandardFieldVisible(formConfig, "entity_type") ||
            isStandardFieldVisible(formConfig, "entity_id") ? (
              <div className="grid grid-cols-2 gap-4">
                {isStandardFieldVisible(formConfig, "entity_type") ? (
                  <FormField
                    control={form.control}
                    name="entity_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Affected Entity Type *</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={lockEntityFields}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Entity type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {allowedEntityTypes.map((type) => (
                              <SelectItem key={type} value={type}>
                                {ISSUE_ENTITY_TYPE_LABELS[type as IssueEntityType]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : null}

                {isStandardFieldVisible(formConfig, "entity_id") ? (
                  <FormField
                    control={form.control}
                    name="entity_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Affected Entity ID *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="UUID of affected entity"
                            {...field}
                            disabled={lockEntityFields}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : null}
              </div>
            ) : null}

            {isStandardFieldVisible(formConfig, "current_value") ||
            isStandardFieldVisible(formConfig, "suggested_value") ? (
              <div className="grid grid-cols-2 gap-4">
                {isStandardFieldVisible(formConfig, "current_value") ? (
                  <FormField
                    control={form.control}
                    name="current_value"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Current Value
                          {isStandardFieldRequired(formConfig, "current_value") ? " *" : ""}
                        </FormLabel>
                        <FormControl>
                          <Textarea rows={2} placeholder="Current state" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : null}

                {isStandardFieldVisible(formConfig, "suggested_value") ? (
                  <FormField
                    control={form.control}
                    name="suggested_value"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Suggested Value
                          {isStandardFieldRequired(formConfig, "suggested_value") ? " *" : ""}
                        </FormLabel>
                        <FormControl>
                          <Textarea rows={2} placeholder="Proposed change" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : null}
              </div>
            ) : null}

            <IssueCategoryFormFields
              control={form.control}
              fields={formConfig?.fields ?? []}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description *</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="Describe the issue" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="justification"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Justification *</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="Why this change is needed" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="attachment_path"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Attachment Path (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Path or URL to attachment" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || !selectedCategoryId}>
                Submit Issue
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
