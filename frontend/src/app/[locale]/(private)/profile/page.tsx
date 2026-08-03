"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    useGetUserByIdQuery,
} from "@/redux/api/userApi";
import { DataTable } from "@/features/template/component/tableList/DataTable";
import { TableLayout } from "@/features/template/component/tableList/TableLayout";
import { ColumnDef } from "@tanstack/react-table";
import {
    User2Icon,
    Mail,
    Phone,
    Calendar,
    Shield,
    Users,
    CheckCircle2,
    XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import DetailHeader from "@/components/common/DetailHeader";
import { UserSignatureSettings } from "@/features/profile/UserSignatureSettings";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

const userFormSchema = z.object({
    full_name: z.string().min(2, "Full name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    phone_number: z.string().optional().nullable(),
    is_active: z.boolean(),
    role_ids: z.array(z.string()).min(1, "At least one role must be assigned"),
});

type UserFormValues = z.infer<typeof userFormSchema>;

const ProfilePage = () => {
    const params = useParams();
    const router = useRouter();
    const { data: session } = useSession();
    const userId = session?.user?.id as string;


    const { data: user, isLoading, isError } = useGetUserByIdQuery(userId);

    const form = useForm<UserFormValues>({
        resolver: zodResolver(userFormSchema),
        defaultValues: {
            full_name: "",
            email: "",
            phone_number: "",
            is_active: true,
            role_ids: [],
        },
    });


    useEffect(() => {
        if (user) {
            form.reset({
                full_name: user.full_name,
                email: user.email,
                phone_number: user.phone_number || "",
                is_active: user.is_active,
                role_ids: user.roles?.map((r) => r.role_id) || [],
            });
        }
    }, [user, form]);


    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-auth-background">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (isError || !user) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-auth-background gap-4">
                <XCircle className="h-16 w-16 text-red-500" />
                <h2 className="text-xl font-semibold text-primary">User Not Found</h2>
                <Button variant="outline" onClick={() => router.push("/users/list")}>
                    Back to Users List
                </Button>
            </div>
        );
    }


    return (
        <div className="min-h-screen w-full bg-background p-6 space-y-6">
            {/* Header with Breadcrumbs and Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <DetailHeader
                    breadcrumbs={[
                        { title: "Profile", link: "/profile" },
                        { title: user.full_name, link: "" },
                    ]}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Profile Card */}
                <div className="lg:col-span-1 space-y-6">
                    <Card className="overflow-hidden pt-0">
                        <CardHeader className="bg-primary text-white text-center pb-8 pt-8">
                            <div className="flex justify-center mb-4">
                                <div className="relative w-24 h-24 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border-2 border-white/50">
                                    <User2Icon className="h-12 w-12 text-white" />
                                </div>
                            </div>
                            <CardTitle className="text-2xl font-bold">
                                {user.full_name}
                            </CardTitle>
                            <div className="text-white/80 text-sm mt-1">
                                {user.email}
                            </div>
                            <div className="mt-4 flex justify-center">
                                <Badge variant={user.is_active ? "default" : "destructive"} className="px-3 py-1">
                                    {user.is_active ? (
                                        <><CheckCircle2 className="mr-1 h-3 w-3" /> Active</>
                                    ) : (
                                        <><XCircle className="mr-1 h-3 w-3" /> Inactive</>
                                    )}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                            <div className="flex items-center gap-3 text-sm">
                                <Mail className="h-4 w-4 text-gray-400" />
                                <span className="text-gray-600 font-medium w-24">Email:</span>
                                <span className="text-gray-900">{user.email}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <Phone className="h-4 w-4 text-gray-400" />
                                <span className="text-gray-600 font-medium w-24">Phone:</span>
                                <span className="text-gray-900">{user.phone_number || "Not provided"}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <Calendar className="h-4 w-4 text-gray-400" />
                                <span className="text-gray-600 font-medium w-24">Joined:</span>
                                <span className="text-gray-900">
                                    {new Date(user.created_at).toLocaleDateString("en-US", {
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric"
                                    })}
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                </div>

                {/* Right Column: Roles and Permissions */}
                <div className="lg:col-span-2 space-y-6">
                    <UserSignatureSettings userId={userId} />
                    {/* Roles */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2 text-primary">
                                <Shield className="h-5 w-5" /> Assigned Roles
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-2">
                                {user.roles && user.roles.length > 0 ? (
                                    user.roles.map((role) => (
                                        <Badge key={role.role_id} variant="secondary" className="px-3 py-1.5 text-sm">
                                            {role.name}
                                        </Badge>
                                    ))
                                ) : (
                                    <p className="text-sm text-gray-500 italic">No roles assigned to this user.</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Permission Groups */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2 text-primary">
                                <Users className="h-5 w-5" /> Permission Groups
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {user.permissionGroups && user.permissionGroups.length > 0 ? (
                                    user.permissionGroups.map((group) => (
                                        <div key={group.permission_group_id} className="p-4 bg-gray-50 rounded-xl border flex flex-col gap-1">
                                            <span className="font-bold text-primary">{group.name}</span>
                                            <span className="text-xs text-gray-500">{group.description || "No description provided"}</span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-gray-500 italic col-span-2">No permission groups assigned.</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Activity Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2 text-primary">
                                <Calendar className="h-5 w-5" /> System Activity
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                    Last Login
                                </p>
                                <p className="text-sm font-medium text-gray-900">
                                    {user.last_login_at ? new Date(user.last_login_at).toLocaleString() : "Never logged in"}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                    Password Last Changed
                                </p>
                                <p className="text-sm font-medium text-gray-900">
                                    {user.password_changed_at ? new Date(user.password_changed_at).toLocaleString() : "Never changed"}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                    Force Password Reset on Next Login
                                </p>
                                <Badge variant={user.is_first_logged_in ? "destructive" : "outline"} className="mt-1">
                                    {user.is_first_logged_in ? "Yes (Required)" : "No"}
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;