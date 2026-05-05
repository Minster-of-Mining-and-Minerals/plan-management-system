"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    useGetPlanNodeByIdQuery,
    useGetPlanVersionByIdQuery,
} from "@/redux/api/planApi";
import {
    useGetInternalAssignmentsByNodeQuery,
    useGetExternalAssignmentsByNodeQuery,
    useDeleteInternalAssignmentMutation,
    useDeleteExternalAssignmentMutation,
} from "@/redux/api/planAssignmentApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    ChevronLeft,
    Users,
    Building2,
    Plus,
    Trash2,
    Flag,
    Target,
    BarChart3,
    CheckSquare,
    User,
    Shield
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { AssignInternalModal } from "./modals/AssignInternalModal";
import { AssignExternalModal } from "./modals/AssignExternalModal";

interface PlanNodeDetailViewProps {
    versionId: string;
    nodeId: string;
}

export default function PlanNodeDetailView({ versionId, nodeId }: PlanNodeDetailViewProps) {
    const router = useRouter();
    
    // Queries
    const { data: version } = useGetPlanVersionByIdQuery(versionId);
    const { data: node, isLoading: isNodeLoading } = useGetPlanNodeByIdQuery(nodeId);
    const { data: internalAssignments = [], isLoading: isInternalLoading } = useGetInternalAssignmentsByNodeQuery(nodeId);
    const { data: externalAssignments = [], isLoading: isExternalLoading } = useGetExternalAssignmentsByNodeQuery(nodeId);

    // Mutations
    const [deleteInternal] = useDeleteInternalAssignmentMutation();
    const [deleteExternal] = useDeleteExternalAssignmentMutation();

    // Modal States
    const [isInternalModalOpen, setInternalModalOpen] = useState(false);
    const [isExternalModalOpen, setExternalModalOpen] = useState(false);

    const getTypeIcon = (type: string) => {
        switch (type) {
            case "strategic": return <Flag className="h-5 w-5 text-purple-500" />;
            case "goal": return <Target className="h-5 w-5 text-blue-500" />;
            case "kpi": return <BarChart3 className="h-5 w-5 text-green-500" />;
            case "task": return <CheckSquare className="h-5 w-5 text-orange-500" />;
            default: return null;
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case "strategic": return "Strategic Focus Area";
            case "goal": return "Goal";
            case "kpi": return "KPI / Indicator";
            case "task": return "Activity / Task";
            default: return type;
        }
    };

    const handleDeleteInternal = async (id: string) => {
        if (confirm("Are you sure you want to remove this internal assignment?")) {
            try {
                await deleteInternal({ id, nodeId }).unwrap();
                toast.success("Assignment removed");
            } catch (error: any) {
                toast.error(error.data?.message || "Failed to remove assignment");
            }
        }
    };

    const handleDeleteExternal = async (id: string) => {
        if (confirm("Are you sure you want to remove this external assignment?")) {
            try {
                await deleteExternal({ id, nodeId }).unwrap();
                toast.success("Assignment removed");
            } catch (error: any) {
                toast.error(error.data?.message || "Failed to remove assignment");
            }
        }
    };

    if (isNodeLoading) {
        return <div className="p-8 text-center">Loading node details...</div>;
    }

    if (!node) {
        return <div className="p-8 text-center text-red-500">Node not found</div>;
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header / Breadcrumbs */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={() => router.push(`/plans/${versionId}`)}
                        className="rounded-full"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Node Details</h1>
                        <p className="text-gray-500">
                            {version?.year} (v{version?.version_number}) &bull; {version?.governmentStructure?.name || "Global"}
                        </p>
                    </div>
                </div>
            </div>

            {/* Node Info Card */}
            <Card className="border-none shadow-sm bg-white overflow-hidden">
                <div className="h-2 bg-primary" />
                <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                        <div className="p-3 rounded-2xl bg-primary/5">
                            {getTypeIcon(node.type)}
                        </div>
                        <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-bold text-gray-900">{node.title}</h2>
                                <Badge variant="outline" className="uppercase font-bold text-[10px]">
                                    {getTypeLabel(node.type)}
                                </Badge>
                                {node.weight > 0 && (
                                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 font-bold">
                                        Weight: {node.weight}%
                                    </Badge>
                                )}
                            </div>
                            <p className="text-gray-600 leading-relaxed">
                                {node.description || "No description provided."}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Assignments Tabs */}
            <Tabs defaultValue="internal" className="w-full">
                <div className="flex items-center justify-between mb-4">
                    <TabsList className="bg-gray-100 p-1 rounded-xl">
                        <TabsTrigger value="internal" className="rounded-lg px-4 py-2 flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Internal Assignments
                            {internalAssignments.length > 0 && (
                                <Badge className="ml-2 bg-primary text-white border-none h-5 w-5 flex items-center justify-center p-0 rounded-full text-[10px]">
                                    {internalAssignments.length}
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="external" className="rounded-lg px-4 py-2 flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            External Assignments
                            {externalAssignments.length > 0 && (
                                <Badge className="ml-2 bg-primary text-white border-none h-5 w-5 flex items-center justify-center p-0 rounded-full text-[10px]">
                                    {externalAssignments.length}
                                </Badge>
                            )}
                        </TabsTrigger>
                    </TabsList>

                    <div className="flex gap-2">
                        <TabsContent value="internal" className="mt-0">
                            <Button onClick={() => setInternalModalOpen(true)} className="gap-2 rounded-xl">
                                <Plus className="h-4 w-4" /> Assign Internal
                            </Button>
                        </TabsContent>
                        <TabsContent value="external" className="mt-0">
                            <Button onClick={() => setExternalModalOpen(true)} className="gap-2 rounded-xl" variant="outline">
                                <Plus className="h-4 w-4" /> Assign External
                            </Button>
                        </TabsContent>
                    </div>
                </div>

                <TabsContent value="internal" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {internalAssignments.length > 0 ? (
                            internalAssignments.map((assignment) => (
                                <Card key={assignment.internal_assignment_id} className="hover:shadow-md transition-shadow group">
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-gray-50 flex items-center justify-center text-primary border border-gray-100">
                                                {assignment.user_id ? <User className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-900">
                                                    {assignment.user?.name || assignment.internalStructure?.name}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Badge variant="secondary" className="text-[10px] bg-purple-50 text-purple-700 border-purple-100">
                                                        {assignment.action?.name}
                                                    </Badge>
                                                    {assignment.user_id && (
                                                        <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">User</span>
                                                    )}
                                                    {assignment.internal_structure_id && (
                                                        <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Structure</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => handleDeleteInternal(assignment.internal_assignment_id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))
                        ) : (
                            <div className="col-span-full py-12 text-center bg-white rounded-3xl border-2 border-dashed border-gray-100">
                                <Users className="h-8 w-8 text-gray-300 mx-auto mb-3" />
                                <h3 className="text-gray-500 font-medium">No internal assignments yet</h3>
                                <p className="text-gray-400 text-sm">Assign users or structures to take responsibility for this node.</p>
                            </div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="external" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {externalAssignments.length > 0 ? (
                            externalAssignments.map((assignment) => (
                                <Card key={assignment.external_assignment_id} className="hover:shadow-md transition-shadow group border-l-4 border-l-orange-500">
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-600 border border-orange-100">
                                                <Building2 className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-900">
                                                    {assignment.governmentStructure?.name}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Badge variant="secondary" className="text-[10px] bg-orange-50 text-orange-700 border-orange-100 capitalize">
                                                        {assignment.role}
                                                    </Badge>
                                                    <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">External Gov</span>
                                                </div>
                                            </div>
                                        </div>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => handleDeleteExternal(assignment.external_assignment_id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))
                        ) : (
                            <div className="col-span-full py-12 text-center bg-white rounded-3xl border-2 border-dashed border-gray-100">
                                <Building2 className="h-8 w-8 text-gray-300 mx-auto mb-3" />
                                <h3 className="text-gray-500 font-medium">No external assignments yet</h3>
                                <p className="text-gray-400 text-sm">Assign external government structures to collaborate on this node.</p>
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>

            {/* Modals */}
            <AssignInternalModal 
                isOpen={isInternalModalOpen} 
                onClose={() => setInternalModalOpen(false)} 
                planNodeId={nodeId}
            />
            <AssignExternalModal 
                isOpen={isExternalModalOpen} 
                onClose={() => setExternalModalOpen(false)} 
                planNodeId={nodeId}
            />
        </div>
    );
}
