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
  Bell,
  Globe,
  SlidersHorizontal,
  Lock,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { AUTH_ROUTES } from "@/constants/authRoutes";
import { useDispatch } from "react-redux";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { actionFeedback } from "@/components/action-feedback";
import { ProfileImageUpload } from "@/components/common/ProfileImageUpload";
import { ProfileHeroBanner } from "@/components/common/ProfileHeroBanner";
import { UserAvatar } from "@/components/common/UserAvatar";
import {
  useGetProfileQuery,
  useUpdateProfileMutation,
} from "@/redux/api/userApi";
import { setUser } from "@/redux/slices/authSlice";
import { authApi } from "@/redux/api/authApi";
import Loading01 from "@/features/template/component/Loading/Loading01";

const profileFormSchema = z.object({
  full_name: z.string().min(2, "Full name must be at least 2 characters"),
  phone_number: z.string().optional().nullable(),
  profile_image: z.string().nullable().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export function RegionalProfilePage() {
  const dispatch = useDispatch();
  const [isEditing, setIsEditing] = useState(false);
  const { data: user, isLoading, isError, refetch } = useGetProfileQuery();
  const [updateProfile, { isLoading: isSaving }] = useUpdateProfileMutation();

  // Regional User Preferences State
  const [preferredLanguage, setPreferredLanguage] = useState<string>("en");
  const [notifyAssignments, setNotifyAssignments] = useState<boolean>(true);
  const [notifyReviews, setNotifyReviews] = useState<boolean>(true);
  const [notifyAnnouncements, setNotifyAnnouncements] = useState<boolean>(true);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: createFormResolver<ProfileFormValues>(profileFormSchema),
    defaultValues: {
      full_name: "",
      phone_number: "",
      profile_image: null,
    },
  });

  // Sync profile data into form
  useEffect(() => {
    if (user) {
      form.reset({
        full_name: user.full_name,
        phone_number: user.phone_number || "",
        profile_image: user.profile_image || null,
      });
    }
  }, [user, form]);

  // Load user settings from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedLang = localStorage.getItem("NEXT_LOCALE") || "en";
      setPreferredLanguage(storedLang);

      const storedPrefs = localStorage.getItem("REGIONAL_USER_PREFS");
      if (storedPrefs) {
        try {
          const parsed = JSON.parse(storedPrefs);
          if (parsed.notifyAssignments !== undefined) setNotifyAssignments(parsed.notifyAssignments);
          if (parsed.notifyReviews !== undefined) setNotifyReviews(parsed.notifyReviews);
          if (parsed.notifyAnnouncements !== undefined) setNotifyAnnouncements(parsed.notifyAnnouncements);
        } catch {
          // ignore parsing error
        }
      }
    }
  }, []);

  const handleSaveProfile = async (values: ProfileFormValues) => {
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
      actionFeedback.success("Regional profile updated successfully.");
      setIsEditing(false);
      refetch();
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } };
      actionFeedback.error(err?.data?.message || "Failed to update profile.");
    }
  };

  const handleSavePreferences = () => {
    setIsSavingPreferences(true);
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("NEXT_LOCALE", preferredLanguage);
        localStorage.setItem(
          "REGIONAL_USER_PREFS",
          JSON.stringify({
            notifyAssignments,
            notifyReviews,
            notifyAnnouncements,
          })
        );
      }
      actionFeedback.success("Workspace preferences saved successfully.");
    } catch {
      actionFeedback.error("Failed to save workspace preferences.");
    } finally {
      setIsSavingPreferences(false);
    }
  };

  if (isLoading) {
    return <Loading01 />;
  }

  if (isError || !user) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
        <p className="text-lg font-semibold text-foreground">Unable to load profile</p>
        <p className="text-sm text-muted-foreground">Please refresh and try again.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const watchedProfileImage = form.watch("profile_image");

  return (
    <div className="mx-auto w-full space-y-6 bg-background">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-card p-6 rounded-2xl border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">My Regional Profile</h1>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
              {user.region?.name || "Regional Workspace"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Administer your personal credentials, departmental assignment, and workspace preferences.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild className="gap-2">
            <Link href={AUTH_ROUTES.changePassword}>
              <KeyRound className="h-4 w-4 text-primary" />
              <span>Change Password</span>
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
                className="gap-1.5"
              >
                <X className="h-4 w-4" />
                <span>Cancel</span>
              </Button>
              <Button
                size="sm"
                onClick={form.handleSubmit(handleSaveProfile)}
                disabled={isSaving}
                className="gap-1.5"
              >
                <Save className="h-4 w-4" />
                <span>{isSaving ? "Saving..." : "Save Changes"}</span>
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
        {/* Left Column: Avatar & Contact, Organization */}
        <div className="space-y-6 lg:col-span-1">
          {/* Hero Identity Card */}
          <Card className="overflow-hidden border shadow-xs pt-0 rounded-2xl">
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
                    className="h-28 w-28 border-4 border-primary-foreground/40 text-3xl shadow-md"
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
                      placeholder="Enter full name"
                    />
                    {form.formState.errors.full_name && (
                      <p className="text-xs text-primary-foreground/80">
                        {form.formState.errors.full_name.message}
                      </p>
                    )}
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
                  {user.is_active ? "Active Account" : "Inactive Account"}
                </Badge>
              </div>
            </ProfileHeroBanner>

            <CardContent className="space-y-4 pt-6 text-sm">
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="font-medium text-xs text-muted-foreground">Email Address</p>
                  <p className="text-foreground font-semibold">{user.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-xs text-muted-foreground">Phone Number</p>
                  {isEditing ? (
                    <Input
                      {...form.register("phone_number")}
                      className="mt-1 h-9 text-xs"
                      placeholder="e.g. +251 911 234 567"
                    />
                  ) : (
                    <p className="text-foreground font-medium">
                      {user.phone_number || "Not provided"}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="font-medium text-xs text-muted-foreground">Member Since</p>
                  <p className="text-foreground font-medium">
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

          {/* Regional Organization Card */}
          <Card className="rounded-2xl border shadow-xs">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="flex items-center gap-2 text-base text-primary">
                <Building2 className="h-5 w-5" />
                <span>Regional Organization</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4 text-xs">
              <div>
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground font-bold">
                  Regional State / Territory
                </Label>
                <div className="mt-1 flex items-center justify-between rounded-xl border bg-muted/30 p-3">
                  <div className="flex items-center gap-2.5">
                    <Building2 className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground">
                      {user.region?.name || "Regional Administration"}
                    </span>
                  </div>
                  {user.region?.code && (
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {user.region.code}
                    </Badge>
                  )}
                </div>
              </div>

              <div>
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground font-bold">
                  Department / Directorate
                </Label>
                <div className="mt-1 flex items-center gap-2.5 rounded-xl border bg-muted/30 p-3">
                  <GitBranch className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <span className="text-sm font-semibold text-foreground block">
                      {user.regionalStructure?.name || "Regional Executive Office"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {user.regionalStructure
                        ? `Internal Department Structure`
                        : "Regional Leadership Unit"}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Roles, Permissions, Workspace Preferences, Security */}
        <div className="space-y-6 lg:col-span-2">
          {/* Assigned Roles */}
          <Card className="rounded-2xl border shadow-xs">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="flex items-center gap-2 text-base text-primary">
                <Shield className="h-5 w-5" />
                <span>Assigned Regional Roles</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Roles define your regional management and plan execution authorities.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-2">
                {user.roles?.length ? (
                  user.roles.map((role) => (
                    <Badge
                      key={role.role_id}
                      variant="secondary"
                      className="px-3 py-1.5 text-xs font-semibold bg-primary/10 text-primary border-primary/20"
                    >
                      <Shield className="h-3 w-3 mr-1" />
                      {role.name}
                    </Badge>
                  ))
                ) : (
                  <p className="text-xs italic text-muted-foreground">No roles assigned.</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Assigned Permission Groups */}
          <Card className="rounded-2xl border shadow-xs">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="flex items-center gap-2 text-base text-primary">
                <Users className="h-5 w-5" />
                <span>Permission Groups</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Categorized permission groupings attached to your account.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {user.permissionGroups?.length ? (
                  user.permissionGroups.map((group) => (
                    <div
                      key={group.permission_group_id}
                      className="rounded-xl border bg-muted/20 p-3.5 space-y-1"
                    >
                      <p className="font-semibold text-xs text-primary">{group.name}</p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {group.description || "Active regional policy group"}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs italic text-muted-foreground md:col-span-2">
                    No explicit permission groups assigned. Permissions are inherited via roles.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Workspace Preferences & Settings (Similar to private section settings) */}
          <Card className="rounded-2xl border shadow-xs">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="flex items-center gap-2 text-base text-primary">
                <SlidersHorizontal className="h-5 w-5" />
                <span>Regional Settings & Preferences</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Configure your language preference and notification alerts for milestone updates.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-4 text-xs">
              {/* Language Selection */}
              <div className="space-y-1.5 max-w-sm">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-primary" />
                  <span>Interface Language</span>
                </Label>
                <Select
                  value={preferredLanguage}
                  onValueChange={(val) => setPreferredLanguage(val)}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English (Default)</SelectItem>
                    <SelectItem value="am">አማርኛ (Amharic)</SelectItem>
                    <SelectItem value="om">Afaan Oromoo</SelectItem>
                    <SelectItem value="ti">ትግርኛ (Tigrinya)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Notification Toggles */}
              <div className="space-y-3 pt-3 border-t">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Bell className="h-3.5 w-3.5 text-primary" />
                  <span>Workspace Notifications</span>
                </Label>

                <div className="flex items-center justify-between rounded-xl border p-3 bg-muted/20">
                  <div className="space-y-0.5">
                    <span className="font-semibold text-xs text-foreground block">
                      Milestone Accountability Alerts
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Notify me when directorates or officers are assigned or reassigned to a milestone.
                    </span>
                  </div>
                  <Switch
                    checked={notifyAssignments}
                    onCheckedChange={setNotifyAssignments}
                  />
                </div>

                <div className="flex items-center justify-between rounded-xl border p-3 bg-muted/20">
                  <div className="space-y-0.5">
                    <span className="font-semibold text-xs text-foreground block">
                      Plan Lifecycle & Review Status Updates
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Notify me when draft plans are submitted, approved, or validated.
                    </span>
                  </div>
                  <Switch
                    checked={notifyReviews}
                    onCheckedChange={setNotifyReviews}
                  />
                </div>

                <div className="flex items-center justify-between rounded-xl border p-3 bg-muted/20">
                  <div className="space-y-0.5">
                    <span className="font-semibold text-xs text-foreground block">
                      Regional Announcements & System Updates
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Receive notices and critical announcements from the regional administrator.
                    </span>
                  </div>
                  <Switch
                    checked={notifyAnnouncements}
                    onCheckedChange={setNotifyAnnouncements}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  size="sm"
                  onClick={handleSavePreferences}
                  disabled={isSavingPreferences}
                  className="gap-1.5"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>Save Preferences</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Account Security & Activity */}
          <Card className="rounded-2xl border shadow-xs">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="flex items-center gap-2 text-base text-primary">
                <Calendar className="h-5 w-5" />
                <span>Account Activity & Security</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2 pt-4 text-xs">
              <div>
                <p className="font-bold uppercase tracking-wide text-muted-foreground text-[10px]">
                  Last Sign-in
                </p>
                <p className="mt-1 text-xs font-semibold text-foreground">
                  {user.last_login_at
                    ? new Date(user.last_login_at).toLocaleString()
                    : "Active in current session"}
                </p>
              </div>

              <div>
                <p className="font-bold uppercase tracking-wide text-muted-foreground text-[10px]">
                  Password Last Changed
                </p>
                <p className="mt-1 text-xs font-semibold text-foreground">
                  {user.password_changed_at
                    ? new Date(user.password_changed_at).toLocaleString()
                    : "No record / Default password"}
                </p>
              </div>

              <div className="md:col-span-2 pt-3 border-t flex flex-wrap items-center justify-between gap-3">
                <div className="text-muted-foreground">
                  <span className="font-semibold text-foreground block">Credentials Security</span>
                  <span className="text-[11px]">Keep your regional credentials secure and update passwords regularly.</span>
                </div>
                <Button variant="outline" size="sm" asChild className="gap-1.5">
                  <Link href={AUTH_ROUTES.changePassword}>
                    <Lock className="h-3.5 w-3.5 text-primary" />
                    <span>Update Credentials</span>
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default RegionalProfilePage;

