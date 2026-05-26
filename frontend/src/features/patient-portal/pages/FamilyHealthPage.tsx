"use client";

import { useState } from "react";
import { Plus, Users, ArrowRightLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PatientPortalShell } from "../components/PatientPortalShell";
import { DemoBanner } from "../components/DemoBanner";
import { MOCK_FAMILY_MEMBERS, formatDate } from "../data/mockPatientPortalData";

export function FamilyHealthPage() {
  const [activeProfile, setActiveProfile] = useState<string | null>(null);

  return (
    <PatientPortalShell
      title="Family Health"
      description="Manage linked family members, switch profiles, and coordinate care for dependents."
      action={
        <Button variant="outline" className="gap-2" onClick={() => toast.message("Add member — demo")}>
          <Plus className="h-4 w-4" />
          Link Family Member
        </Button>
      }
    >
      <DemoBanner />

      <Card className="border-primary/20 bg-gradient-to-r from-section-accent-subtle-20 to-transparent">
        <CardContent className="p-5 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <ArrowRightLeft className="h-6 w-6" />
          </div>
          <div>
            <p className="font-medium">Profile switching</p>
            <p className="text-sm text-muted-foreground">
              Select a family member below to view their health dashboard (demo UI).
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {MOCK_FAMILY_MEMBERS.map((member) => (
          <Card
            key={member.id}
            className={`cursor-pointer border-border/60 transition-all hover:shadow-lg ${
              activeProfile === member.id ? "ring-2 ring-primary border-primary/50" : ""
            }`}
            onClick={() => {
              setActiveProfile(member.id);
              toast.success(`Switched to ${member.name} — demo`, {
                description: "Family profile context would load their records.",
              });
            }}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <Avatar className="h-14 w-14">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-section-accent text-primary-foreground text-lg font-semibold">
                    {member.avatarInitials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-base">{member.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {member.relationship} · Age {member.age}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {member.lastVisit ? (
                <p className="text-xs text-muted-foreground">
                  Last visit: {formatDate(member.lastVisit)}
                </p>
              ) : null}
              {member.conditions?.length ? (
                <div className="flex flex-wrap gap-1">
                  {member.conditions.map((c) => (
                    <Badge key={c} variant="secondary" className="text-[10px]">
                      {c}
                    </Badge>
                  ))}
                </div>
              ) : null}
              <Button variant="outline" size="sm" className="w-full gap-2">
                <Users className="h-3.5 w-3.5" />
                View Health Record
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-dashed border-border/60">
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          Child and elderly parent accounts support guardian access, appointment booking on
          behalf, and shared emergency contacts — static demo only.
        </CardContent>
      </Card>
    </PatientPortalShell>
  );
}
