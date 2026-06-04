"use client";

import { useState } from "react";
import { DataTable } from "@/features/template/component/DataTable";
import { TableLayout } from "@/features/template/component/TableLayout";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Plus, Download } from "lucide-react";
import type { FilterField, ActionButton } from "@/types/tableLayout";

type Evaluation = {
  id: string;
  studentName: string;
  instructorName: string;
  date: string;
  vehicleType: string;
  score: number;
  status: "passed" | "failed" | "pending";
};

const mockEvaluations: Evaluation[] = [
  {
    id: "EVL001",
    studentName: "John Smith",
    instructorName: "Michael Johnson",
    date: "2024-12-08",
    vehicleType: "Sedan",
    score: 85,
    status: "passed",
  },
  {
    id: "EVL002",
    studentName: "Sarah Williams",
    instructorName: "David Brown",
    date: "2024-12-07",
    vehicleType: "SUV",
    score: 72,
    status: "passed",
  },
  {
    id: "EVL003",
    studentName: "James Davis",
    instructorName: "Michael Johnson",
    date: "2024-12-07",
    vehicleType: "Truck",
    score: 58,
    status: "failed",
  },
  {
    id: "EVL004",
    studentName: "Emily Taylor",
    instructorName: "Lisa Anderson",
    date: "2024-12-06",
    vehicleType: "Sedan",
    score: 0,
    status: "pending",
  },
  {
    id: "EVL005",
    studentName: "Robert Martinez",
    instructorName: "David Brown",
    date: "2024-12-06",
    vehicleType: "Motorcycle",
    score: 91,
    status: "passed",
  },
];

const columns: ColumnDef<Evaluation>[] = [
  { accessorKey: "id", header: "ID" },
  { accessorKey: "studentName", header: "Student" },
  { accessorKey: "instructorName", header: "Instructor" },
  { accessorKey: "date", header: "Date" },
  { accessorKey: "vehicleType", header: "Vehicle" },
  {
    accessorKey: "score",
    header: "Score",
    cell: ({ row }) => {
      const score = row.getValue("score") as number;
      const status = row.original.status;
      if (status === "pending")
        return <span className="text-muted-foreground">-</span>;
      return (
        <span
          className={
            score >= 70 ? "text-green-600 font-medium" : "text-red-600 font-medium"
          }
        >
          {score}%
        </span>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return (
        <Badge
          variant={
            status === "passed"
              ? "default"
              : status === "failed"
              ? "destructive"
              : "secondary"
          }
        >
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: () => {
      return (
        <Button variant="ghost" size="icon">
          <MoreHorizontal />
        </Button>
      );
    },
  },
];

const TableComponentExample = () => {
  const [vehicleFilter, setVehicleFilter] = useState("");
  const filters: FilterField[] = [
    {
      key: "vehicle",
      label: "Vehicle Type",
      type: "multiselect",
      placeholder: "Select vehicle",
      value: vehicleFilter,
      onChange: setVehicleFilter,
      options: [
        { label: "Sedan", value: "Sedan" },
        { label: "SUV", value: "SUV" },
        { label: "Truck", value: "Truck" },
        { label: "Motorcycle", value: "Motorcycle" },
      ],
    },
  ];

  // Actions
  const actions: ActionButton[] = [
    {
      label: "Export",
      icon: <Download className="h-4 w-4" />,
      variant: "outline",
      onClick: () => console.log("Export clicked"),
    },
    {
      label: "New Evaluation",
      icon: <Plus className="h-4 w-4" />,
      variant: "default",
      onClick: () => console.log("New evaluation clicked"),
    },
  ];

  return (
    <TableLayout
      title="Recent Evaluations"
      description="View and manage all driving evaluations"
      actions={actions}
      filters={filters}
      filterColumnsPerRow={1}
    >
      <DataTable
        columns={columns}
        data={mockEvaluations}
        resetKey={vehicleFilter}
      />
    </TableLayout>
  );
};

export default TableComponentExample;
