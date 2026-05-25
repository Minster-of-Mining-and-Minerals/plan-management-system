"use client";

import {
  Bell,
  Calendar,
  FileText,
  Smartphone,
  Stethoscope,
  Users,
} from "lucide-react";
import { FeatureGrid } from "./FeatureGrid";
import { SectionHeader } from "./SectionReveal";

const PATIENT_FEATURES = [
  { title: "Appointments", description: "Book, reschedule, and receive reminders seamlessly.", icon: Calendar },
  { title: "Prescriptions", description: "Access medication history and refill requests.", icon: FileText },
  { title: "Lab Results", description: "Secure access to diagnostics as soon as they are released.", icon: Stethoscope },
  { title: "Mobile Access", description: "Patient portal optimized for any device.", icon: Smartphone },
  { title: "Notifications", description: "Real-time updates across care events.", icon: Bell },
];

const DOCTOR_FEATURES = [
  { title: "Unified EMR", description: "Complete clinical documentation in one workspace.", icon: FileText },
  { title: "Voice Notes", description: "Capture consultations faster with structured notes.", icon: Stethoscope },
  { title: "Patient Insights", description: "360° view of history, labs, and medications.", icon: Users },
  { title: "Analytics", description: "Track outcomes and panel performance.", icon: Calendar },
];

export function PatientExperienceSection() {
  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Patient Experience"
          title="Empower patients with secure self-service"
          description="Reduce friction and improve engagement with a modern patient portal experience."
        />
        <FeatureGrid items={PATIENT_FEATURES} columns={3} />
      </div>
    </section>
  );
}

export function DoctorExperienceSection() {
  return (
    <section className="border-t border-border/50 bg-card/30 py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Doctor Experience"
          title="A physician workspace built for speed and clarity"
          description="Everything clinicians need — schedules, records, orders, and insights — without context switching."
        />
        <FeatureGrid items={DOCTOR_FEATURES} columns={2} />
      </div>
    </section>
  );
}
