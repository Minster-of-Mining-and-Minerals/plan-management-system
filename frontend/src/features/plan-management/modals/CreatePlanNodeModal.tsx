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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
    useCreatePlanNodeMutation,
    useUpdatePlanNodeMutation,
} from "@/redux/api/planApi";
import { PlanNode } from "@/redux/types/plan";

const formSchema = z.z.object({
    plan_version_id: z.string().uuid(),
    parent_id: z.string().uuid().optional().nullable(),
    type: z.enum(["strategic", "goal", "kpi", "task"]),
    title: z.string().min(3).max(255),
    description: z.string().optional().nullable(),
    weight: z.coerce.number().min(0).max(100).default(0),
    level: z.coerce.number().optional(),
    order: z.coerce.number().optional(),
});

interface CreatePlanNodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    planVersionId: string;
    parentNode?: PlanNode | null;
    node?: PlanNode | null;
}

export function CreatePlanNodeModal({
    isOpen,
    onClose,
    planVersionId,
    parentNode,
    node,
}: CreatePlanNodeModalProps) {
    const [createNode, { isLoading: isCreating }] = useCreatePlanNodeMutation();
    const [updateNode, { isLoading: isUpdating }] = useUpdatePlanNodeMutation();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            plan_version_id: planVersionId,
            parent_id: null,
            type: "strategic",
            title: "",
            description: "",
            weight: 0,
        },
    });

    useEffect(() => {
        if (node) {
            form.reset({
                plan_version_id: node.plan_version_id,
                parent_id: node.parent_id,
                type: node.type,
                title: node.title,
                description: node.description,
                weight: node.weight,
                level: node.level,
                order: node.order,
            });
        } else {
            // New node
            let defaultType: "strategic" | "goal" | "kpi" | "task" = "strategic";
            if (parentNode) {
                if (parentNode.type === "strategic") defaultType = "goal";
                else if (parentNode.type === "goal") defaultType = "kpi";
                else if (parentNode.type === "kpi") defaultType = "task";
                else defaultType = "task";
            }

            form.reset({
                plan_version_id: planVersionId,
                parent_id: parentNode?.plan_node_id || null,
                type: defaultType,
                title: "",
                description: "",
                weight: 0,
            });
        }
    }, [node, parentNode, planVersionId, form, isOpen]);

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            const submitData = { ...values };
            if (submitData.type === "strategic") {
                submitData.weight = 0;
            }

            if (node) {
                await updateNode({
                    id: node.plan_node_id,
                    data: submitData,
                }).unwrap();
                toast.success("Plan node updated successfully");
            } else {
                await createNode(submitData).unwrap();
                toast.success("Plan node created successfully");
            }
            onClose();
        } catch (error: any) {
            toast.error(error.data?.message || "Something went wrong");
        }
    }

    const typeOptions = [
        { label: "Strategic Focus Area", value: "strategic" },
        { label: "Goal", value: "goal" },
        { label: "KPI / Indicator", value: "kpi" },
        { label: "Task / Activity", value: "task" },
    ];

    const selectedType = form.watch("type");

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>
                        {node ? "Edit Node" : parentNode ? `Add Child to: ${parentNode.title}` : "Add Root Strategic Area"}
                    </DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className={selectedType !== "strategic" ? "grid grid-cols-2 gap-4" : "space-y-4"}>
                            <FormField
                                control={form.control}
                                name="type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Node Type</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                            value={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select type" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {typeOptions.map((opt) => (
                                                    <SelectItem key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {selectedType !== "strategic" && (
                                <FormField
                                    control={form.control}
                                    name="weight"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Weight (%)</FormLabel>
                                            <FormControl>
                                                <Input type="number" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}
                        </div>

                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Title</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter title" {...field} />
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
                                    <FormLabel>Description (Optional)</FormLabel>
                                    <FormControl>
                                        <Textarea 
                                            placeholder="Enter description" 
                                            className="min-h-[100px]"
                                            {...field} 
                                            value={field.value || ""}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="mt-6">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                                disabled={isCreating || isUpdating}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isCreating || isUpdating}>
                                {isCreating || isUpdating ? "Saving..." : node ? "Update" : "Add Node"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
