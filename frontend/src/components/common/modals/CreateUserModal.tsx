"use client";
import React, { useEffect, useState } from "react";
import { actionFeedback } from "@/components/action-feedback";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useGetRolesQuery } from "@/redux/api/roleApi";
import {
  useCreateUserMutation,
} from "@/redux/api/userApi";
import { useGetGovernmentStructuresQuery } from "@/redux/api/governmentStructureApi";
import { useGetInternalStructuresQuery } from "@/redux/api/internalStructureApi";
import { CreateUserPayload } from "@/redux/types/user";
import { useStructureScope } from "@/hooks/useStructureScope";
import { useGovernmentStructureListParams } from "@/hooks/useGovernmentStructureListParams";
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
  government_structure_id?: string;
  internal_structure_id?: string;
}

export const CreateUserModal: React.FC<CreateUserModalProps> = ({
  isOpen,
  onClose,
  government_structure_id: initialGovId,
  internal_structure_id: initialInternalId,
}) => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [govId, setGovId] = useState(initialGovId || "");
  const [internalId, setInternalId] = useState(initialInternalId || "");

  const { data: rolesResponse } = useGetRolesQuery(
    govId ? { government_structure_id: govId, is_active: true } : undefined,
    { skip: !govId }
  );
  const structureListParams = useGovernmentStructureListParams({ is_active: true });
  const { data: govStructures = [] } = useGetGovernmentStructuresQuery(
    structureListParams.params,
    { skip: structureListParams.skip }
  );
  const { data: internalStructures = [] } = useGetInternalStructuresQuery(
    { government_structure_id: govId },
    { skip: !govId }
  );

  const roles = rolesResponse || [];

  const [createUser, { isLoading }] = useCreateUserMutation();

  const { isSuperAdmin, structureId: sessionStructureId } = useStructureScope();
  const showSectorPicker = !initialGovId && (isSuperAdmin || govStructures.length > 1);

  useEffect(() => {
    if (!isOpen || initialGovId) return;
    if (!govId && sessionStructureId && govStructures.length === 1) {
      setGovId(sessionStructureId);
    }
  }, [isOpen, initialGovId, govId, sessionStructureId, govStructures.length]);

  const handleSubmit = async () => {
    if (!fullName || !email || !selectedRoles.length) {
      actionFeedback.error("Please fill all required fields");
      return;
    }

    if (!govId && !isSuperAdmin) {
      actionFeedback.error("Please select a sector structure");
      return;
    }

    const payload: CreateUserPayload = {
      full_name: fullName,
      email,
      role_ids: selectedRoles,
      phone_number: phoneNumber || undefined,
      government_structure_id: govId || undefined,
      internal_structure_id: internalId || undefined,
    };

    try {
      await createUser(payload).unwrap();
      actionFeedback.success("User created successfully!");
      handleClose();
    } catch (error: any) {
      actionFeedback.error(error?.data?.message || "Failed to create user");
    }
  };

  const handleClose = () => {
    setFullName("");
    setEmail("");
    setPhoneNumber("");
    setSelectedRoles([]);
    setGovId(initialGovId || "");
    setInternalId(initialInternalId || "");
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) handleClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm sm:items-center"
      onClick={handleBackdropClick}
    >
      <div className="my-auto w-full max-w-[750px] max-h-[min(90dvh,calc(100vh-2rem))] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-primary">Create User</h2>
          <button
            onClick={handleClose}
            className="text-primary transition hover:text-muted-foreground"
          >
            <XIcon className="w-6 h-6 cursor-pointer" />
          </button>
        </div>

        {/* Content */}
        <div className="w-full flex flex-col space-y-4">
          {/* Structure Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {showSectorPicker && (
              <div className="space-y-2">
                <Label className="block text-sm text-golden-dark font-medium mb-1">
                  Sector Structure <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={govId}
                  onValueChange={(val) => {
                    setGovId(val);
                    setInternalId("");
                    setSelectedRoles([]);
                  }}
                >
                  <SelectTrigger className="w-full h-12 border border-golden-dark">
                    <SelectValue placeholder="Select sector structure" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {govStructures.map((s) => (
                      <SelectItem
                        key={s.government_structure_id}
                        value={s.government_structure_id!}
                      >
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {!showSectorPicker && initialGovId && (
              <div className="space-y-2">
                <Label className="block text-sm text-golden-dark font-medium mb-1">
                  Sector Structure
                </Label>
                <Select value={govId} disabled>
                  <SelectTrigger className="w-full h-12 border border-golden-dark">
                    <SelectValue placeholder="Sector structure" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {govStructures
                      .filter((s) => s.government_structure_id === initialGovId)
                      .map((s) => (
                        <SelectItem
                          key={s.government_structure_id}
                          value={s.government_structure_id!}
                        >
                          {s.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label className="block text-sm text-golden-dark font-medium mb-1">
                Department
              </Label>
              <Select
                value={internalId}
                onValueChange={setInternalId}
                disabled={!govId || !!initialInternalId}
              >
                <SelectTrigger className="w-full h-12 border border-golden-dark">
                  <SelectValue placeholder={govId ? "Select department" : "Select sector structure first"} />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {internalStructures.map((s) => (
                    <SelectItem key={s.internal_structure_id} value={s.internal_structure_id!}>
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
                    className="h-fit min-h-12 max-h-28 w-full rounded-md border border-input bg-background p-2 text-primary transition-all duration-200 hover:bg-muted/40 focus:outline-none focus:ring-1 focus:ring-primary"
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
                            className="inline-flex items-center justify-center gap-1 rounded-sm bg-primary/10 pl-2 text-xs text-primary"
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
                          className="w-full cursor-pointer rounded-md px-3 py-2 text-left text-sm text-primary transition-colors hover:bg-primary/10"
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
