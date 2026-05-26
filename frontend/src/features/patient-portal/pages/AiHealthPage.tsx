"use client";

import { useState } from "react";
import { Bot, Lightbulb, Pill, Sparkles, Stethoscope } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { PatientPortalShell } from "../components/PatientPortalShell";
import { DemoBanner } from "../components/DemoBanner";
import {
  MOCK_AI_SYMPTOMS,
  MOCK_AI_RECOMMENDATIONS,
  MOCK_HEALTH_INSIGHTS,
} from "../data/mockPatientPortalData";

export function AiHealthPage() {
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);

  const toggleSymptom = (id: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const runChecker = () => {
    if (!selectedSymptoms.length) {
      toast.error("Select at least one symptom");
      return;
    }
    setShowResults(true);
    toast.message("AI analysis — demo only", {
      description: "No real AI processing. For presentation purposes.",
    });
  };

  return (
    <PatientPortalShell
      title="AI Health Assistant"
      description="Symptom checker, health insights, and medication reminders — futuristic care companion UI."
    >
      <DemoBanner />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/60 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-section-accent/10 pointer-events-none" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Stethoscope className="h-5 w-5 text-primary" />
              Symptom Checker
            </CardTitle>
          </CardHeader>
          <CardContent className="relative space-y-4">
            <p className="text-sm text-muted-foreground">
              Select symptoms you are experiencing. This demo does not provide medical advice.
            </p>
            <div className="flex flex-wrap gap-2">
              {MOCK_AI_SYMPTOMS.map((s) => (
                <Badge
                  key={s.id}
                  variant={selectedSymptoms.includes(s.id) ? "default" : "outline"}
                  className="cursor-pointer py-1.5 px-3"
                  onClick={() => toggleSymptom(s.id)}
                >
                  {s.label}
                </Badge>
              ))}
            </div>
            <Textarea placeholder="Describe additional symptoms (optional)..." rows={3} />
            <Button className="w-full gap-2" onClick={runChecker}>
              <Sparkles className="h-4 w-4" />
              Analyze Symptoms
            </Button>
            {showResults ? (
              <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4 animate-in fade-in">
                <p className="text-xs font-semibold uppercase text-primary">Demo insights</p>
                {MOCK_AI_RECOMMENDATIONS.map((rec) => (
                  <div key={rec.title}>
                    <p className="font-medium text-sm">{rec.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{rec.text}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-border/60 bg-gradient-to-br from-card to-section-accent-subtle-10">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                Health Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {MOCK_HEALTH_INSIGHTS.map((insight) => (
                <div
                  key={insight.id}
                  className="rounded-lg border border-border/50 p-3 flex gap-3"
                >
                  <Lightbulb className="h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <p className="font-medium text-sm">{insight.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
                    <Badge variant="outline" className="mt-2 text-[10px]">
                      {insight.category}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Pill className="h-5 w-5 text-primary" />
                Medication Reminders
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {[
                { time: "8:00 AM", med: "Amlodipine 5mg", status: "Taken" },
                { time: "10:00 PM", med: "Atorvastatin 20mg", status: "Upcoming" },
              ].map((r) => (
                <div
                  key={r.time}
                  className="flex justify-between items-center rounded-md border border-border/50 px-3 py-2"
                >
                  <span>
                    <span className="font-medium">{r.time}</span> — {r.med}
                  </span>
                  <Badge variant={r.status === "Taken" ? "secondary" : "outline"}>
                    {r.status}
                  </Badge>
                </div>
              ))}
              <Button variant="outline" size="sm" className="w-full mt-2">
                Configure Reminders
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border-border/60">
        <CardContent className="py-6 flex flex-col sm:flex-row items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-section-accent text-primary-foreground">
            <Bot className="h-8 w-8" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <p className="font-semibold">Ask NovaCure AI</p>
            <p className="text-sm text-muted-foreground mt-1">
              Chat interface for health questions, appointment guidance, and wellness tips —
              connect to AI service when ready.
            </p>
          </div>
          <Button variant="secondary" disabled className="shrink-0">
            Open Chat (Coming Soon)
          </Button>
        </CardContent>
      </Card>
    </PatientPortalShell>
  );
}
