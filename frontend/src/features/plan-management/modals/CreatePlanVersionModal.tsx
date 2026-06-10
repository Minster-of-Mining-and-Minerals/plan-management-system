"use client";

import { useEffect, useMemo } from "react";
import { format, parseISO } from "date-fns";
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
    FormDescription,
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
import { useGetPlanningConfigurationQuery } from "@/redux/api/planningConfigApi";
import { useGetGovernmentStructuresQuery } from "@/redux/api/governmentStructureApi";
import { useGetPlanRulesQuery } from "@/redux/api/planRuleApi";
import { PlanVersion } from "@/redux/types/plan";
import { DEFAULT_PLANNING_CONFIGURATION } from "@/redux/types/planningConfig";
import { PlanningStartDatePicker } from "../components/PlanningStartDatePicker";
import {
    buildDurationOptions,
    computePlanningEndDate,
    formatDurationYears,
    formatPlanningPeriod,
    getDefaultPlanningStartDate,
    getPlanDraftDisplayName,
} from "@/utils/planDraftUtils";
import { getApiErrorMessage } from "@/utils/apiErrorUtils";

function buildFormSchema(minDuration: number, maxDuration: number) {
    return z.object({
        draft_name: z.string().trim().min(1, "Draft name is required").max(255),
        planning_start_date: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, "Please select a valid start date"),
        planning_duration_years: z.coerce
            .number()
            .int()
            .min(minDuration, `Minimum duration is ${minDuration} year(s)`)
            .max(maxDuration, `Maximum duration is ${maxDuration} year(s)`),
        government_structure_id: z.string().uuid(),
        based_on_version_id: z.string().uuid().optional().nullable(),
        plan_rule_id: z.string().uuid().optional().nullable(),
    });
}

type FormValues = z.infer<ReturnType<typeof buildFormSchema>>;

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
    const { data: config = DEFAULT_PLANNING_CONFIGURATION } = useGetPlanningConfigurationQuery();
    const [createVersion, { isLoading: isCreating }] = useCreatePlanVersionMutation();
    const [updateVersion, { isLoading: isUpdating }] = useUpdatePlanVersionMutation();

    const { data: structures = [] } = useGetGovernmentStructuresQuery({});
    const { data: planRules = [] } = useGetPlanRulesQuery({ is_active: true });
    const { data: existingVersions = [] } = useGetPlanVersionsQuery({});

    const formSchema = useMemo(
        () => buildFormSchema(config.min_duration_years, config.max_duration_years),
        [config.min_duration_years, config.max_duration_years]
    );

    const durationOptions = useMemo(
        () => buildDurationOptions(config.min_duration_years, config.max_duration_years),
        [config.min_duration_years, config.max_duration_years]
    );

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            draft_name: "",
            planning_start_date: getDefaultPlanningStartDate(),
            planning_duration_years: config.min_duration_years,
            government_structure_id: "",
            based_on_version_id: null,
            plan_rule_id: null,
        },
    });

    const startDate = form.watch("planning_start_date");
    const durationYears = form.watch("planning_duration_years");
    const endDate = startDate
        ? computePlanningEndDate(startDate, Number(durationYears) || 1)
        : "";

    useEffect(() => {
        if (version) {
            form.reset({
                draft_name: version.draft_name,
                planning_start_date:
                    version.planning_start_date ??
                    `${version.start_year ?? version.year}-01-01`,
                planning_duration_years: version.planning_duration_years ?? config.min_duration_years,
                government_structure_id: version.government_structure_id,
                based_on_version_id: version.based_on_version_id,
                plan_rule_id: version.plan_rule_id ?? null,
            });
        } else {
            form.reset({
                draft_name: "",
                planning_start_date: getDefaultPlanningStartDate(),
                planning_duration_years: config.min_duration_years,
                government_structure_id: "",
                based_on_version_id: null,
                plan_rule_id: null,
            });
        }
    }, [version, form, isOpen, config.min_duration_years]);

    async function onSubmit(values: FormValues) {
        try {
            if (version) {
                await updateVersion({
                    id: version.plan_version_id,
                    data: {
                        draft_name: values.draft_name,
                        planning_start_date: values.planning_start_date,
                        planning_duration_years: values.planning_duration_years,
                        government_structure_id: values.government_structure_id,
                        plan_rule_id: values.plan_rule_id,
                    },
                }).unwrap();
                toast.success(`${config.draft_entity_label_singular} updated successfully`);
            } else {
                await createVersion({
                    draft_name: values.draft_name,
                    planning_start_date: values.planning_start_date,
                    planning_duration_years: values.planning_duration_years,
                    government_structure_id: values.government_structure_id,
                    based_on_version_id: values.based_on_version_id,
                    plan_rule_id: values.plan_rule_id,
                }).unwrap();
                toast.success(`${config.draft_entity_label_singular} created successfully`);
            }
            onClose();
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error));
        }
    }

    const modalTitle = version
        ? `Edit ${config.draft_entity_label_singular}`
        : config.create_action_label;

    const periodPreview =
        startDate && endDate
            ? `${format(parseISO(startDate), "MMM d, yyyy")} – ${format(parseISO(endDate), "MMM d, yyyy")}`
            : "";

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[540px]">
                <DialogHeader>
                    <DialogTitle>{modalTitle}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="draft_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Draft Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="National Mining Development Plan" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="planning_duration_years"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Planning Duration</FormLabel>
                                    <Select
                                        onValueChange={(val) => field.onChange(Number(val))}
                                        value={String(field.value)}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select duration" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {durationOptions.map((years) => (
                                                <SelectItem key={years} value={String(years)}>
                                                    {formatDurationYears(years)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="planning_start_date"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>{config.start_year_label}</FormLabel>
                                        <FormControl>
                                            <PlanningStartDatePicker
                                                value={field.value}
                                                onChange={field.onChange}
                                                placeholder="Select start date"
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Choose the day, month, and year the planning period begins.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormItem>
                                <FormLabel>{config.end_year_label}</FormLabel>
                                <FormControl>
                                    <Input
                                        readOnly
                                        disabled
                                        className="bg-muted"
                                        value={
                                            endDate
                                                ? format(parseISO(endDate), "PPP")
                                                : "Select start date and duration"
                                        }
                                    />
                                </FormControl>
                                {periodPreview && (
                                    <FormDescription>
                                        {config.planning_period_label}: {periodPreview}
                                    </FormDescription>
                                )}
                            </FormItem>
                        </div>

                        <FormField
                            control={form.control}
                            name="government_structure_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Sector Structure</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
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
                                            value={field.value || "none"}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select base draft" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="none">None (Fresh Start)</SelectItem>
                                                {existingVersions.map((v) => (
                                                    <SelectItem key={v.plan_version_id} value={v.plan_version_id}>
                                                        {getPlanDraftDisplayName(v)} ({formatPlanningPeriod(v)}) — {v.governmentStructure?.name}
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
