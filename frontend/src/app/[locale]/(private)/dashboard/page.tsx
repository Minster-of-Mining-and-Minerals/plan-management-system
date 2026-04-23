"use client";

import AreaChart01 from "@/features/template/component/ReCharts/AreaCharts/AreaChart01";
import BarChart01 from "@/features/template/component/ReCharts/BarCharts/BarChart01";
import BarChart08 from "@/features/template/component/ReCharts/BarCharts/BarChart08";
import PieChart11 from "@/features/template/component/ReCharts/PieCharts/PieChart11";
import ChartRadialText01 from "@/features/template/component/ReCharts/RadialCharts/ChartRadialText01";
import TableComponentExample from "@/features/template/usage/TableComponent.Example";

export default function DashboardPage() {
  return (
    <main className="flex-1 space-y-6">
      {/* Table Example */}
      <TableComponentExample />
      {/* Interactive Charts */}
      <div className="grid md:grid-cols-2 grid-cols-1 gap-2">
        <AreaChart01 />
        <BarChart01 />
        <BarChart08 />
        <PieChart11 />
        <ChartRadialText01 />
      </div>
    </main>
  );
}
