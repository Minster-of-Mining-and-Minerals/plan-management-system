"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PharmacyNotificationsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pharmacy notifications</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Prescription received, fulfillment completed, and unavailable medication alerts
        appear here. Connect to pharmacy-portal notification API for live updates.
      </CardContent>
    </Card>
  );
}
