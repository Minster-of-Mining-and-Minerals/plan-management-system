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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  useCreateInternalStructureMutation,
  useUpdateInternalStructureMutation,
  useGetInternalStructuresQuery,
} from "@/redux/api/internalStructureApi";
import { useGetGovernmentStructuresQuery } from "@/redux/api/governmentStructureApi";
import { InternalStructure } from "@/redux/types/internalStructure";
import { useSession } from "next-auth/react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  GitForkIcon,
  AlertCircleIcon,
  InfoIcon,
} from "lucide-react";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  parent_id: z.string().optional().nullable(),
  government_structure_id: z.string().min(1, "Government structure is required"),
  level: z.coerce.number().min(1).default(1),
  is_active: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateInternalStructureModalProps {
  isOpen: boolean;
  onClose: () => void;
  structure?: InternalStructure | null;
  initialParentId?: string | null;
}

export function CreateInternalStructureModal({
  isOpen,
  onClose,
  structure,
  initialParentId,
}: CreateInternalStructureModalProps) {
  const { data: session } = useSession();
  const userGovStructure = session?.user?.government_structure;
  const assignedGovId = (userGovStructure && !Array.isArray(userGovStructure)) 
    ? userGovStructure.government_structure_id 
    : null;

  const isEditMode = Boolean(structure);
  const isAddingFromTree = !!initialParentId && !isEditMode;
  const { data: structures = [] } = useGetInternalStructuresQuery({ is_active: true });
  
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [hasSelectedParent, setHasSelectedParent] = useState(false);
  const [navigationStack, setNavigationStack] = useState<InternalStructure[]>([]);

  const [createStructure, { isLoading: isCreating }] =
    useCreateInternalStructureMutation();
  const [updateStructure, { isLoading: isUpdating }] =
    useUpdateInternalStructureMutation();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      parent_id: null,
      government_structure_id: assignedGovId || "",
      level: 1,
      is_active: true,
    },
  });

  const currentGovId = form.watch("government_structure_id");
  const rootExistsForGov = structures.some(s => s.government_structure_id === currentGovId && !s.parent_id);

  const { data: govStructures = [] } = useGetGovernmentStructuresQuery({ is_active: true }, {
    skip: !!assignedGovId || isEditMode || !!selectedParentId || isAddingFromTree
  });

  // Handle node selection
  const handleNodeSelect = (nodeId: string | null) => {
    setSelectedParentId(nodeId);
    setHasSelectedParent(true);
    form.setValue("parent_id", nodeId);

    if (nodeId) {
      const selectedNode = structures.find(s => s.internal_structure_id === nodeId);
      if (selectedNode) {
        form.setValue("level", selectedNode.level + 1);
        form.setValue("government_structure_id", selectedNode.government_structure_id);
      }
    } else {
      form.setValue("level", 1);
      if (assignedGovId) {
        form.setValue("government_structure_id", assignedGovId);
      }
    }
  };

  useEffect(() => {
    if (structure) {
      form.reset({
        name: structure.name,
        parent_id: structure.parent_id || null,
        government_structure_id: structure.government_structure_id,
        level: structure.level,
        is_active: structure.is_active,
      });
      setSelectedParentId(structure.parent_id || null);
      setHasSelectedParent(!!structure.parent_id);
    } else if (initialParentId) {
        // Simple mode: just pre-select and prepare form
        const parent = structures.find(s => s.internal_structure_id === initialParentId);
        if (parent) {
            form.reset({
                name: "",
                parent_id: initialParentId,
                government_structure_id: parent.government_structure_id,
                level: parent.level + 1,
                is_active: true,
            });
            setSelectedParentId(initialParentId);
            setHasSelectedParent(true);
        }
    } else {
      form.reset({
        name: "",
        parent_id: null,
        government_structure_id: assignedGovId || "",
        level: 1,
        is_active: true,
      });
      setSelectedParentId(null);
      setHasSelectedParent(false);
      setNavigationStack([]);
    }
  }, [structure, form, isOpen, assignedGovId, initialParentId, structures]);

  // Build tree structure from flat data
  const buildStructureTree = (structuresList: InternalStructure[]): InternalStructure[] => {
    const filteredList = structuresList.filter(s => s.government_structure_id === currentGovId);
    const structureMap = new Map();
    const roots: InternalStructure[] = [];

    filteredList.forEach(struct => {
      structureMap.set(struct.internal_structure_id, { ...struct, children: [] });
    });

    filteredList.forEach(struct => {
      const node = structureMap.get(struct.internal_structure_id);
      if (struct.parent_id && structureMap.has(struct.parent_id)) {
        const parent = structureMap.get(struct.parent_id);
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  };

  const getCurrentLevelNodes = (): InternalStructure[] => {
    const tree = buildStructureTree(structures);
    if (navigationStack.length === 0) {
      return tree;
    }

    let currentNode = tree;
    for (const stackItem of navigationStack) {
      const foundNode = currentNode.find(
        (node) => node.internal_structure_id === stackItem.internal_structure_id
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

  const enterStructure = (node: InternalStructure) => {
    if (node.children && node.children.length > 0) {
      setNavigationStack((prev) => [...prev, node]);
      setSelectedParentId(null);
      setHasSelectedParent(false);
    }
  };

  const goBack = () => {
    setNavigationStack((prev) => {
      const newStack = prev.slice(0, -1);
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

  const onSubmit = async (values: FormValues) => {
    try {
      // Logic for final values
      const finalParentId = selectedParentId || values.parent_id || null;
      let finalGovId = values.government_structure_id;
      let finalLevel = values.level;

      if (finalParentId) {
        const parent = structures.find(s => s.internal_structure_id === finalParentId);
        if (parent) {
          finalGovId = parent.government_structure_id;
          finalLevel = parent.level + 1;
        }
      }

      const submitData = {
        ...values,
        parent_id: finalParentId,
        government_structure_id: finalGovId,
        level: finalLevel,
      };

      if (isEditMode && structure) {
        await updateStructure({
          id: structure.internal_structure_id,
          data: submitData,
        }).unwrap();
        toast.success("Structure updated successfully");
      } else {
        await createStructure(submitData as any).unwrap();
        toast.success("Structure created successfully");
      }
      resetNavigation();
      onClose();
    } catch (error: any) {
      toast.error(error?.data?.message || "Something went wrong");
    }
  };

  const parentNode = selectedParentId ? structures.find(s => s.internal_structure_id === selectedParentId) : null;
  const showFullSelector = !isEditMode && !isAddingFromTree;
  const showGovSelector = showFullSelector && !assignedGovId && !selectedParentId;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`sm:max-w-[${showFullSelector && hasSelectedParent ? '750px' : '500px'}] max-h-[85vh] overflow-y-auto transition-all duration-500`}>
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit Internal Structure" : isAddingFromTree ? `Add Child to "${parentNode?.name}"` : "Create New Internal Structure"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Government Structure Selector - Only in Full Mode */}
            {showGovSelector && (
              <FormField
                control={form.control}
                name="government_structure_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Government Structure <span className="text-red-500">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select government structure" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {govStructures.map((gov) => (
                          <SelectItem key={gov.government_structure_id} value={gov.government_structure_id}>
                            {gov.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Context Info for Tree Mode */}
            {isAddingFromTree && parentNode && (
                <div className="bg-muted/50 p-4 rounded-lg border border-border space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <InfoIcon className="w-4 h-4" />
                        <span>The new structure will inherit the following context:</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="font-semibold text-foreground">Parent Structure</p>
                            <p className="opacity-80">{parentNode.name}</p>
                        </div>
                        <div>
                            <p className="font-semibold text-foreground">Government Body</p>
                            <p className="opacity-80">{parentNode.governmentStructure?.name || "Inherited"}</p>
                        </div>
                    </div>
                </div>
            )}

            <div className={`flex gap-6`}>
              {/* Parent Selector - Only in Full Mode */}
              {showFullSelector && (
                <div className={`flex flex-col transition-all duration-500 ${hasSelectedParent ? 'w-1/2' : 'w-full'}`}>
                  <FormLabel className="block text-sm font-medium mb-2">
                    Select Parent Structure <span className="text-muted-foreground">(Optional)</span>
                  </FormLabel>

                  <div className="px-3 rounded-lg">
                    {navigationStack.length > 0 && (
                      <button
                        type="button"
                        onClick={goBack}
                        className="mb-2 flex items-center hover:bg-gray-100 rounded-md p-2 border-none outline-none shadow-none text-sm"
                      >
                        <ArrowLeftIcon className="w-4 h-4 mr-2" />
                        <span className="text-sm font-medium">Back</span>
                      </button>
                    )}

                    <div className="flex flex-col gap-2 space-y-1 max-h-60 overflow-y-auto">
                      {navigationStack.length === 0 && (
                        <>
                          <button
                            type="button"
                            disabled={rootExistsForGov}
                            className={`block border text-left w-full py-2 px-3 rounded-md mb-2 transition-colors ${selectedParentId === null
                              ? "bg-primary/10 border-primary text-primary"
                              : "hover:bg-gray-100 border"
                              } ${rootExistsForGov ? "opacity-50 cursor-not-allowed grayscale" : ""}`}
                            onClick={() => !rootExistsForGov && handleNodeSelect(null)}
                          >
                            <div className="flex items-center text-sm">
                              <span className="mr-2"><GitForkIcon className="w-4 h-4" /></span>
                              <div>
                                <div className="font-medium">Root Level</div>
                                <div className="text-sm text-muted-foreground">Create at top level (Level 1)</div>
                              </div>
                            </div>
                          </button>
                          {rootExistsForGov && (
                            <div className="flex items-center gap-2 p-2 bg-amber-50 text-amber-700 rounded-md text-[10px] mb-2 border border-amber-100">
                              <AlertCircleIcon className="w-3 h-3 flex-shrink-0" />
                              <span>A root already exists. Select it to add children.</span>
                            </div>
                          )}
                        </>
                      )}

                      {currentLevelNodes?.map((node) => (
                        <div
                          key={node.internal_structure_id}
                          className={`flex border rounded-md items-center hover:bg-green-50 pr-3 ${selectedParentId === node.internal_structure_id
                            ? "bg-green-100 border-primary"
                            : "border-gray-300"
                            }`}
                        >
                          <button
                            type="button"
                            onClick={() => handleNodeSelect(node.internal_structure_id)}
                            className={`block text-left w-full py-2 px-3 rounded-md transition-colors ${selectedParentId === node.internal_structure_id ? "text-primary" : ""}`}
                          >
                            <div className="flex w-full items-center text-sm">
                              <span className="mr-2 mt-0.5"><GitForkIcon className="w-4 h-4" /></span>
                              <div className="flex-1">
                                <div className="font-medium">{node.name}</div>
                                <div className="text-xs text-muted-foreground mt-1">Level {node.level}</div>
                              </div>
                            </div>
                          </button>
                          <div className="flex justify-center items-center">
                            {selectedParentId === node.internal_structure_id && (
                              <CheckCircleIcon className="w-5 h-5 text-green-800 mr-2" />
                            )}
                            {node.children && node.children.length > 0 && (
                              <button
                                type="button"
                                onClick={() => enterStructure(node)}
                                className="bg-transparent border-none w-fit opacity-70 hover:opacity-100 transition-opacity"
                              >
                                <ArrowRightIcon className="w-6 h-6 hover:text-primary" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Name Field - Shared across modes */}
              <div
                className={`flex flex-col gap-4 px-3 transition-all duration-500 ease-in-out ${isEditMode || isAddingFromTree ? 'w-full' : hasSelectedParent ? "w-1/2 opacity-100" : "w-0 opacity-0 pointer-events-none"}`}
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
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={isCreating || isUpdating}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating || isUpdating || (!isEditMode && !hasSelectedParent)}>
                {(isCreating || isUpdating) && <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />}
                {isEditMode ? "Save Changes" : "Create Structure"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
