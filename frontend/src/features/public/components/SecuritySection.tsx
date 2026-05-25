"use client";

import { KeyRound, Lock, ScrollText, Server, Shield, UserCheck } from "lucide-react";
import { FeatureGrid } from "./FeatureGrid";
import { SectionHeader } from "./SectionReveal";

const SECURITY_FEATURES = [
  { title: "End-to-End Encryption", description: "Data protected in transit and at rest across all modules.", icon: Lock },
  { title: "Role-Based Access", description: "Granular permissions aligned to clinical and administrative roles.", icon: UserCheck },
  { title: "Audit Logs", description: "Complete traceability for compliance and incident response.", icon: ScrollText },
  { title: "Secure Infrastructure", description: "Enterprise-grade hosting with hardened access controls.", icon: Server },
  { title: "Identity Management", description: "Integrated authentication with session security policies.", icon: KeyRound },
  { title: "Compliance Ready", description: "Architecture designed for HIPAA-style healthcare regulations.", icon: Shield },
];

export function SecuritySection() {
  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Security & Compliance"
          title="Medical-grade security at every layer"
          description="NovaCure is engineered for healthcare environments where trust, privacy, and auditability are non-negotiable."
        />
        <FeatureGrid items={SECURITY_FEATURES} columns={3} />
      </div>
    </section>
  );
}
