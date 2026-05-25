"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PatientDashboardPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>My Health Dashboard</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Welcome to your patient portal. Medical records and appointments will
          appear here.
        </p>
      </CardContent>
    </Card>
  );
}
