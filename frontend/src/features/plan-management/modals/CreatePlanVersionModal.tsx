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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
    useCreatePlanVersionMutation,
    useUpdatePlanVersionMutation,
    useGetPlanVersionsQuery,
} from "@/redux/api/planApi";
import { useGetGovernmentStructuresQuery } from "@/redux/api/governmentStructureApi";
import { useGetPlanRulesQuery } from "@/redux/api/planRuleApi";
import { PlanVersion } from "@/redux/types/plan";

const formSchema = z.object({
    year: z.coerce.number().min(2020).max(2100),
    government_structure_id: z.string().uuid(),
    based_on_version_id: z.string().uuid().optional().nullable(),
    plan_rule_id: z.string().uuid().optional().nullable(),
});

interface CreatePlanVersionModalProps {
    isOpen: boolean;
    onClose: () => void;
    version?: PlanVersion | null;
}

export function CreatePlanVersionModal({
    isOpen,
    onClose,
    version,
}: CreatePlanVersionModalProps) {
    const [createVersion, { isLoading: isCreating }] = useCreatePlanVersionMutation();
    const [updateVersion, { isLoading: isUpdating }] = useUpdatePlanVersionMutation();
    
    const { data: structures = [] } = useGetGovernmentStructuresQuery({});
    const { data: planRules = [] } = useGetPlanRulesQuery({ is_active: true });
    const { data: existingVersions = [] } = useGetPlanVersionsQuery({});

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            year: new Date().getFullYear(),
            government_structure_id: "",
            based_on_version_id: null,
            plan_rule_id: null,
        },
    });

    useEffect(() => {
        if (version) {
            form.reset({
                year: version.year,
                government_structure_id: version.government_structure_id,
                based_on_version_id: version.based_on_version_id,
                plan_rule_id: version.plan_rule_id ?? null,
            });
        } else {
            form.reset({
                year: new Date().getFullYear(),
                government_structure_id: "",
                based_on_version_id: null,
                plan_rule_id: null,
            });
        }
    }, [version, form, isOpen]);

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            if (version) {
                await updateVersion({
                    id: version.plan_version_id,
                    data: values,
                }).unwrap();
                toast.success("Plan version updated successfully");
            } else {
                await createVersion(values).unwrap();
                toast.success("Plan version created successfully");
            }
            onClose();
        } catch (error: any) {
            toast.error(error.data?.message || "Something went wrong");
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>
                        {version ? "Edit Plan Version" : "Create New Plan Version"}
                    </DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="year"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Planning Year</FormLabel>
                                    <FormControl>
                                        <Input type="number" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="government_structure_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Sector Structure</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                        value={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select sector structure" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {structures.map((s) => (
                                                <SelectItem key={s.government_structure_id} value={s.government_structure_id}>
                                                    {s.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {!version && (
                            <FormField
                                control={form.control}
                                name="based_on_version_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Carry Forward From (Optional)</FormLabel>
                                        <Select
                                            onValueChange={(val) => field.onChange(val === "none" ? null : val)}
                                            defaultValue={field.value || "none"}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select base version" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="none">None (Fresh Start)</SelectItem>
                                                {existingVersions.map((v) => (
                                                    <SelectItem key={v.plan_version_id} value={v.plan_version_id}>
                                                        {v.year} - v{v.version_number} ({v.governmentStructure?.name})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        <FormField
                            control={form.control}
                            name="plan_rule_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Plan Rule (Optional)</FormLabel>
                                    <Select
                                        onValueChange={(val) =>
                                            field.onChange(val === "default" ? null : val)
                                        }
                                        value={field.value || "default"}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Use default rule for sector" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="default">
                                                Auto (sector or global default)
                                            </SelectItem>
                                            {planRules.map((r) => (
                                                <SelectItem key={r.plan_rule_id} value={r.plan_rule_id}>
                                                    {r.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
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
                                {isCreating || isUpdating ? "Saving..." : version ? "Update" : "Create"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
