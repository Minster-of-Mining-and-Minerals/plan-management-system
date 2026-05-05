"use client";

import { useState } from "react";
import {
    useGetPlanHierarchyQuery,
    useDeletePlanNodeMutation,
    useGetPlanVersionByIdQuery,
} from "@/redux/api/planApi";
import { PlanNodeHierarchy, PlanNode } from "@/redux/types/plan";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
    Plus, 
    Edit, 
    Trash, 
    ChevronRight, 
    ChevronDown, 
    Target, 
    Flag, 
    BarChart3, 
    CheckSquare,
    ChevronLeft,
    Eye
} from "lucide-react";
import { CreatePlanNodeModal } from "./modals/CreatePlanNodeModal";
import { toast } from "sonner";
import { useRouter, useParams } from "next/navigation";

interface NodeItemProps {
    node: PlanNodeHierarchy;
    level: number;
    onAddChild: (parent: PlanNode) => void;
    onEdit: (node: PlanNode) => void;
    onDelete: (id: string) => void;
}

const NodeItem = ({ node, level, onAddChild, onEdit, onDelete }: NodeItemProps) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const hasChildren = node.children && node.children.length > 0;
    const router = useRouter();
    const params = useParams();
    const versionId = params.id as string;

    const getTypeIcon = (type: string) => {
        switch (type) {
            case "strategic": return <Flag className="h-4 w-4 text-purple-500" />;
            case "goal": return <Target className="h-4 w-4 text-blue-500" />;
            case "kpi": return <BarChart3 className="h-4 w-4 text-green-500" />;
            case "task": return <CheckSquare className="h-4 w-4 text-orange-500" />;
            default: return null;
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case "strategic": return "Strategic Focus";
            case "goal": return "Goal";
            case "kpi": return "KPI";
            case "task": return "Activity";
            default: return type;
        }
    };

    return (
        <div className="space-y-2">
            <div 
                className={`flex items-center group p-3 rounded-xl border border-gray-100 bg-white hover:border-primary/30 hover:shadow-sm transition-all duration-200 ml-${level * 4}`}
                style={{ marginLeft: `${level * 24}px` }}
            >
                <div className="flex items-center gap-3 flex-1">
                    <button 
                        onClick={() => setIsExpanded(!isExpanded)}
                        className={`p-1 rounded-md hover:bg-gray-100 transition-colors ${!hasChildren && "invisible"}`}
                    >
                        {isExpanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                    </button>
                    
                    <div className={`p-2 rounded-lg bg-gray-50 group-hover:bg-primary/10 transition-colors`}>
                        {getTypeIcon(node.type)}
                    </div>

                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">{node.title}</span>
                            <Badge variant="outline" className="text-[10px] uppercase font-bold py-0 h-4">
                                {getTypeLabel(node.type)}
                            </Badge>
                            {node.weight > 0 && node.type !== "strategic" && (
                                <Badge variant="secondary" className="text-[10px] py-0 h-4 bg-blue-50 text-blue-700 border-blue-100">
                                    Weight: {node.weight}%
                                </Badge>
                            )}
                        </div>
                        {node.description && (
                            <p className="text-xs text-gray-500 line-clamp-1">{node.description}</p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                        onClick={() => router.push(`/plans/${versionId}/nodes/${node.plan_node_id}`)}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        title="View Details"
                    >
                        <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                        onClick={() => onAddChild(node)}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-primary"
                        title="Add Child"
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                    <Button
                        onClick={() => onEdit(node)}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-600"
                        title="Edit"
                    >
                        <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                        onClick={() => onDelete(node.plan_node_id)}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                        title="Delete"
                    >
                        <Trash className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {isExpanded && hasChildren && (
                <div className="space-y-2">
                    {node.children.map((child) => (
                        <NodeItem 
                            key={child.plan_node_id} 
                            node={child} 
                            level={level + 1} 
                            onAddChild={onAddChild}
                            onEdit={onEdit}
                            onDelete={onDelete}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default function PlanHierarchyView({ versionId }: { versionId: string }) {
    const router = useRouter();
    const { data: version } = useGetPlanVersionByIdQuery(versionId);
    const { data: hierarchy = [], isLoading, refetch } = useGetPlanHierarchyQuery(versionId);
    const [deleteNode] = useDeletePlanNodeMutation();

    const [isModalOpen, setModalOpen] = useState(false);
    const [selectedParent, setSelectedParent] = useState<PlanNode | null>(null);
    const [selectedNode, setSelectedNode] = useState<PlanNode | null>(null);

    const handleAddRoot = () => {
        setSelectedParent(null);
        setSelectedNode(null);
        setModalOpen(true);
    };

    const handleAddChild = (parent: PlanNode) => {
        setSelectedParent(parent);
        setSelectedNode(null);
        setModalOpen(true);
    };

    const handleEdit = (node: PlanNode) => {
        setSelectedNode(node);
        setSelectedParent(null);
        setModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this node and all its children?")) {
            try {
                await deleteNode(id).unwrap();
                toast.success("Node deleted successfully");
                refetch();
            } catch (err: any) {
                toast.error(err.data?.message || "Failed to delete node");
            }
        }
    };

    if (isLoading) {
        return <div className="p-8 text-center">Loading hierarchy...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={() => router.push("/plans")}
                        className="rounded-full"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            Plan Hierarchy: {version?.year} (v{version?.version_number})
                        </h1>
                        <p className="text-gray-500">
                            {version?.governmentStructure?.name || "Global Structure"}
                        </p>
                    </div>
                </div>
                <Button onClick={handleAddRoot} className="gap-2">
                    <Plus className="h-4 w-4" /> Add Root Area
                </Button>
            </div>

            <Card className="border-none shadow-none bg-transparent">
                <CardContent className="p-0 space-y-4">
                    {hierarchy.length > 0 ? (
                        hierarchy.map((node) => (
                            <NodeItem 
                                key={node.plan_node_id} 
                                node={node} 
                                level={0} 
                                onAddChild={handleAddChild}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                            />
                        ))
                    ) : (
                        <div className="p-12 text-center bg-white rounded-3xl border-2 border-dashed border-gray-200">
                            <div className="mx-auto w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-4">
                                <Plus className="h-6 w-6 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">No nodes yet</h3>
                            <p className="text-gray-500 mb-6">Start by adding a root strategic focus area to this plan version.</p>
                            <Button onClick={handleAddRoot} variant="outline">Add First Node</Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            <CreatePlanNodeModal
                isOpen={isModalOpen}
                onClose={() => {
                    setModalOpen(false);
                    setSelectedParent(null);
                    setSelectedNode(null);
                    refetch();
                }}
                planVersionId={versionId}
                parentNode={selectedParent}
                node={selectedNode}
            />
        </div>
    );
}
