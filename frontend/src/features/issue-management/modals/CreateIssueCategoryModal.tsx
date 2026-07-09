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
import { DIALOG_SIMPLE_SCROLL } from "@/lib/dialogLayout";
import { cn } from "@/lib/utils";
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
import { actionFeedback } from "@/components/action-feedback";
import {
  useCreateIssueCategoryMutation,
  useUpdateIssueCategoryMutation,
} from "@/redux/api/issueApi";
import { IssueCategory } from "@/redux/types/issue";
import { PermissionGuard } from "@/utils/PermissionGuard";
import { ISSUE_CATEGORY_PERMISSIONS } from "@/utils/issuePermissionUtils";

const formSchema = z.object({
  code: z.string().max(80).optional(),
  name: z.string().min(2, "Name is required").max(150),
  description: z.string().max(2000).optional(),
  display_order: z.coerce.number().int().min(0).optional(),
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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: createFormResolver<z.infer<typeof formSchema>>(formSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      display_order: 0,
      is_active: true,
    },
  });

  useEffect(() => {
    if (category) {
      form.reset({
        code: category.code || "",
        name: category.name,
        description: category.description || "",
        display_order: category.display_order,
        is_active: category.is_active,
      });
    } else {
      form.reset({
        code: "",
        name: "",
        description: "",
        display_order: 0,
        is_active: true,
      });
    }
  }, [category, isOpen, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const payload = {
      code: values.code?.trim() || null,
      name: values.name,
      description: values.description,
      display_order: values.display_order,
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
        actionFeedback.success("Category created. Add form containers under Form Configuration.");
      }
      onClose();
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      actionFeedback.error(error.data?.message || "Failed to save category");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(DIALOG_SIMPLE_SCROLL, "sm:max-w-[560px]")}>
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Issue Category" : "Add Issue Category"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Target Correction" {...field} />
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
                      <Input placeholder="e.g. target_correction" {...field} />
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
                requireAny={[ISSUE_CATEGORY_PERMISSIONS.CREATE, ISSUE_CATEGORY_PERMISSIONS.UPDATE]}
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
