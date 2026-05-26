"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { PatientRecord } from "@/redux/api/patientApi";

interface PatientPreviewSearchComboboxProps {
  patients: PatientRecord[];
  selectedPatient?: PatientRecord | null;
  value: string;
  search: string;
  isLoading?: boolean;
  onSearchChange: (search: string) => void;
  onValueChange: (patientId: string) => void;
}

export function PatientPreviewSearchCombobox({
  patients,
  selectedPatient,
  value,
  search,
  isLoading = false,
  onSearchChange,
  onValueChange,
}: PatientPreviewSearchComboboxProps) {
  const [open, setOpen] = useState(false);

  const triggerLabel = selectedPatient
    ? `${selectedPatient.full_name}${
        selectedPatient.profile?.patient_code
          ? ` (${selectedPatient.profile.patient_code})`
          : ""
      }`
    : "Search patient to preview…";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal h-10"
        >
          <span className="truncate text-left">{triggerLabel}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search name, email, phone, patient code…"
            value={search}
            onValueChange={onSearchChange}
          />
          <CommandList>
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching…
              </div>
            ) : (
              <>
                <CommandEmpty>No patients found.</CommandEmpty>
                <CommandGroup>
                  {patients.slice(0, 50).map((patient) => (
                    <CommandItem
                      key={patient.user_id}
                      value={`${patient.full_name}-${patient.user_id}`}
                      onSelect={() => {
                        onValueChange(patient.user_id);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 shrink-0",
                          value === patient.user_id
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      <span className="truncate">
                        {patient.full_name}
                        {patient.profile?.patient_code
                          ? ` (${patient.profile.patient_code})`
                          : ""}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
