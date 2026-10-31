"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { createFormResolver } from "@/lib/zod-form";
import * as z from "zod";
import {
  Building2,
  Calendar,
  CheckCircle2,
  GitBranch,
  KeyRound,
  Mail,
  Phone,
  Save,
  Shield,
  Users,
  X,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { AUTH_ROUTES } from "@/constants/authRoutes";
import { useDispatch } from "react-redux";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { actionFeedback } from "@/components/action-feedback";
import { ProfileImageUpload } from "@/components/common/ProfileImageUpload";
import { ProfileHeroBanner } from "@/components/common/ProfileHeroBanner";
import { SectorLogo } from "@/components/common/SectorLogo";
import { UserAvatar } from "@/components/common/UserAvatar";
import { UserSessionsSection } from "@/features/security/UserSessionsSection";
import {
  useGetProfileQuery,
  useUpdateProfileMutation,
} from "@/redux/api/userApi";
import { setUser } from "@/redux/slices/authSlice";
import { authApi } from "@/redux/api/authApi";

const profileFormSchema = z.object({
  full_name: z.string().min(2, "Full name must be at least 2 characters"),
  phone_number: z.string().optional().nullable(),
  profile_image: z.string().nullable().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export function ProfilePage() {
  const dispatch = useDispatch();
  const [isEditing, setIsEditing] = useState(false);
  const { data: user, isLoading, isError, refetch } = useGetProfileQuery();
  const [updateProfile, { isLoading: isSaving }] = useUpdateProfileMutation();

  const form = useForm<ProfileFormValues>({
    resolver: createFormResolver<ProfileFormValues>(profileFormSchema),
    defaultValues: {
      full_name: "",
      phone_number: "",
      profile_image: null,
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        full_name: user.full_name,
        phone_number: user.phone_number || "",
        profile_image: user.profile_image || null,
      });
    }
  }, [user, form]);

  const handleSave = async (values: ProfileFormValues) => {
    try {
      const updated = await updateProfile({
        full_name: values.full_name,
        phone_number: values.phone_number || null,
        profile_image: values.profile_image ?? null,
      }).unwrap();

      dispatch(
        setUser({
          user_id: updated.user_id,
          full_name: updated.full_name,
          email: updated.email,
          phone_number: updated.phone_number || "",
          profile_image: updated.profile_image || null,
          is_first_logged_in: updated.is_first_logged_in,
        })
      );
      dispatch(authApi.util.invalidateTags(["User"]));
      actionFeedback.success("Profile updated successfully");
      setIsEditing(false);
      refetch();
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } };
      actionFeedback.error(err?.data?.message || "Failed to update profile");
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
        <p className="text-lg font-semibold text-foreground">Unable to load profile</p>
        <p className="text-sm text-muted-foreground">Please refresh and try again.</p>
      </div>
    );
  }

  const watchedProfileImage = form.watch("profile_image");

  return (
    <div className="mx-auto w-full space-y-6 bg-background p-1 sm:p-2">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">My Profile</h1>
          <p className="text-sm text-muted-foreground">
            View your account details and manage your personal information.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={AUTH_ROUTES.changePassword}>
              <KeyRound className="mr-2 h-4 w-4" />
              Change Password
            </Link>
          </Button>
          {isEditing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  form.reset({
                    full_name: user.full_name,
                    phone_number: user.phone_number || "",
                    profile_image: user.profile_image || null,
                  });
                  setIsEditing(false);
                }}
                disabled={isSaving}
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button size="sm" onClick={form.handleSubmit(handleSave)} disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => setIsEditing(true)}>
              Edit Profile
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <Card className="overflow-hidden border-0 shadow-md pt-0">
            <ProfileHeroBanner className="px-6 pb-8 pt-10 text-center">
              <div className="mb-4 flex justify-center">
                {isEditing ? (
                  <ProfileImageUpload
                    label=""
                    value={watchedProfileImage}
                    onChange={(value) => form.setValue("profile_image", value)}
                    previewClassName="border-primary-foreground/40 bg-primary-foreground/10"
                  />
                ) : (
                  <UserAvatar
                    name={user.full_name}
                    profileImage={user.profile_image}
                    className="h-28 w-28 border-4 border-primary-foreground/40 text-3xl"
                    fallbackClassName="bg-primary-foreground/20 text-primary-foreground text-2xl"
                  />
                )}
              </div>
              <h2 className="text-2xl font-bold">
                {isEditing ? (
                  <div className="space-y-1">
                    <Input
                      {...form.register("full_name")}
                      className="border-primary-foreground/20 bg-primary-foreground/10 text-center text-primary-foreground placeholder:text-primary-foreground/50"
                    />
                    {form.formState.errors.full_name ? (
                      <p className="text-xs text-primary-foreground/80">
                        {form.formState.errors.full_name.message}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  user.full_name
                )}
              </h2>
              <p className="mt-1 text-sm text-primary-foreground/80">{user.email}</p>
              <div className="mt-4 flex justify-center">
                <Badge
                  variant={user.is_active ? "secondary" : "destructive"}
                  className="bg-primary-foreground/15 text-primary-foreground hover:bg-primary-foreground/20"
                >
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  {user.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </ProfileHeroBanner>
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-start gap-3 text-sm">
                <Mail className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium text-muted-foreground">Email</p>
                  <p className="text-foreground">{user.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <Phone className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="font-medium text-muted-foreground">Phone</p>
                  {isEditing ? (
                    <Input {...form.register("phone_number")} className="mt-1 h-9" />
                  ) : (
                    <p className="text-foreground">{user.phone_number || "Not provided"}</p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <Calendar className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium text-muted-foreground">Member since</p>
                  <p className="text-foreground">
                    {new Date(user.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-primary">
                <Building2 className="h-5 w-5" />
                Organization
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Sector
                </Label>
                <div className="mt-1 flex items-center gap-2 rounded-lg border bg-muted/30 p-3">
                  <SectorLogo
                    name={user.governmentStructure?.name || "Sector"}
                    logoPath={user.governmentStructure?.logo_path}
                    size="sm"
                  />
                  <span className="text-sm font-medium">
                    {user.governmentStructure?.name || "Not assigned"}
                  </span>
                </div>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Department
                </Label>
                <div className="mt-1 flex items-center gap-2 rounded-lg border bg-muted/30 p-3">
                  <GitBranch className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">
                    {user.internalStructure?.name || "Not assigned"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-primary">
                <Shield className="h-5 w-5" />
                Assigned Roles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {user.roles?.length ? (
                  user.roles.map((role) => (
                    <Badge key={role.role_id} variant="secondary" className="px-3 py-1.5 text-sm">
                      {role.name}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm italic text-muted-foreground">No roles assigned.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-primary">
                <Users className="h-5 w-5" />
                Permission Groups
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {user.permissionGroups?.length ? (
                  user.permissionGroups.map((group) => (
                    <div
                      key={group.permission_group_id}
                      className="rounded-xl border bg-muted/20 p-4"
                    >
                      <p className="font-semibold text-primary">{group.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {group.description || "No description provided"}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm italic text-muted-foreground md:col-span-2">
                    No permission groups assigned.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-primary">
                <Calendar className="h-5 w-5" />
                Account Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Last login
                </p>
                <p className="mt-1 text-sm font-medium">
                  {user.last_login_at
                    ? new Date(user.last_login_at).toLocaleString()
                    : "Never logged in"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Password last changed
                </p>
                <p className="mt-1 text-sm font-medium">
                  {user.password_changed_at
                    ? new Date(user.password_changed_at).toLocaleString()
                    : "Never changed"}
                </p>
              </div>
            </CardContent>
          </Card>

          <UserSessionsSection />
        </div>
      </div>
    </div>
  );
}
