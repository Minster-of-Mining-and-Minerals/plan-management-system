"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useGetMyPatientProfileQuery } from "@/redux/api/patientApi";
import { useUpdatePatientPortalProfileMutation } from "@/redux/api/patientPortalApi";
import Loading01 from "@/features/template/component/Loading/Loading01";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "@/i18n/navigation";
import { toast } from "sonner";
import { PatientPortalShell } from "../components/PatientPortalShell";
import { DemoBanner } from "../components/DemoBanner";

type EmergencyContact = {
  name?: string;
  relationship?: string;
  phone?: string;
  address?: string;
};

export function ProfileSettingsPage() {
  const { data: session } = useSession();
  const { data, isLoading } = useGetMyPatientProfileQuery();
  const [updateProfile, { isLoading: saving }] = useUpdatePatientPortalProfileMutation();

  const [phone, setPhone] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState("en");
  const [insurance, setInsurance] = useState<Record<string, string>>({});
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);

  const profile = data?.profile;

  useEffect(() => {
    if (!data) return;
    setPhone(data.phone_number || "");
    setPreferredLanguage(profile?.preferred_language || "en");
    const insuranceProfile = profile?.insurance_profile;
    if (insuranceProfile && typeof insuranceProfile === "object") {
      setInsurance(
        Object.fromEntries(
          Object.entries(insuranceProfile).map(([key, value]) => [
            key,
            value == null ? "" : String(value),
          ])
        )
      );
    }
    if (Array.isArray(profile?.emergency_contacts)) {
      setEmergencyContacts(profile.emergency_contacts as EmergencyContact[]);
    }
  }, [data, profile]);

  if (isLoading) return <Loading01 />;

  const handleSavePersonal = async () => {
    try {
      await updateProfile({ phone_number: phone }).unwrap();
      toast.success("Phone number updated");
    } catch {
      toast.error("Could not save profile");
    }
  };

  const handleSaveInsurance = async () => {
    try {
      await updateProfile({ insurance_profile: insurance }).unwrap();
      toast.success("Insurance information updated");
    } catch {
      toast.error("Could not save insurance");
    }
  };

  const handleSaveEmergency = async () => {
    try {
      await updateProfile({ emergency_contacts: emergencyContacts }).unwrap();
      toast.success("Emergency contacts updated");
    } catch {
      toast.error("Could not save emergency contacts");
    }
  };

  const handleSavePreferences = async () => {
    try {
      await updateProfile({ preferred_language: preferredLanguage }).unwrap();
      toast.success("Preferences saved");
    } catch {
      toast.error("Could not save preferences");
    }
  };

  const updateContact = (
    index: number,
    field: keyof EmergencyContact,
    value: string
  ) => {
    setEmergencyContacts((prev) =>
      prev.map((contact, i) =>
        i === index ? { ...contact, [field]: value } : contact
      )
    );
  };

  return (
    <PatientPortalShell
      title="Profile & Settings"
      description="Personal information, insurance, emergency contacts, and preferences."
    >
      <DemoBanner />

      <Tabs defaultValue="personal" className="space-y-6">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="insurance">Insurance</TabsTrigger>
          <TabsTrigger value="emergency">Emergency</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="personal">
          <Card className="border-border/60 max-w-2xl">
            <CardHeader>
              <CardTitle className="text-base">Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Full name</Label>
                <Input
                  className="mt-1"
                  defaultValue={session?.user?.name || data?.full_name || ""}
                  readOnly
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input className="mt-1" defaultValue={data?.email || ""} readOnly />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  className="mt-1"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              {profile?.patient_code ? (
                <div className="sm:col-span-2">
                  <Label>Patient ID</Label>
                  <div className="mt-1">
                    <Badge variant="secondary" className="text-sm px-3 py-1">
                      {profile.patient_code}
                    </Badge>
                  </div>
                </div>
              ) : null}
              <div>
                <Label>Date of birth</Label>
                <Input
                  className="mt-1"
                  defaultValue={profile?.date_of_birth?.slice(0, 10) || ""}
                  readOnly
                />
              </div>
              <div>
                <Label>Blood group</Label>
                <Input
                  className="mt-1"
                  defaultValue={profile?.blood_group || ""}
                  readOnly
                />
              </div>
              <div className="sm:col-span-2">
                <Button onClick={handleSavePersonal} disabled={saving}>
                  Save changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insurance">
          <Card className="border-border/60 max-w-2xl">
            <CardHeader>
              <CardTitle className="text-base">Insurance Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {[
                ["provider", "Provider"],
                ["policy_number", "Policy number"],
                ["group_number", "Group number"],
                ["coverage_type", "Coverage type"],
                ["policy_holder", "Policy holder"],
                ["valid_until", "Valid until"],
              ].map(([key, label]) => (
                <div key={key}>
                  <Label>{label}</Label>
                  <Input
                    className="mt-1"
                    value={insurance[key] ?? ""}
                    onChange={(e) =>
                      setInsurance((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                  />
                </div>
              ))}
              <div className="sm:col-span-2">
                <Button onClick={handleSaveInsurance} disabled={saving}>
                  Update insurance
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="emergency">
          <Card className="border-border/60 max-w-2xl">
            <CardHeader>
              <CardTitle className="text-base">Emergency Contacts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {emergencyContacts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No emergency contacts on file.</p>
              ) : (
                emergencyContacts.map((contact, i) => (
                  <div
                    key={i}
                    className="grid gap-4 sm:grid-cols-2 border-b border-border/40 pb-6 last:border-0"
                  >
                    <div>
                      <Label>Name</Label>
                      <Input
                        className="mt-1"
                        value={contact.name ?? ""}
                        onChange={(e) => updateContact(i, "name", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Relationship</Label>
                      <Input
                        className="mt-1"
                        value={contact.relationship ?? ""}
                        onChange={(e) =>
                          updateContact(i, "relationship", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input
                        className="mt-1"
                        value={contact.phone ?? ""}
                        onChange={(e) => updateContact(i, "phone", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Address</Label>
                      <Input
                        className="mt-1"
                        value={contact.address ?? ""}
                        onChange={(e) => updateContact(i, "address", e.target.value)}
                      />
                    </div>
                  </div>
                ))
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    setEmergencyContacts((prev) => [
                      ...prev,
                      { name: "", relationship: "", phone: "", address: "" },
                    ])
                  }
                >
                  Add contact
                </Button>
                <Button onClick={handleSaveEmergency} disabled={saving}>
                  Save contacts
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card className="border-border/60 max-w-2xl">
            <CardHeader>
              <CardTitle className="text-base">Password & Security</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Change your password through the secure change-password flow after login.
              </p>
              <Button variant="outline" asChild>
                <Link href="/change-password">Change password</Link>
              </Button>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium text-sm">Two-factor authentication</p>
                  <p className="text-xs text-muted-foreground">Extra security for your account</p>
                </div>
                <Switch disabled />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences">
          <Card className="border-border/60 max-w-2xl">
            <CardHeader>
              <CardTitle className="text-base">Notification & Language</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { label: "Email notifications", desc: "Appointments, labs, billing" },
                { label: "SMS reminders", desc: "Appointment day alerts" },
                { label: "Push notifications", desc: "Mobile app alerts" },
              ].map((pref) => (
                <div key={pref.label} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{pref.label}</p>
                    <p className="text-xs text-muted-foreground">{pref.desc}</p>
                  </div>
                  <Switch defaultChecked disabled />
                </div>
              ))}
              <div>
                <Label>Preferred language</Label>
                <Select value={preferredLanguage} onValueChange={setPreferredLanguage}>
                  <SelectTrigger className="mt-1 max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="am">አማርኛ (Amharic)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSavePreferences} disabled={saving}>
                Save preferences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PatientPortalShell>
  );
}
