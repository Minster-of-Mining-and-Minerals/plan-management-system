"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useGetRolesQuery } from "@/redux/api/roleApi";
import { useCreateUserMutation } from "@/redux/api/userApi";
import { useGetUserFormConfigQuery } from "@/redux/api/formFieldApi";
import { useUploadAttachmentsMutation } from "@/redux/api/attachementApi";
import { DynamicUserFormFields } from "@/components/dynamic-form/DynamicUserFormFields";
import {
  validateDynamicForm,
  buildUserPayloadFromDynamicValues,
} from "@/lib/dynamicFormValidation";
import {
  flattenFormFields,
  hasConfiguredFormFields,
  type DynamicFormValues,
} from "@/redux/types/formField";
import { ChevronDown, XIcon } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateUserModal: React.FC<CreateUserModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [values, setValues] = useState<DynamicFormValues>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [filesByKey, setFilesByKey] = useState<Record<string, File>>({});

  const { data: formConfig, isLoading: loadingFields } =
    useGetUserFormConfigQuery(undefined, { skip: !isOpen });
  const formFields = flattenFormFields(formConfig);
  const { data: rolesResponse } = useGetRolesQuery();
  const roles = rolesResponse || [];
  const [createUser, { isLoading }] = useCreateUserMutation();
  const [uploadFiles] = useUploadAttachmentsMutation();

  useEffect(() => {
    if (!isOpen) return;
    setValues({});
    setErrors({});
    setSelectedRoles([]);
    setFilesByKey({});
  }, [isOpen]);

  const handleChange = (key: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSubmit = async () => {
    const validationErrors = validateDynamicForm(
      formFields,
      values,
      filesByKey
    );
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      toast.error("Please fix form errors");
      return;
    }

    if (!hasConfiguredFormFields(formConfig)) {
      toast.error(
        "Required core fields (name, email, phone) are missing. Contact an administrator."
      );
      return;
    }

    if (!selectedRoles.length) {
      toast.error("Please assign at least one role");
      return;
    }

    try {
      const payload = buildUserPayloadFromDynamicValues(formFields, values);

      for (const [key, file] of Object.entries(filesByKey)) {
        const result = await uploadFiles({ files: [file] }).unwrap();
        const path = result.attachments?.[0]?.file_path;
        if (path) payload[key] = path;
      }

      await createUser({
        ...payload,
        role_ids: selectedRoles,
      } as any).unwrap();

      toast.success("User created successfully!");
      handleClose();
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to create user");
    }
  };

  const handleClose = () => {
    setValues({});
    setErrors({});
    setSelectedRoles([]);
    setFilesByKey({});
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-primary">Create User</h2>
          <button
            onClick={handleClose}
            className="text-primary hover:text-gray-600 transition"
          >
            <XIcon className="w-6 h-6 cursor-pointer" />
          </button>
        </div>

        <div className="w-full flex flex-col space-y-6">
          {loadingFields ? (
            <p className="text-sm text-muted-foreground">Loading form…</p>
          ) : (
            <DynamicUserFormFields
              grouped={formConfig}
              values={values}
              errors={errors}
              onChange={handleChange}
              onFileSelect={(key, file) => {
                if (file) {
                  setFilesByKey((prev) => ({ ...prev, [key]: file }));
                } else {
                  setFilesByKey((prev) => {
                    const next = { ...prev };
                    delete next[key];
                    return next;
                  });
                }
              }}
            />
          )}

          <div className="w-full space-y-2 md:col-span-2">
            <Label className="text-sm font-medium text-section-accent">
              Roles <span className="text-red-500">*</span>
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="w-full min-h-12 border border-section-accent p-2 rounded-md text-primary bg-white hover:bg-gray-50"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedRoles.length === 0 ? (
                      <span className="text-sm text-gray-400 flex items-center gap-2">
                        Select roles
                        <ChevronDown className="h-4 w-4 ml-auto" />
                      </span>
                    ) : (
                      selectedRoles.map((roleId) => {
                        const r = roles.find((rr: any) => rr.role_id === roleId);
                        return (
                          <span
                            key={roleId}
                            className="inline-flex items-center gap-1 bg-primary/10 text-primary pl-2 text-xs rounded-sm"
                          >
                            {r?.name}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRoles((prev) =>
                                  prev.filter((id) => id !== roleId)
                                );
                              }}
                              className="px-1 hover:bg-red-500 hover:text-white rounded-r-sm"
                            >
                              <XIcon className="h-3 w-3" />
                            </button>
                          </span>
                        );
                      })
                    )}
                  </div>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-2 bg-white" align="start">
                {roles
                  .filter((r: any) => !selectedRoles.includes(r.role_id))
                  .map((r: any) => (
                    <button
                      key={r.role_id}
                      type="button"
                      onClick={() =>
                        setSelectedRoles((prev) => [...prev, r.role_id])
                      }
                      className="w-full text-left px-3 py-2 text-sm hover:bg-primary/10 rounded-md"
                    >
                      {r.name}
                    </button>
                  ))}
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || loadingFields}>
            {isLoading ? "Creating..." : "Create"}
          </Button>
        </div>
      </div>
    </div>
  );
};
