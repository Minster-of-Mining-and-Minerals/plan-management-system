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
  useCreateFormConfigContainerMutation,
  useUpdateFormConfigContainerMutation,
} from "@/redux/api/formConfigApi";
import { useGetIssueCategoriesQuery } from "@/redux/api/issueApi";
import { FormConfigContainer } from "@/redux/types/formConfig";

const formSchema = z.object({
  name: z.string().min(2).max(150),
  code: z.string().min(2).max(80),
  description: z.string().max(2000).optional(),
  issue_category_id: z.string().uuid("Issue category is required"),
  display_order: z.coerce.number().int().min(0).optional(),
});

interface CreateFormConfigContainerModalProps {
  isOpen: boolean;
  onClose: () => void;
  container?: FormConfigContainer | null;
}

export function CreateFormConfigContainerModal({
  isOpen,
  onClose,
  container,
}: CreateFormConfigContainerModalProps) {
  const isEdit = Boolean(container);
  const [createContainer, { isLoading: creating }] = useCreateFormConfigContainerMutation();
  const [updateContainer, { isLoading: updating }] = useUpdateFormConfigContainerMutation();
  const { data: categories = [] } = useGetIssueCategoriesQuery({ is_active: true });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: createFormResolver<z.infer<typeof formSchema>>(formSchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      issue_category_id: "",
      display_order: 0,
    },
  });

  useEffect(() => {
    if (container) {
      form.reset({
        name: container.name,
        code: container.code,
        description: container.description || "",
        issue_category_id: container.issue_category_id || "",
        display_order: container.display_order,
      });
    } else {
      form.reset({
        name: "",
        code: "",
        description: "",
        issue_category_id: "",
        display_order: 0,
      });
    }
  }, [container, isOpen, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const payload = {
      name: values.name,
      code: values.code,
      description: values.description,
      display_order: values.display_order,
      issue_category_id: values.issue_category_id,
    };

    try {
      if (isEdit && container) {
        await updateContainer({ id: container.form_config_container_id, data: payload }).unwrap();
        actionFeedback.success("Form container updated");
      } else {
        await createContainer(payload).unwrap();
        actionFeedback.success("Form container created");
      }
      onClose();
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      actionFeedback.error(error.data?.message || "Failed to save form container");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Form Container" : "Add Form Container"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="issue_category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Issue Category *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select issue category" />
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
                    <FormLabel>Container Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. KPI Correction Form" {...field} />
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
                      <Input placeholder="e.g. kpi_correction_form" {...field} />
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
                    <Textarea rows={2} placeholder="Describe this form container" {...field} />
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
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating || updating}>
                {isEdit ? "Save Changes" : "Create Container"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
