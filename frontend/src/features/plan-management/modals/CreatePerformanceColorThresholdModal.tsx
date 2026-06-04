"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ColorPickerField } from "@/components/ui/color-picker-field";
import {
  useCreatePerformanceColorThresholdMutation,
  useUpdatePerformanceColorThresholdMutation,
} from "@/redux/api/performanceColorThresholdApi";
import { PerformanceColorThreshold } from "@/redux/types/performanceColorThreshold";

const formSchema = z
  .object({
    label: z.string().min(1, "Label is required").max(100),
    min_percentage: z.coerce.number().int().min(0).max(100),
    max_percentage: z.coerce.number().int().min(0).max(100),
    color_hex: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, "Enter a valid hex color (e.g. #DC2626)"),
    sort_order: z.coerce.number().int().min(0).optional(),
    is_active: z.boolean(),
  })
  .refine((data) => data.max_percentage >= data.min_percentage, {
    message: "Maximum must be greater than or equal to minimum",
    path: ["max_percentage"],
  });

interface CreatePerformanceColorThresholdModalProps {
  isOpen: boolean;
  onClose: () => void;
  threshold?: PerformanceColorThreshold | null;
}

export function CreatePerformanceColorThresholdModal({
  isOpen,
  onClose,
  threshold,
}: CreatePerformanceColorThresholdModalProps) {
  const isEditMode = Boolean(threshold);
  const [createThreshold, { isLoading: isCreating }] =
    useCreatePerformanceColorThresholdMutation();
  const [updateThreshold, { isLoading: isUpdating }] =
    useUpdatePerformanceColorThresholdMutation();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      label: "",
      min_percentage: 0,
      max_percentage: 100,
      color_hex: "#22C55E",
      sort_order: 0,
      is_active: true,
    },
  });

  useEffect(() => {
    if (threshold) {
      form.reset({
        label: threshold.label,
        min_percentage: threshold.min_percentage,
        max_percentage: threshold.max_percentage,
        color_hex: threshold.color_hex,
        sort_order: threshold.sort_order,
        is_active: threshold.is_active,
      });
    } else {
      form.reset({
        label: "",
        min_percentage: 0,
        max_percentage: 100,
        color_hex: "#22C55E",
        sort_order: 0,
        is_active: true,
      });
    }
  }, [threshold, isOpen, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      if (isEditMode && threshold) {
        await updateThreshold({
          id: threshold.performance_color_threshold_id,
          data: {
            ...values,
            color_hex: values.color_hex.toUpperCase(),
          },
        }).unwrap();
        toast.success("Performance threshold updated");
      } else {
        await createThreshold({
          ...values,
          color_hex: values.color_hex.toUpperCase(),
          sort_order: values.sort_order ?? values.min_percentage,
        }).unwrap();
        toast.success("Performance threshold created");
      }
      onClose();
    } catch (err: unknown) {
      const error = err as { data?: { message?: string; error?: string } };
      toast.error(error.data?.message || error.data?.error || "Failed to save threshold");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit Performance Threshold" : "Add Performance Threshold"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Label</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Good" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="min_percentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum %</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} max={100} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="max_percentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maximum %</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} max={100} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="color_hex"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <FormControl>
                    <ColorPickerField value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sort_order"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sort Order</FormLabel>
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
                {isEditMode ? "Save Changes" : "Create Threshold"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
