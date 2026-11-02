"use client";

import React, { useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useGetRegionalIssuePrioritiesQuery,
  useGetRegionalIssueCategoriesQuery,
  useCreateRegionalIssueMutation,
} from "@/redux/api/regionalIssueApi";
import { ArrowLeft, Send, AlertTriangle } from "lucide-react";

interface RegionalCreateIssueFormProps {
  regionId: string;
}

export function RegionalCreateIssueForm({ regionId }: RegionalCreateIssueFormProps) {
  const router = useRouter();
  const { data: priorities = [] } = useGetRegionalIssuePrioritiesQuery();
  const { data: categories = [] } = useGetRegionalIssueCategoriesQuery();
  const [createIssue, { isLoading }] = useCreateRegionalIssueMutation();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [priorityId, setPriorityId] = useState("");
  const [justification, setJustification] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg("Issue title is required.");
      return;
    }
    if (!description.trim()) {
      setErrorMsg("Issue description is required.");
      return;
    }

    try {
      setErrorMsg("");
      const res = await createIssue({
        regionId,
        title: title.trim(),
        description: description.trim(),
        issue_category_id: categoryId || undefined,
        issue_priority_id: priorityId || undefined,
        justification: justification.trim() || undefined,
      }).unwrap();

      router.push(`/${regionId}/issues/${res.regional_issue_id}`);
    } catch (err: any) {
      setErrorMsg(err?.data?.message || err.message || "Failed to submit regional issue.");
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/${regionId}/issues`}>
          <Button variant="outline" size="icon" className="h-9 w-9">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Submit Regional Issue
          </h1>
          <p className="text-xs text-muted-foreground">
            Report an operational, planning, or resource discrepancy within this region.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-2.5 rounded-lg text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Issue Details</CardTitle>
          <CardDescription>
            Provide accurate details. Once submitted, your issue will enter the regional review workflow.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-sm font-medium">
                Title <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="title"
                placeholder="Brief summary of the issue..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Category</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.issue_category_id} value={c.issue_category_id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Priority</Label>
                <Select value={priorityId} onValueChange={setPriorityId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {priorities.map((p) => (
                      <SelectItem key={p.issue_priority_id} value={p.issue_priority_id}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-sm font-medium">
                Description <span className="text-rose-500">*</span>
              </Label>
              <Textarea
                id="description"
                placeholder="Comprehensive description of what was observed, impacted activities, or discrepancies..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="justification" className="text-sm font-medium">
                Justification / Urgency Context
              </Label>
              <Textarea
                id="justification"
                placeholder="Explain why this requires resolution, any relevant targets or deadlines affected..."
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t">
              <Link href={`/${regionId}/issues`}>
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                <Send className="h-4 w-4 mr-1.5" />
                {isLoading ? "Submitting..." : "Submit Regional Issue"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

