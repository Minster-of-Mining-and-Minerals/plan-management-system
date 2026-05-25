"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  BookOpen,
  ChevronDown,
  Info,
  Sparkles,
  Workflow,
  Shield,
  Database,
  Send,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-primary/8 text-primary border border-primary/15">
      {children}
    </code>
  );
}

function CodeBlock({ title, children }: { title?: string; children: string }) {
  return (
    <div className="rounded-lg border border-section-accent/20 overflow-hidden bg-slate-900">
      {title && (
        <div className="px-4 py-2 text-xs font-medium text-slate-400 border-b border-slate-700 bg-slate-800/80">
          {title}
        </div>
      )}
      <pre className="text-xs text-slate-100 p-4 overflow-x-auto font-mono leading-relaxed">
        {children}
      </pre>
    </div>
  );
}

function GuideTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-section-accent/20">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-primary/5 border-b border-section-accent/15">
            {headers.map((h) => (
              <th
                key={h}
                className="text-left px-4 py-3 font-semibold text-primary text-xs uppercase tracking-wide"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className={cn(
                "border-b border-section-accent/10 last:border-0",
                i % 2 === 0 ? "bg-white" : "bg-slate-50/60"
              )}
            >
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={cn(
                    "px-4 py-3.5 align-top text-sm",
                    j === 0
                      ? "font-mono text-xs text-primary font-medium whitespace-nowrap"
                      : "text-muted-foreground leading-relaxed"
                  )}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const SECTION_ICONS: Record<string, React.ReactNode> = {
  "1": <Workflow className="h-4 w-4" />,
  "2": <Layers className="h-4 w-4" />,
  "3": <Sparkles className="h-4 w-4" />,
  "4": <Shield className="h-4 w-4" />,
  "5": <Database className="h-4 w-4" />,
  "6": <Send className="h-4 w-4" />,
  "7": <Info className="h-4 w-4" />,
};

function Section({
  index,
  title,
  description,
  defaultOpen = false,
  children,
}: {
  index: string;
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const icon = SECTION_ICONS[index];

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div
        className={cn(
          "rounded-xl border bg-white shadow-sm transition-shadow",
          open
            ? "border-primary/25 shadow-md ring-1 ring-primary/5"
            : "border-section-accent/20 hover:border-section-accent/35"
        )}
      >
        <CollapsibleTrigger className="w-full text-left">
          <div className="flex items-start gap-4 p-5 cursor-pointer hover:bg-slate-50/50 rounded-xl transition-colors">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/15">
              {icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary/70">
                  Section {index}
                </span>
              </div>
              <h3 className="text-base font-semibold text-primary mt-0.5">
                {title.replace(/^\d+\.\s*/, "")}
              </h3>
              {description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {description}
                </p>
              )}
            </div>
            <ChevronDown
              className={cn(
                "h-5 w-5 shrink-0 text-muted-foreground transition-transform mt-2",
                open && "rotate-180"
              )}
            />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-5 pb-5 pt-0 space-y-4 border-t border-section-accent/10 ml-5 mr-5">
            <div className="pt-4">{children}</div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function TipBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-lg border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
      <Info className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
      <div className="leading-relaxed">{children}</div>
    </div>
  );
}

function BadgeRow({
  badge,
  variant,
  label,
}: {
  badge: string;
  variant?: "default" | "outline" | "secondary";
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-slate-50 border border-section-accent/10">
      <Badge variant={variant ?? "default"} className="shrink-0">
        {badge}
      </Badge>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

export default function FormConfigurationGuide() {
  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/8 via-white to-teal-50/50 p-6 md:p-8">
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative flex flex-col md:flex-row md:items-center gap-5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white shadow-md border border-primary/15 text-primary">
            <BookOpen className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-primary">
              How to configure user forms
            </h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-2xl leading-relaxed">
              Build multi-step create-user flows without database migrations.
              This guide explains field types, validation JSON, step rules, and
              the exact payload shape sent to{" "}
              <InlineCode>POST /api/users</InlineCode>.
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              <Badge variant="secondary" className="bg-white/80">
                7 sections
              </Badge>
              <Badge variant="outline" className="bg-white/60">
                Hybrid schema
              </Badge>
              <Badge variant="outline" className="bg-white/60">
                Wizard steps
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <Section
        index="1"
        title="1. Recommended setup workflow"
        description="Order of operations for a complete multi-step user form"
        defaultOpen
      >
        <ol className="space-y-3">
          {[
            <>
              <strong className="text-foreground">Account step</strong> is seeded
              with{" "}
              <InlineCode>full_name</InlineCode>, <InlineCode>email</InlineCode>,{" "}
              <InlineCode>phone_number</InlineCode> — do not delete.
            </>,
            <>
              Add <strong className="text-foreground">form steps</strong> (e.g.
              Demographics, Emergency Contact).
            </>,
            <>
              Create <strong className="text-foreground">custom fields</strong>{" "}
              and assign each to a step using snake_case keys.
            </>,
            <>
              Mark fields <strong>Required</strong> to make that wizard step
              mandatory.
            </>,
            <>
              End users see a wizard: required steps block Next; optional steps
              can be skipped unless they enter data.
            </>,
          ].map((text, i) => (
            <li
              key={i}
              className="flex gap-3 text-sm text-muted-foreground leading-relaxed"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-white text-xs font-bold">
                {i + 1}
              </span>
              <span className="pt-0.5">{text}</span>
            </li>
          ))}
        </ol>
      </Section>

      <Section
        index="2"
        title="2. Form steps — rules & meaning"
        description="Visibility and required vs optional step behavior"
      >
        <GuideTable
          headers={["Setting", "Meaning"]}
          rows={[
            [
              "Visible",
              "If off, the step and all its fields are hidden and not validated.",
            ],
            [
              "Required step",
              "At least one required field in the step. User cannot skip in the wizard.",
            ],
            [
              "Optional step",
              "All fields optional — user may skip; entered values are still validated.",
            ],
            ["Sort order", "Wizard sequence (Account is usually first)."],
          ]}
        />
        <TipBox>
          <strong>Rule inheritance:</strong> field visible = group visible AND
          field visible. A step is required only when it contains a required
          visible field — you cannot mark a step required if every field is
          optional.
        </TipBox>
      </Section>

      <Section
        index="3"
        title="3. Field types"
        description="UI control and stored value format"
      >
        <GuideTable
          headers={["Type", "Use for", "Example value"]}
          rows={[
            ["input", "Short text, email, phone (use pattern)", '"John Doe"'],
            ["textarea", "Long text, notes", '"Multi\\nline"'],
            ["number", "Numeric", '"42"'],
            ["date", "ISO date from picker", '"2026-05-25"'],
            ["select", "Single/multi choice", '"A" or ["A","B"]'],
            ["checkbox", "Multi tick", '["x","y"]'],
            ["file", "Upload → path string", '"/uploads/id.jpg"'],
          ]}
        />
      </Section>

      <Section
        index="4"
        title="4. Validation config (JSON)"
        description="Properties in the field editor advanced JSON box"
      >
        <p className="text-sm text-muted-foreground leading-relaxed">
          For <strong>select</strong> and <strong>checkbox</strong>, use the
          Options textarea in the modal — it fills{" "}
          <InlineCode>options</InlineCode> in config.
        </p>
        <GuideTable
          headers={["Property", "Types", "Description"]}
          rows={[
            ["pattern", "input", "email | phone | text"],
            ["min_length / max_length", "input, textarea", "Character limits"],
            ["options", "select, checkbox", '["A","B"] allowed values'],
            ["multiple", "select", "true → array value"],
            ["max_selected", "checkbox", "Max ticks allowed"],
            ["allowed_types", "file", '["jpg","pdf"] extensions'],
            ["max_size_mb", "file", "Client-side size cap"],
          ]}
        />
        <CodeBlock title="validation.json examples">{`{ "pattern": "email" }
{ "pattern": "phone" }
{ "min_length": 2, "max_length": 120 }
{ "options": ["O+", "A+", "B+"], "multiple": false }
{ "options": ["English", "Amharic"], "multiple": true }
{ "options": ["Diabetes", "Asthma"], "max_selected": 2 }
{ "allowed_types": ["jpg", "png"], "max_size_mb": 5 }`}</CodeBlock>
      </Section>

      <Section
        index="5"
        title="5. Field keys & storage"
        description="Core columns vs dynamic values"
      >
        <GuideTable
          headers={["Concept", "Details"]}
          rows={[
            [
              "field_key",
              "Lowercase snake_case, starts with letter. e.g. blood_type",
            ],
            [
              "core",
              "full_name, email, phone_number → users table",
            ],
            [
              "custom",
              "Any other key → user_field_values (no migration)",
            ],
            ["password", "Server-generated only — not a form field"],
          ]}
        />
      </Section>

      <Section
        index="6"
        title="6. Create user API payload"
        description="POST /api/users body after wizard submit"
      >
        <CodeBlock title="POST /api/users">{`{
  "full_name": "Jane Doe",
  "email": "jane@example.com",
  "phone_number": "+251911223344",
  "blood_type": "O+",
  "custom_fields": {
    "blood_type": "O+"
  },
  "role_ids": ["uuid-role-1"]
}`}</CodeBlock>
        <GuideTable
          headers={["Field type", "Sent as"]}
          rows={[
            ["text / number / date", "String"],
            ["select (single)", "String"],
            ["select (multi) / checkbox", "Array of strings"],
            ["file", "Path string after upload"],
            ["Empty optional", "Omitted"],
          ]}
        />
      </Section>

      <Section
        index="7"
        title="7. Admin list badges"
        description="Labels in configuration tables"
      >
        <div className="grid gap-2 sm:grid-cols-2">
          <BadgeRow badge="core" label="Saved on users table" />
          <BadgeRow badge="custom" variant="outline" label="user_field_values" />
          <BadgeRow badge="Required step" label="Blocks Next in wizard" />
          <BadgeRow
            badge="Optional step"
            variant="outline"
            label="Skip allowed"
          />
        </div>
      </Section>
    </div>
  );
}
