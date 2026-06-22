import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface BasicInfoProps {
  name: string;
  setName: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
}

export const BasicInfo: React.FC<BasicInfoProps> = ({
  name,
  setName,
  description,
  setDescription,
}) => {
  return (
    <div className="rounded-lg border border-border bg-card shadow-sm">
      <div className="border-b border-border p-6">
        <h3 className="text-xl font-bold text-primary">Basic Information</h3>
      </div>
      <div className="space-y-4 p-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2 space-y-2">
            <Label htmlFor="name" className="text-sm font-medium text-primary">
              Group Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="e.g., Finance Admin, HR Group"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="h-11 w-full rounded-md border border-input px-4 py-3 outline-none transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex flex-col gap-2 space-y-2">
            <Label htmlFor="description" className="text-sm font-medium text-primary">
              Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="description"
              placeholder="Brief description of the permission group"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[44px] w-full resize-none rounded-md border border-input px-4 py-3 outline-none transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
