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
import { useCreateGovernmentStructureMutation } from "@/redux/api/governmentStructureApi";
import { useCreateInternalStructureMutation } from "@/redux/api/internalStructureApi";
import { useSession } from "next-auth/react";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateChildModalProps {
  isOpen: boolean;
  onClose: () => void;
  parent_id: string;
  type: 'government' | 'internal';
}

export function CreateChildModal({
  isOpen,
  onClose,
  parent_id,
  type,
}: CreateChildModalProps) {
  const { data: session } = useSession();
  const [createGovStructure, { isLoading: isCreatingGov }] = useCreateGovernmentStructureMutation();
  const [createIntStructure, { isLoading: isCreatingInt }] = useCreateInternalStructureMutation();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      if (type === 'government') {
        await createGovStructure({
          ...values,
          parent_id,
        }).unwrap();
      } else {
        // For internal structure, we need government_structure_id
        // We get it from the session for now, assuming the user is adding within their own structure
        const userGovStructure = session?.user?.government_structure;
        const government_structure_id = (userGovStructure && !Array.isArray(userGovStructure)) 
          ? userGovStructure.government_structure_id 
          : null;

        if (!government_structure_id) {
          toast.error("Government structure context missing. Please add via the main table.");
          return;
        }

        await createIntStructure({
          ...values,
          parent_id,
          government_structure_id,
        } as any).unwrap();
      }
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
              <Button type="submit" disabled={isCreatingGov || isCreatingInt}>
                {(isCreatingGov || isCreatingInt) && (
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
