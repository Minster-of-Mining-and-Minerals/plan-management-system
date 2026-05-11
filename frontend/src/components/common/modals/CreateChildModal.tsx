"use client";

import React from "react";
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
import { toast } from "sonner";
import { useCreateStructureMutation } from "@/redux/api/structureApi";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateChildModalProps {
  isOpen: boolean;
  onClose: () => void;
  parent_id: string;
}

export function CreateChildModal({
  isOpen,
  onClose,
  parent_id,
}: CreateChildModalProps) {
  const [createStructure, { isLoading: isCreatingGov }] = useCreateStructureMutation();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await createStructure({
        name: values.name,
        parent_id,
      }).unwrap();
      
      toast.success("Child node created successfully");
      form.reset();
      onClose();
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to create child node");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Child Node</DialogTitle>
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
                    <Input placeholder="Enter node name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreatingGov}>
                {isCreatingGov && (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                )}
                Create Node
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
