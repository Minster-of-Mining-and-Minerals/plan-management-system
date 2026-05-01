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
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="p-6 border-b">
        <h3 className="text-xl font-bold text-[#094C81]">Basic Information</h3>
      </div>
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2 flex flex-col gap-2">
            <Label
              htmlFor="name"
              className="text-sm font-medium text-[#094C81]"
            >
              Group Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              placeholder="e.g., Finance Admin, HR Group"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full h-11 border border-gray-300 px-4 py-3 rounded-md focus:ring-2 focus:ring-[#094C81] focus:border-transparent transition-all duration-200 outline-none"
            />
          </div>

          <div className="space-y-2 flex flex-col gap-2">
            <Label
              htmlFor="description"
              className="text-sm font-medium text-[#094C81]"
            >
              Description <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="description"
              placeholder="Brief description of the permission group"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full min-h-[44px] border border-gray-300 px-4 py-3 rounded-md focus:ring-2 focus:ring-[#094C81] focus:border-transparent transition-all duration-200 outline-none resize-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
