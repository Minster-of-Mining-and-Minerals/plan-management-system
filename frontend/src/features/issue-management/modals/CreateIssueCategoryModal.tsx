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
import { IssueCategoryFormConfigPreview } from "../components/IssueCategoryFormConfigPreview";
import { PermissionGuard } from "@/utils/PermissionGuard";
import { ISSUE_CATEGORY_PERMISSIONS } from "@/utils/issuePermissionUtils";
import { usePermissions } from "@/hooks/usePermissions";

const NONE_PARENT = "__none__";

const formSchema = z.object({
  parent_category_id: z.string().optional(),
  code: z.string().max(80).optional(),
  name: z.string().min(2, "Name is required").max(150),
  description: z.string().max(2000).optional(),
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
  const { can } = usePermissions();
  const canConfigureForm = can(ISSUE_CATEGORY_PERMISSIONS.CONFIGURE_FORM);
  const [createCategory, { isLoading: isCreating }] = useCreateIssueCategoryMutation();
  const [updateCategory, { isLoading: isUpdating }] = useUpdateIssueCategoryMutation();
  const { data: categories = [] } = useGetIssueCategoriesQuery({});

  const topCategories = useMemo(() => getTopLevelCategories(categories), [categories]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: createFormResolver<z.infer<typeof formSchema>>(formSchema),
    defaultValues: {
      parent_category_id: NONE_PARENT,
      code: "",
      name: "",
      description: "",
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
        display_order: 0,
        is_selectable: true,
        is_active: true,
      });
    }
  }, [category, isOpen, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const payload = {
      parent_category_id:
        values.parent_category_id && values.parent_category_id !== NONE_PARENT
          ? values.parent_category_id
          : null,
      code: values.code?.trim() || null,
      name: values.name,
      description: values.description,
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
        actionFeedback.success(
          canConfigureForm
            ? "Category created. Use Configure Form to design its raise-issue fields."
            : "Category created"
        );
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

            {isEditMode && category?.is_selectable !== false ? (
              <PermissionGuard
                requireAll={[ISSUE_CATEGORY_PERMISSIONS.CONFIGURE_FORM]}
                fallback={
                  category ? (
                    <IssueCategoryFormConfigPreview formConfig={category.form_config} />
                  ) : null
                }
              >
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  Form fields for this category are managed separately using the{" "}
                  <span className="font-medium text-foreground">Configure Form</span> action.
                </div>
              </PermissionGuard>
            ) : null}

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
              <PermissionGuard
                requireAny={[
                  ISSUE_CATEGORY_PERMISSIONS.CREATE,
                  ISSUE_CATEGORY_PERMISSIONS.UPDATE,
                ]}
              >
                <Button type="submit" disabled={isCreating || isUpdating}>
                  {isEditMode ? "Save Changes" : "Create Category"}
                </Button>
              </PermissionGuard>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
