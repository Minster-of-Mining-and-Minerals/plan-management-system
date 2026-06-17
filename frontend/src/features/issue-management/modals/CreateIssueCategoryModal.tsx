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
import { Switch } from "@/components/ui/switch";
import { actionFeedback } from "@/components/action-feedback";
import {
  useCreateIssueCategoryMutation,
  useUpdateIssueCategoryMutation,
} from "@/redux/api/issueApi";
import { IssueCategory } from "@/redux/types/issue";

const formSchema = z.object({
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
      name: "",
      description: "",
      display_order: 0,
      is_active: true,
    },
  });

  useEffect(() => {
    if (category) {
      form.reset({
        name: category.name,
        description: category.description || "",
        display_order: category.display_order,
        is_active: category.is_active,
      });
    } else {
      form.reset({
        name: "",
        description: "",
        display_order: 0,
        is_active: true,
      });
    }
  }, [category, isOpen, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      if (isEditMode && category) {
        await updateCategory({
          id: category.issue_category_id,
          data: values,
        }).unwrap();
        actionFeedback.success("Category updated");
      } else {
        await createCategory(values).unwrap();
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
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit Issue Category" : "Add Issue Category"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. KPI Issue" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="Category description" {...field} />
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
