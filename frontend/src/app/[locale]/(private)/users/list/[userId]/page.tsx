"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { createFormResolver } from "@/lib/zod-form";
import * as z from "zod";
import { 
  useGetUserByIdQuery, 
  useDeleteUserMutation,
  useUpdateUserMutation 
} from "@/redux/api/userApi";
import { useGetRolesQuery } from "@/redux/api/roleApi";
import { useGetGovernmentStructuresQuery } from "@/redux/api/governmentStructureApi";
import { useGetInternalStructuresQuery } from "@/redux/api/internalStructureApi";
import { 
  User2Icon, 
  Mail, 
  Phone, 
  Calendar, 
  Shield, 
  Users, 
  Building2, 
  GitBranch, 
  Trash2, 
  Edit, 
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Save,
  X
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
import { actionFeedback } from "@/components/action-feedback";
import DetailHeader from "@/components/common/DetailHeader";
import { useParams, useRouter } from "next/navigation";

const userFormSchema = z.object({
  full_name: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone_number: z.string().optional().nullable(),
  is_active: z.boolean(),
  government_structure_id: z.string().optional().nullable(),
  internal_structure_id: z.string().optional().nullable(),
  role_ids: z.array(z.string()).min(1, "At least one role must be assigned"),
});

type UserFormValues = z.infer<typeof userFormSchema>;

const UserViewPage = () => {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;

  const { data: user, isLoading, isError } = useGetUserByIdQuery(userId);
  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();
  const [deleteUser, { isLoading: isDeleting }] = useDeleteUserMutation();

  const [isEditing, setIsEditing] = useState(false);

  const { data: allRoles = [] } = useGetRolesQuery({ is_active: true });
  const { data: govStructures = [] } = useGetGovernmentStructuresQuery({ is_active: true });
  
  const form = useForm<UserFormValues>({
    resolver: createFormResolver<UserFormValues>(userFormSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone_number: "",
      is_active: true,
      government_structure_id: "",
      internal_structure_id: "",
      role_ids: [],
    },
  });

  const selectedGovId = form.watch("government_structure_id");
  const { data: internalStructures = [] } = useGetInternalStructuresQuery(
    { government_structure_id: selectedGovId || undefined, is_active: true },
    { skip: !selectedGovId }
  );

  useEffect(() => {
    if (user) {
      form.reset({
        full_name: user.full_name,
        email: user.email,
        phone_number: user.phone_number || "",
        is_active: user.is_active,
        government_structure_id: user.government_structure_id || "",
        internal_structure_id: user.internal_structure_id || "",
        role_ids: user.roles?.map((r) => r.role_id) || [],
      });
    }
  }, [user, form]);

  const handleSave = async (values: UserFormValues) => {
    try {
      await updateUser({
        id: userId,
        data: {
          full_name: values.full_name,
          email: values.email,
          phone_number: values.phone_number || undefined,
          role_ids: values.role_ids,
          government_structure_id: values.government_structure_id || undefined,
          internal_structure_id: values.internal_structure_id || undefined,
          is_active: values.is_active,
        },
      }).unwrap();
      actionFeedback.success("User updated successfully");
      setIsEditing(false);
    } catch (error: any) {
      actionFeedback.error(error?.data?.message || "Failed to update user");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FBFC]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#094C81]"></div>
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F9FBFC] gap-4">
        <XCircle className="h-16 w-16 text-red-500" />
        <h2 className="text-xl font-semibold text-[#094C81]">User Not Found</h2>
        <Button variant="outline" onClick={() => router.push("/users/list")}>
          Back to Users List
        </Button>
      </div>
    );
  }

  const handleDelete = async () => {
    if (await actionFeedback.confirm("Are you sure you want to delete this user?", { destructive: true })) {
      try {
        await deleteUser(userId).unwrap();
        actionFeedback.success("User deleted successfully");
        router.push("/users/list");
      } catch (error: any) {
        actionFeedback.error(error?.data?.message || "Failed to delete user");
      }
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F9FBFC] p-6 space-y-6">
      {/* Header with Breadcrumbs and Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <DetailHeader
          breadcrumbs={[
            { title: "Users", link: "/users/list" },
            { title: user.full_name, link: "" },
          ]}
        />
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} disabled={isUpdating}>
                <X className="mr-2 h-4 w-4" /> Cancel
              </Button>
              <Button size="sm" onClick={form.handleSubmit(handleSave)} disabled={isUpdating}>
                <Save className="mr-2 h-4 w-4" /> {isUpdating ? "Saving..." : "Save Changes"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Edit className="mr-2 h-4 w-4" /> Edit User
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isDeleting}>
                <Trash2 className="mr-2 h-4 w-4" /> {isDeleting ? "Deleting..." : "Delete User"}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Profile Card */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="overflow-hidden">
            <CardHeader className="bg-[#094C81] text-white text-center pb-8 pt-8">
              <div className="flex justify-center mb-4">
                <div className="relative w-24 h-24 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border-2 border-white/50">
                  <User2Icon className="h-12 w-12 text-white" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold">
                {isEditing ? (
                  <div className="space-y-1">
                    <Input 
                      {...form.register("full_name")} 
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50 text-center" 
                    />
                    {form.formState.errors.full_name && (
                      <p className="text-[10px] text-red-300">{form.formState.errors.full_name.message}</p>
                    )}
                  </div>
                ) : (
                  user.full_name
                )}
              </CardTitle>
              <div className="text-white/80 text-sm mt-1">
                {isEditing ? (
                  <div className="space-y-1">
                    <Input 
                      {...form.register("email")} 
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50 text-center h-8" 
                    />
                    {form.formState.errors.email && (
                      <p className="text-[10px] text-red-300">{form.formState.errors.email.message}</p>
                    )}
                  </div>
                ) : (
                  user.email
                )}
              </div>
              <div className="mt-4 flex justify-center">
                {isEditing ? (
                  <Controller
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                      <Select
                        onValueChange={(val) => field.onChange(val === "active")}
                        value={field.value ? "active" : "inactive"}
                      >
                        <SelectTrigger className="w-[120px] bg-white/10 border-white/20 text-white">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                ) : (
                  <Badge variant={user.is_active ? "default" : "destructive"} className="px-3 py-1">
                    {user.is_active ? (
                      <><CheckCircle2 className="mr-1 h-3 w-3" /> Active</>
                    ) : (
                      <><XCircle className="mr-1 h-3 w-3" /> Inactive</>
                    )}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600 font-medium w-24">Email:</span>
                {isEditing ? (
                  <div className="flex-1 space-y-1">
                    <Input {...form.register("email")} className="h-8" />
                  </div>
                ) : (
                  <span className="text-gray-900">{user.email}</span>
                )}
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600 font-medium w-24">Phone:</span>
                {isEditing ? (
                  <div className="flex-1 space-y-1">
                    <Input {...form.register("phone_number")} className="h-8" />
                  </div>
                ) : (
                  <span className="text-gray-900">{user.phone_number || "Not provided"}</span>
                )}
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

          {/* Structure Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-[#094C81]">
                <Building2 className="h-5 w-5" /> Sector & Department
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  Sector Structure
                </p>
                {isEditing ? (
                  <div className="space-y-2">
                    <Controller
                      control={form.control}
                      name="government_structure_id"
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select sector structure" />
                          </SelectTrigger>
                          <SelectContent>
                            {govStructures.map((s) => (
                              <SelectItem key={s.government_structure_id} value={s.government_structure_id!}>
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {form.formState.errors.government_structure_id && (
                      <p className="text-xs text-red-500">{form.formState.errors.government_structure_id.message}</p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border">
                    <Building2 className="h-4 w-4 text-[#094C81]" />
                    <span className="text-sm font-medium text-gray-700">
                      {user.governmentStructure?.name || "No sector structure assigned"}
                    </span>
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  Department
                </p>
                {isEditing ? (
                  <div className="space-y-2">
                    <Controller
                      control={form.control}
                      name="internal_structure_id"
                      render={({ field }) => (
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value || ""} 
                          disabled={!selectedGovId}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={selectedGovId ? "Select department" : "Select sector structure first"} />
                          </SelectTrigger>
                          <SelectContent>
                            {internalStructures.map((s) => (
                              <SelectItem key={s.internal_structure_id} value={s.internal_structure_id!}>
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {form.formState.errors.internal_structure_id && (
                      <p className="text-xs text-red-500">{form.formState.errors.internal_structure_id.message}</p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border">
                    <GitBranch className="h-4 w-4 text-[#094C81]" />
                    <span className="text-sm font-medium text-gray-700">
                      {user.internalStructure?.name || "No department assigned"}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Roles and Permissions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Roles */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-[#094C81]">
                <Shield className="h-5 w-5" /> Assigned Roles
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {allRoles.map((role) => (
                      <div key={role.role_id} className="flex items-center space-x-2 border p-2 rounded-md hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          id={`role-${role.role_id}`}
                          className="h-4 w-4 rounded border-gray-300 text-[#094C81] focus:ring-[#094C81]"
                          checked={form.watch("role_ids").includes(role.role_id)}
                          onChange={(e) => {
                            const currentRoles = form.getValues("role_ids");
                            if (e.target.checked) {
                              form.setValue("role_ids", [...currentRoles, role.role_id], { shouldValidate: true });
                            } else {
                              form.setValue("role_ids", currentRoles.filter(id => id !== role.role_id), { shouldValidate: true });
                            }
                          }}
                        />
                        <Label htmlFor={`role-${role.role_id}`} className="text-sm font-medium cursor-pointer">
                          {role.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {form.formState.errors.role_ids && (
                    <p className="text-xs text-red-500 font-medium">{form.formState.errors.role_ids.message}</p>
                  )}
                </div>
              ) : (
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
              )}
            </CardContent>
          </Card>

          {/* Permission Groups */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-[#094C81]">
                <Users className="h-5 w-5" /> Permission Groups
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {user.permissionGroups && user.permissionGroups.length > 0 ? (
                  user.permissionGroups.map((group) => (
                    <div key={group.permission_group_id} className="p-4 bg-gray-50 rounded-xl border flex flex-col gap-1">
                      <span className="font-bold text-[#094C81]">{group.name}</span>
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
              <CardTitle className="text-lg flex items-center gap-2 text-[#094C81]">
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

export default UserViewPage;
