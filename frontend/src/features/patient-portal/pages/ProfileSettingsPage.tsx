"use client";

import { useSession } from "next-auth/react";
import { useGetMyPatientProfileQuery } from "@/redux/api/patientApi";
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
import {
  MOCK_EMERGENCY_CONTACTS,
  MOCK_INSURANCE,
} from "../data/mockPatientPortalData";

export function ProfileSettingsPage() {
  const { data: session } = useSession();
  const { data, isLoading } = useGetMyPatientProfileQuery();

  if (isLoading) return <Loading01 />;

  const profile = data?.profile;

  const handleSave = () => {
    toast.success("Settings saved — demo", {
      description: "Profile updates use the live API when fields are wired.",
    });
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
                <Input className="mt-1" defaultValue={data?.phone_number || ""} />
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
                  defaultValue={profile?.date_of_birth?.slice(0, 10) || "1990-05-12"}
                />
              </div>
              <div>
                <Label>Blood group</Label>
                <Input className="mt-1" defaultValue={profile?.blood_group || "O+"} />
              </div>
              <div className="sm:col-span-2">
                <Button onClick={handleSave}>Save changes</Button>
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
                ["Provider", MOCK_INSURANCE.provider],
                ["Policy number", MOCK_INSURANCE.policyNumber],
                ["Group number", MOCK_INSURANCE.groupNumber],
                ["Coverage type", MOCK_INSURANCE.coverageType],
                ["Policy holder", MOCK_INSURANCE.policyHolder],
                ["Valid until", MOCK_INSURANCE.validUntil],
              ].map(([label, value]) => (
                <div key={label}>
                  <Label>{label}</Label>
                  <Input className="mt-1" defaultValue={value} />
                </div>
              ))}
              <div className="sm:col-span-2">
                <Button onClick={handleSave}>Update insurance</Button>
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
              {MOCK_EMERGENCY_CONTACTS.map((contact, i) => (
                <div key={i} className="grid gap-4 sm:grid-cols-2 border-b border-border/40 pb-6 last:border-0">
                  <div>
                    <Label>Name</Label>
                    <Input className="mt-1" defaultValue={contact.name} />
                  </div>
                  <div>
                    <Label>Relationship</Label>
                    <Input className="mt-1" defaultValue={contact.relationship} />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input className="mt-1" defaultValue={contact.phone} />
                  </div>
                  <div>
                    <Label>Address</Label>
                    <Input className="mt-1" defaultValue={contact.address} />
                  </div>
                </div>
              ))}
              <Button variant="outline" onClick={() => toast.message("Add contact — demo")}>
                Add contact
              </Button>
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
                  <Switch defaultChecked />
                </div>
              ))}
              <div>
                <Label>Preferred language</Label>
                <Select defaultValue="am">
                  <SelectTrigger className="mt-1 max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="am">አማርኛ (Amharic)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSave}>Save preferences</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PatientPortalShell>
  );
}
