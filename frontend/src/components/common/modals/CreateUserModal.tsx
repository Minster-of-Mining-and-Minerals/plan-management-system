"use client";
import React, { useState } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useGetRolesQuery } from "@/redux/api/roleApi";
import {
  useCreateUserMutation,
} from "@/redux/api/userApi";
import {
  useGetStructuresQuery,
} from "@/redux/api/structureApi";
import { CreateUserPayload } from "@/redux/types/user";
import { Check, ChevronDown, XIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  structure_id?: string;
}

export const CreateUserModal: React.FC<CreateUserModalProps> = ({
  isOpen,
  onClose,
  structure_id: initialGovId,
}) => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [govId, setGovId] = useState(initialGovId || "");

  const { data: rolesResponse } = useGetRolesQuery();
  const { data: govStructures = [] } = useGetStructuresQuery();

  const roles = rolesResponse || [];

  const [createUser, { isLoading }] = useCreateUserMutation();

  const handleSubmit = async () => {
    if (!fullName || !email || !selectedRoles.length) {
      toast.error("Please fill all required fields");
      return;
    }

    const payload: CreateUserPayload = {
      full_name: fullName,
      email,
      role_ids: selectedRoles,
      phone_number: phoneNumber || undefined,
      structure_id: govId || undefined,
    };

    try {
      await createUser(payload).unwrap();
      toast.success("User created successfully!");
      handleClose();
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to create user");
    }
  };

  const handleClose = () => {
    setFullName("");
    setEmail("");
    setPhoneNumber("");
    setSelectedRoles([]);
    setGovId(initialGovId || "");
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) handleClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="bg-white p-6 rounded-2xl w-full max-w-[750px] shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-[#094C81]">Create User</h2>
          <button
            onClick={handleClose}
            className="text-[#094C81] hover:text-gray-600 transition"
          >
            <XIcon className="w-6 h-6 cursor-pointer" />
          </button>
        </div>

        {/* Content */}
        <div className="w-full flex flex-col space-y-4">
          {/* Structure Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="block text-sm text-golden-dark font-medium mb-1">
                Structure
              </Label>
              <Select
                value={govId}
                onValueChange={(val) => {
                  setGovId(val);
                }}
                disabled={!!initialGovId}
              >
                <SelectTrigger className="w-full h-12 border border-golden-dark">
                  <SelectValue placeholder="Select Structure" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {govStructures.map((s) => (
                    <SelectItem key={s.structure_id} value={s.structure_id!}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

          </div>

          {/* User Detail */}
          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 pr-2">
            <div className="space-y-2">
              <Label className="block text-sm text-golden-dark font-medium mb-1">
                Full Name <span className="text-red-500">*</span>
              </Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                className="w-full h-12 border border-golden-dark "
              />
            </div>
            <div className="space-y-2">
              <Label className="block text-sm text-golden-dark font-medium mb-1">
                Phone Number
              </Label>
              <Input
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+251 9xxxxxxx"
                className="w-full h-12 border border-golden-dark "
              />
            </div>
            <div className="space-y-2">
              <Label className="block text-sm text-golden-dark font-medium mb-1">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                className="w-full h-12 border border-golden-dark"
              />
            </div>

            <div className="w-full space-y-2">
              <Label className="text-sm font-medium text-golden-dark mb-1">
                Role <span className="text-red-500">*</span>
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="w-full max-h-28 min-h-12 h-fit border border-golden-dark p-2 rounded-md text-[#094C81] bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-golden-dark transition-all duration-200"
                  >
                    <div className="flex flex-wrap items-center gap-2 w-full">
                      {selectedRoles.length === 0 && (
                        <span className="text-sm w-full justify-between text-gray-400 flex items-center gap-2">
                          Select Role
                          <ChevronDown className="h-4 w-4 ml-auto" />
                        </span>
                      )}

                      {selectedRoles.map((roleId) => {
                        const r = roles.find(
                          (rr: any) => rr.role_id === roleId
                        );
                        if (!r) return null;

                        return (
                          <span
                            key={roleId}
                            className="inline-flex items-center gap-1 rounded-sm justify-center bg-[#094C81]/10 text-[#094C81] pl-2 text-xs"
                          >
                            <span className="truncate max-w-[120px] py-1">
                              {r.name}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRoles((prev) =>
                                  prev.filter((id) => id !== roleId)
                                );
                              }}
                              className="flex px-1 rounded-r-sm items-center justify-center py-1 hover:text-white hover:bg-red-500 transition-colors"
                            >
                              <XIcon className="h-3 w-3" />
                            </button>
                          </span>
                        );
                      })}
                      {selectedRoles.length > 0 && (
                        <ChevronDown className="h-4 w-4 ml-auto text-gray-400" />
                      )}
                    </div>
                  </button>
                </PopoverTrigger>

                <PopoverContent
                  className="w-[300px] p-2 bg-white"
                  align="start"
                >
                  <div className="max-h-64 overflow-y-auto">
                    {roles
                      .filter((r: any) => !selectedRoles.includes(r.role_id))
                      .map((r: any) => (
                        <button
                          key={r.role_id}
                          type="button"
                          onClick={() => {
                            setSelectedRoles((prev) => [...prev, r.role_id]);
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-[#094C81] hover:bg-[#094C81]/10 rounded-md cursor-pointer transition-colors"
                        >
                          <span className="block truncate">{r.name}</span>
                        </button>
                      ))}
                    {roles.filter(
                      (r: any) => !selectedRoles.includes(r.role_id)
                    ).length === 0 && (
                        <div className="px-3 py-2 text-sm text-gray-400 text-center">
                          All roles selected
                        </div>
                      )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            className="min-w-24"
          >
            {isLoading ? "Creating..." : "Create"}
          </Button>
        </div>
      </div>
    </div>
  );
};
