"use client";

import { useEffect } from "react";
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
  useGetPublishedContainersByCategoryQuery,
  useGetPublishedFormByContainerQuery,
} from "@/redux/api/formConfigApi";
import { ISSUE_ENTITY_TYPE_LABELS, IssueEntityType } from "@/redux/types/issue";
import { DynamicIssueFormFields } from "../components/DynamicIssueFormFields";

const entityTypes = Object.keys(ISSUE_ENTITY_TYPE_LABELS) as IssueEntityType[];

const formSchema = z.object({
  issue_category_id: z.string().uuid("Select an issue category"),
  form_config_container_id: z.string().uuid("Select a form container"),
  issue_priority_id: z.string().uuid("Select a priority"),
  title: z.string().min(3, "Title is required").max(255),
  entity_type: z.enum(entityTypes as [IssueEntityType, ...IssueEntityType[]]),
  entity_id: z.string().uuid("Entity ID must be a valid UUID"),
  description: z.string().min(3, "Description is required"),
  justification: z.string().min(3, "Justification is required"),
  form_responses: z.record(z.string(), z.unknown()),
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
  const { data: categories = [] } = useGetIssueCategoriesQuery({ for_raising: true });
  const { data: priorities = [] } = useGetIssuePrioritiesQuery();

  const form = useForm<FormValues>({
    resolver: createFormResolver<FormValues>(formSchema),
    defaultValues: {
      issue_category_id: "",
      form_config_container_id: "",
      issue_priority_id: "",
      title: "",
      entity_type: defaultEntityType || "objective",
      entity_id: defaultEntityId || "",
      description: "",
      justification: "",
      form_responses: {},
    },
  });

  const selectedCategoryId = form.watch("issue_category_id");
  const selectedContainerId = form.watch("form_config_container_id");

  const { data: containers = [] } = useGetPublishedContainersByCategoryQuery(selectedCategoryId, {
    skip: !selectedCategoryId,
  });

  const { data: publishedFormData } = useGetPublishedFormByContainerQuery(selectedContainerId, {
    skip: !selectedContainerId,
  });

  const dynamicFields = publishedFormData?.fields ?? [];
  const selectedCategory = categories.find((c) => c.issue_category_id === selectedCategoryId);
  const selectedContainer = containers.find(
    (c) => c.form_config_container_id === selectedContainerId
  );

  useEffect(() => {
    if (isOpen) {
      form.reset({
        issue_category_id: "",
        form_config_container_id: "",
        issue_priority_id: priorities[0]?.issue_priority_id || "",
        title: "",
        entity_type: defaultEntityType || "objective",
        entity_id: defaultEntityId || "",
        description: "",
        justification: "",
        form_responses: {},
      });
    }
  }, [isOpen, defaultEntityType, defaultEntityId, priorities, form]);

  useEffect(() => {
    form.setValue("form_config_container_id", "");
    form.setValue("form_responses", {});
  }, [selectedCategoryId, form]);

  useEffect(() => {
    if (!publishedFormData?.fields?.length) {
      form.setValue("form_responses", {});
      return;
    }

    const nextResponses: Record<string, unknown> = {};
    for (const field of publishedFormData.fields) {
      if (field.default_value) {
        nextResponses[field.field_key] = field.default_value;
      } else if (field.field_type === "BOOLEAN") {
        nextResponses[field.field_key] = false;
      } else if (field.field_type === "MULTI_SELECT" || field.field_type === "CHECKBOX") {
        nextResponses[field.field_key] = [];
      } else {
        nextResponses[field.field_key] = "";
      }
    }
    form.setValue("form_responses", nextResponses);
  }, [publishedFormData, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      await createIssue({
        issue_category_id: values.issue_category_id,
        form_config_container_id: values.form_config_container_id,
        issue_priority_id: values.issue_priority_id,
        title: values.title,
        entity_type: values.entity_type,
        entity_id: values.entity_id,
        form_responses: values.form_responses,
        description: values.description,
        justification: values.justification,
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
                name="issue_category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Issue Category *</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.issue_category_id} value={cat.issue_category_id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedCategory?.description ? (
                      <p className="text-xs text-muted-foreground">{selectedCategory.description}</p>
                    ) : null}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="form_config_container_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Form Container *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={!selectedCategoryId || containers.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              !selectedCategoryId
                                ? "Select a category first"
                                : containers.length === 0
                                  ? "No published forms"
                                  : "Select form container"
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {containers.map((container) => (
                          <SelectItem
                            key={container.form_config_container_id}
                            value={container.form_config_container_id}
                          >
                            {container.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedContainer?.description ? (
                      <p className="text-xs text-muted-foreground">{selectedContainer.description}</p>
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
                        <SelectItem key={p.issue_priority_id} value={p.issue_priority_id}>
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

            <div className="grid grid-cols-2 gap-4">
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
                        {entityTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {ISSUE_ENTITY_TYPE_LABELS[type]}
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
            </div>

            {dynamicFields.length > 0 ? (
              <DynamicIssueFormFields control={form.control} fields={dynamicFields} />
            ) : selectedContainerId ? (
              <p className="text-sm text-muted-foreground border border-dashed rounded-md p-4 text-center">
                This form container has no active fields configured.
              </p>
            ) : null}

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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  isLoading ||
                  !selectedCategoryId ||
                  !selectedContainerId ||
                  dynamicFields.length === 0
                }
              >
                Submit Issue
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
