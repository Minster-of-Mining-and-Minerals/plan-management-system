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
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { actionFeedback } from "@/components/action-feedback";
import { ColorPickerField } from "@/components/ui/color-picker-field";
import {
  useCreateRegionalPerformanceColorThresholdMutation,
  useUpdateRegionalPerformanceColorThresholdMutation,
} from "@/redux/api/regionalPlanApi";
import type { RegionalPerformanceColorThreshold } from "@/redux/types/regionalPlan";

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

interface CreateRegionalPerformanceColorThresholdModalProps {
  isOpen: boolean;
  onClose: () => void;
  regionId: string;
  threshold?: RegionalPerformanceColorThreshold | null;
  onSuccess?: () => void;
}

export function CreateRegionalPerformanceColorThresholdModal({
  isOpen,
  onClose,
  regionId,
  threshold,
  onSuccess,
}: CreateRegionalPerformanceColorThresholdModalProps) {
  const isEditMode = Boolean(threshold);
  const [createThreshold, { isLoading: isCreating }] =
    useCreateRegionalPerformanceColorThresholdMutation();
  const [updateThreshold, { isLoading: isUpdating }] =
    useUpdateRegionalPerformanceColorThresholdMutation();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: createFormResolver<z.infer<typeof formSchema>>(formSchema),
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
          id: threshold.regional_performance_color_threshold_id,
          region_id: regionId,
          data: values,
        }).unwrap();
        actionFeedback.success("Performance color threshold updated");
      } else {
        await createThreshold({
          region_id: regionId,
          data: values,
        }).unwrap();
        actionFeedback.success("Performance color threshold created");
      }
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      actionFeedback.error(error.data?.message || "Failed to save threshold");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit Performance Color Threshold" : "Create Performance Color Threshold"}
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
                    <Input placeholder="e.g. Good, Average, Critical" {...field} />
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
                    <FormLabel>Min Percentage (%)</FormLabel>
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
                    <FormLabel>Max Percentage (%)</FormLabel>
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
                  <FormLabel>Indicator Color</FormLabel>
                  <FormControl>
                    <ColorPickerField
                      value={field.value}
                      onChange={field.onChange}
                      disabled={isCreating || isUpdating}
                    />
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
                  <FormLabel className="text-sm font-medium">Active</FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating || isUpdating}>
                {isCreating || isUpdating ? "Saving..." : isEditMode ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
