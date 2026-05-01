"use client";

import React, { useEffect, useState } from "react";
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
import {
  useCreateGovernmentStructureMutation,
  useUpdateGovernmentStructureMutation,
  useGetGovernmentStructuresQuery,
} from "@/redux/api/governmentStructureApi";
import { GovernmentStructure } from "@/redux/types/governmentStructure";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  GitForkIcon,
  XIcon,
} from "lucide-react";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  parent_id: z.string().optional().nullable(),
  level: z.coerce.number().min(1).default(1),
  is_active: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateGovernmentStructureModalProps {
  isOpen: boolean;
  onClose: () => void;
  structure?: GovernmentStructure | null;
  initialParentId?: string | null;
}

export function CreateGovernmentStructureModal({
  isOpen,
  onClose,
  structure,
  initialParentId,
}: CreateGovernmentStructureModalProps) {
  const isEditMode = Boolean(structure);
  const { data: structures = [] } = useGetGovernmentStructuresQuery({ is_active: true });

  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [hasSelectedParent, setHasSelectedParent] = useState(false);
  const [navigationStack, setNavigationStack] = useState<GovernmentStructure[]>([]);

  const [createStructure, { isLoading: isCreating }] =
    useCreateGovernmentStructureMutation();
  const [updateStructure, { isLoading: isUpdating }] =
    useUpdateGovernmentStructureMutation();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      parent_id: null,
      level: 1,
      is_active: true,
    },
  });

  useEffect(() => {
    if (structure) {
      form.reset({
        name: structure.name,
        parent_id: structure.parent_id || null,
        level: structure.level,
        is_active: structure.is_active,
      });
      setSelectedParentId(structure.parent_id || null);
      setHasSelectedParent(!!structure.parent_id);
    } else {
      form.reset({
        name: "",
        parent_id: null,
        level: 1,
        is_active: true,
      });
      setSelectedParentId(null);
      setHasSelectedParent(false);
      setNavigationStack([]);
    }

    // Handle initial parent ID from tree view
    if (!structure && initialParentId) {
      handleNodeSelect(initialParentId);
    }
  }, [structure, form, isOpen, initialParentId]);

  // Build tree structure from flat data
  const buildStructureTree = (structuresList: GovernmentStructure[]): GovernmentStructure[] => {
    const structureMap = new Map();
    const roots: GovernmentStructure[] = [];

    // First, create a map of all structures
    structuresList.forEach(struct => {
      structureMap.set(struct.government_structure_id, { ...struct, children: [] });
    });

    // Build the tree
    structuresList.forEach(struct => {
      const node = structureMap.get(struct.government_structure_id);
      if (struct.parent_id && structureMap.has(struct.parent_id)) {
        const parent = structureMap.get(struct.parent_id);
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  };

  // Get current level nodes based on navigation stack
  const getCurrentLevelNodes = (): GovernmentStructure[] => {
    if (navigationStack.length === 0) {
      return buildStructureTree(structures);
    }

    let currentNode = buildStructureTree(structures);
    for (const stackItem of navigationStack) {
      const foundNode = currentNode.find(
        (node) => node.government_structure_id === stackItem.government_structure_id
      );
      if (foundNode && foundNode.children) {
        currentNode = foundNode.children;
      } else {
        return [];
      }
    }
    return currentNode;
  };

  const currentLevelNodes = getCurrentLevelNodes();

  // Move deeper into a structure
  const enterStructure = (node: GovernmentStructure) => {
    if (node.children && node.children.length > 0) {
      setNavigationStack((prev) => [...prev, node]);
      // Clear selection when navigating deeper
      setSelectedParentId(null);
      setHasSelectedParent(false);
    }
  };

  // Move back
  const goBack = () => {
    setNavigationStack((prev) => {
      const newStack = prev.slice(0, -1);
      // Clear selection when going back
      setSelectedParentId(null);
      setHasSelectedParent(false);
      return newStack;
    });
  };

  const resetNavigation = () => {
    setNavigationStack([]);
    setSelectedParentId(null);
    setHasSelectedParent(false);
  };

  // Handle node selection
  const handleNodeSelect = (nodeId: string | null) => {
    setSelectedParentId(nodeId);
    setHasSelectedParent(true);
    form.setValue("parent_id", nodeId);

    // Auto-calculate level based on selected parent
    if (nodeId) {
      const selectedNode = structures.find(s => s.government_structure_id === nodeId);
      if (selectedNode) {
        form.setValue("level", selectedNode.level + 1);
      }
    } else {
      form.setValue("level", 1);
    }
  };

  // Get current path display
  const getCurrentPath = () => {
    if (navigationStack.length === 0) return "Root";
    return navigationStack.map((node) => node.name).join(" → ");
  };

  const onSubmit = async (values: FormValues) => {
    try {
      // Use selected parent ID if available, otherwise use form value
      const finalParentId = selectedParentId !== null ? selectedParentId : values.parent_id;

      const submitData = {
        ...values,
        parent_id: finalParentId || null,
      };

      if (isEditMode && structure) {
        await updateStructure({
          id: structure.government_structure_id,
          data: submitData,
        }).unwrap();
        toast.success("Structure updated successfully");
      } else {
        await createStructure(submitData).unwrap();
        toast.success("Structure created successfully");
      }
      resetNavigation();
      onClose();
    } catch (error: any) {
      toast.error(error?.data?.message || "Something went wrong");
    }
  };

  const currentParentId = isEditMode && structure?.parent_id ? structure.parent_id : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose} >
      <DialogContent className={`sm:max-w-[${!isEditMode && hasSelectedParent ? '650px' : '500px'}] max-h-[85vh] overflow-y-auto transition-all duration-500`}>
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit Structure" : "Create New Structure"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className={`flex gap-6 ${isEditMode ? '' : ''}`}>
              {!isEditMode && (
                <div className={`flex flex-col transition-all duration-500 ${hasSelectedParent ? 'w-1/2' : 'w-full'}`}>
                  <FormLabel className="block text-sm font-medium mb-2">
                    Select Parent Structure <span className="text-muted-foreground">(Optional)</span>
                  </FormLabel>

                  <div className="px-3 rounded-lg">
                    {/* Back Button */}
                    {navigationStack.length > 0 && (
                      <button
                        type="button"
                        onClick={goBack}
                        className="mb-2 flex items-center hover:bg-gray-100 rounded-md p-2 border-none outline-none shadow-none text-sm"
                      >
                        <ArrowLeftIcon className="w-4 h-4 mr-2" />
                        <span className="text-sm font-medium">
                          Back
                        </span>
                      </button>
                    )}

                    {/* Current Path Display */}
                    {navigationStack.length > 0 && (
                      <div className="text-sm font-medium mb-2 text-muted-foreground">
                        Current: {getCurrentPath()}
                      </div>
                    )}

                    {/* Root Option - Only show at root level */}
                    {currentLevelNodes.length === 0 && (
                      <button
                        type="button"
                        className={`block border text-left w-full py-2 px-3 rounded-md mb-2 transition-colors ${selectedParentId === null
                          ? "bg-primary/10 border-primary text-primary"
                          : "hover:bg-gray-100 border"
                          }`}
                        onClick={() => handleNodeSelect(null)}
                      >
                        <div className="flex items-center text-sm">
                          <span className="mr-2">
                            <GitForkIcon className="w-4 h-4" />
                          </span>
                          <div>
                            <div className="font-medium">Root Level</div>
                            <div className="text-sm text-muted-foreground">
                              Create at top level (Level 1)
                            </div>
                          </div>
                        </div>
                      </button>
                    )}

                    {/* Structure Tree */}
                    <div className="flex flex-col gap-2 space-y-1 max-h-60 overflow-y-auto">
                      {currentLevelNodes?.length === 0 ? (
                        <p className="text-sm text-center py-4 text-muted-foreground">
                          No structures found at this level
                        </p>
                      ) : (
                        currentLevelNodes?.map((node) => (
                          <div
                            key={node.government_structure_id}
                            className={`flex border rounded-md items-center hover:bg-green-50 pr-3 ${selectedParentId === node.government_structure_id
                              ? "bg-green-100 border-primary"
                              : "border-gray-300"
                              }`}
                          >
                            <button
                              type="button"
                              onClick={() => handleNodeSelect(node.government_structure_id)}
                              className={`block text-left w-full py-2 px-3 rounded-md transition-colors ${selectedParentId === node.government_structure_id ? "text-primary" : ""
                                }`}
                            >
                              <div className="flex w-full items-center text-sm">
                                <span className="mr-2 mt-0.5">
                                  <GitForkIcon className="w-4 h-4" />
                                </span>

                                <div className="flex-1">
                                  <div className="font-medium">{node.name}</div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    Level {node.level} • {node.children?.length || 0} children
                                  </div>
                                </div>
                              </div>
                            </button>
                            <div className="flex justify-center items-center">
                              {selectedParentId === node.government_structure_id && (
                                <CheckCircleIcon className="w-5 h-5 text-green-800 mr-2" />
                              )}
                              {node.children && node.children.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => enterStructure(node)}
                                  className="bg-transparent border-none w-fit opacity-70 hover:opacity-100 transition-opacity"
                                  title={`Explore ${node.name} structure`}
                                >
                                  <ArrowRightIcon className="w-6 h-6 hover:text-primary" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Name and Level Fields - Show with animation when parent is selected */}
              {!isEditMode && (
                <div
                  className={`flex flex-col gap-4 px-3 transition-all duration-500 ease-in-out overflow-hidden ${hasSelectedParent
                    ? "w-1/2 opacity-100 max-h-[500px] translate-x-0"
                    : "w-0 opacity-0 max-h-0 translate-x-[-20px] pointer-events-none"
                    }`}
                >
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Structure Name <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input placeholder="Enter structure name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Show fields immediately in edit mode */}
              {isEditMode && (
                <div className="flex flex-col gap-4 w-full">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Structure Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter structure name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>

            {/* Buttons */}
            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isCreating || isUpdating}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreating || isUpdating || (!isEditMode && !hasSelectedParent)}
              >
                {isCreating || isUpdating ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                ) : null}
                {isEditMode ? "Save Changes" : "Create Structure"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}