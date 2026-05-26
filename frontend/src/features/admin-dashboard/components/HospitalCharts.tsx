"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  APPOINTMENT_VOLUME_WEEKLY,
  PATIENT_REGISTRATION_TREND,
  PAYMENT_TREND,
  PHARMACY_OPERATIONS,
  REVENUE_BREAKDOWN,
  BED_OCCUPANCY_BY_WARD,
} from "../data/mockHospitalOperationsData";

const registrationConfig = {
  registrations: { label: "New registrations", color: "hsl(var(--chart-1))" },
  outpatient: { label: "Outpatient", color: "hsl(var(--chart-2))" },
  inpatient: { label: "Inpatient", color: "hsl(var(--chart-3))" },
} satisfies ChartConfig;

const appointmentConfig = {
  completed: { label: "Completed", color: "hsl(var(--chart-1))" },
  scheduled: { label: "Scheduled", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig;

const revenueConfig = {
  amount: { label: "Revenue (ETB)" },
} satisfies ChartConfig;

const paymentConfig = {
  collected: { label: "Collected", color: "hsl(var(--chart-1))" },
  outstanding: { label: "Outstanding", color: "hsl(var(--chart-4))" },
} satisfies ChartConfig;

const pharmacyConfig = {
  prescriptions: { label: "Prescriptions", color: "hsl(var(--primary))" },
} satisfies ChartConfig;

const wardConfig = {
  occupancy: { label: "Occupancy %", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

export function PatientRegistrationChart() {
  return (
    <ChartContainer config={registrationConfig} className="h-[280px] w-full">
      <AreaChart data={PATIENT_REGISTRATION_TREND} margin={{ left: 0, right: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} />
        <YAxis tickLine={false} axisLine={false} fontSize={11} width={32} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area
          type="monotone"
          dataKey="registrations"
          stroke="var(--color-registrations)"
          fill="var(--color-registrations)"
          fillOpacity={0.2}
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="outpatient"
          stroke="var(--color-outpatient)"
          fill="var(--color-outpatient)"
          fillOpacity={0.15}
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  );
}

export function AppointmentVolumeChart() {
  return (
    <ChartContainer config={appointmentConfig} className="h-[280px] w-full">
      <BarChart data={APPOINTMENT_VOLUME_WEEKLY} margin={{ left: 0, right: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={11} />
        <YAxis tickLine={false} axisLine={false} fontSize={11} width={32} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="completed" fill="var(--color-completed)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="scheduled" fill="var(--color-scheduled)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

export function RevenueBreakdownChart() {
  return (
    <ChartContainer config={revenueConfig} className="h-[260px] w-full">
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Pie
          data={REVENUE_BREAKDOWN}
          dataKey="amount"
          nameKey="source"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={2}
        >
          {REVENUE_BREAKDOWN.map((entry) => (
            <Cell key={entry.source} fill={entry.fill} />
          ))}
        </Pie>
      </PieChart>
    </ChartContainer>
  );
}

export function PaymentTrendChart() {
  return (
    <ChartContainer config={paymentConfig} className="h-[240px] w-full">
      <BarChart data={PAYMENT_TREND}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="week" tickLine={false} axisLine={false} fontSize={11} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="collected" fill="var(--color-collected)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="outstanding" fill="var(--color-outstanding)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

export function PharmacyVolumeChart() {
  return (
    <ChartContainer config={pharmacyConfig} className="h-[200px] w-full">
      <AreaChart data={PHARMACY_OPERATIONS.volumeByDay}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={10} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area
          type="monotone"
          dataKey="prescriptions"
          stroke="var(--color-prescriptions)"
          fill="var(--color-prescriptions)"
          fillOpacity={0.25}
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  );
}

export function WardOccupancyChart() {
  return (
    <ChartContainer config={wardConfig} className="h-[200px] w-full">
      <BarChart data={BED_OCCUPANCY_BY_WARD} layout="vertical" margin={{ left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} hide />
        <YAxis
          type="category"
          dataKey="ward"
          tickLine={false}
          axisLine={false}
          width={72}
          fontSize={10}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="occupancy" fill="var(--color-occupancy)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
