"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { actionFeedback } from "@/components/action-feedback";
import {
  useCreateIssueCategoryMutation,
  useGetIssueCategoriesQuery,
  useUpdateIssueCategoryMutation,
} from "@/redux/api/issueApi";
import { IssueCategory } from "@/redux/types/issue";
import { getTopLevelCategories } from "../utils/issueFormConfig";

const NONE_PARENT = "__none__";

const formSchema = z.object({
  parent_category_id: z.string().optional(),
  code: z.string().max(80).optional(),
  name: z.string().min(2, "Name is required").max(150),
  description: z.string().max(2000).optional(),
  form_config_json: z.string().optional(),
  display_order: z.coerce.number().int().min(0).optional(),
  is_selectable: z.boolean(),
  is_active: z.boolean(),
});

interface CreateIssueCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  category?: IssueCategory | null;
}

export function CreateIssueCategoryModal({
  isOpen,
  onClose,
  category,
}: CreateIssueCategoryModalProps) {
  const isEditMode = Boolean(category);
  const [createCategory, { isLoading: isCreating }] = useCreateIssueCategoryMutation();
  const [updateCategory, { isLoading: isUpdating }] = useUpdateIssueCategoryMutation();
  const { data: categories = [] } = useGetIssueCategoriesQuery({});
  const [formConfigError, setFormConfigError] = useState<string | null>(null);

  const topCategories = useMemo(() => getTopLevelCategories(categories), [categories]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: createFormResolver<z.infer<typeof formSchema>>(formSchema),
    defaultValues: {
      parent_category_id: "",
      code: "",
      name: "",
      description: "",
      form_config_json: "{}",
      display_order: 0,
      is_selectable: true,
      is_active: true,
    },
  });

  useEffect(() => {
    if (category) {
      form.reset({
        parent_category_id: category.parent_category_id || NONE_PARENT,
        code: category.code || "",
        name: category.name,
        description: category.description || "",
        form_config_json: JSON.stringify(category.form_config ?? {}, null, 2),
        display_order: category.display_order,
        is_selectable: category.is_selectable !== false,
        is_active: category.is_active,
      });
    } else {
      form.reset({
        parent_category_id: NONE_PARENT,
        code: "",
        name: "",
        description: "",
        form_config_json: JSON.stringify({ fields: [], standardFields: {} }, null, 2),
        display_order: 0,
        is_selectable: true,
        is_active: true,
      });
    }
    setFormConfigError(null);
  }, [category, isOpen, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    let formConfig = {};
    if (values.form_config_json?.trim()) {
      try {
        formConfig = JSON.parse(values.form_config_json);
      } catch {
        setFormConfigError("Form config must be valid JSON");
        return;
      }
    }
    setFormConfigError(null);

    const payload = {
      parent_category_id:
        values.parent_category_id && values.parent_category_id !== NONE_PARENT
          ? values.parent_category_id
          : null,
      code: values.code?.trim() || null,
      name: values.name,
      description: values.description,
      form_config: formConfig,
      display_order: values.display_order,
      is_selectable: values.is_selectable,
      is_active: values.is_active,
    };

    try {
      if (isEditMode && category) {
        await updateCategory({
          id: category.issue_category_id,
          data: payload,
        }).unwrap();
        actionFeedback.success("Category updated");
      } else {
        await createCategory(payload).unwrap();
        actionFeedback.success("Category created");
      }
      onClose();
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      actionFeedback.error(error.data?.message || "Failed to save category");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit Issue Category" : "Add Issue Category"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="parent_category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Top-Level Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || NONE_PARENT}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="None (top-level grouping)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NONE_PARENT}>None (top-level grouping)</SelectItem>
                      {topCategories
                        .filter((c) => c.issue_category_id !== category?.issue_category_id)
                        .map((cat) => (
                          <SelectItem key={cat.issue_category_id} value={cat.issue_category_id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Request New KPI" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. add_kpi" {...field} />
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
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder="Category description" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="form_config_json"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Form Configuration (JSON)</FormLabel>
                  <FormControl>
                    <Textarea rows={8} className="font-mono text-xs" {...field} />
                  </FormControl>
                  {formConfigError ? (
                    <p className="text-sm text-red-600">{formConfigError}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Define dynamic fields and standard field visibility for this issue type.
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="display_order"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Order</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_selectable"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <FormLabel className="mb-0">Selectable in Issue Form</FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Turn off for top-level grouping categories only.
                    </p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <FormLabel className="mb-0">Active</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating || isUpdating}>
                {isEditMode ? "Save Changes" : "Create Category"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
