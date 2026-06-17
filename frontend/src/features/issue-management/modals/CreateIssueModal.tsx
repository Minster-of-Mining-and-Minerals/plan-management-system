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
  ISSUE_ENTITY_TYPE_LABELS,
  IssueEntityType,
} from "@/redux/types/issue";

const entityTypes = Object.keys(ISSUE_ENTITY_TYPE_LABELS) as IssueEntityType[];

const formSchema = z.object({
  issue_category_id: z.string().uuid("Select a category"),
  issue_priority_id: z.string().uuid("Select a priority"),
  title: z.string().min(3, "Title is required").max(255),
  entity_type: z.enum(entityTypes as [IssueEntityType, ...IssueEntityType[]]),
  entity_id: z.string().uuid("Entity ID must be a valid UUID"),
  current_value: z.string().optional(),
  suggested_value: z.string().optional(),
  description: z.string().min(3, "Description is required"),
  justification: z.string().min(3, "Justification is required"),
  attachment_path: z.string().max(500).optional(),
});

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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: createFormResolver<z.infer<typeof formSchema>>(formSchema),
    defaultValues: {
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
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
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
      });
    }
  }, [isOpen, defaultEntityType, defaultEntityId, priorities, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      await createIssue({
        ...values,
        current_value: values.current_value || undefined,
        suggested_value: values.suggested_value || undefined,
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
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
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
                    <FormLabel>Category *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((cat) => (
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
                name="issue_priority_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
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
            </div>

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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="current_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Value</FormLabel>
                    <FormControl>
                      <Textarea rows={2} placeholder="Current state" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="suggested_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Suggested Value</FormLabel>
                    <FormControl>
                      <Textarea rows={2} placeholder="Proposed change" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
              <Button type="submit" disabled={isLoading}>
                Submit Issue
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
