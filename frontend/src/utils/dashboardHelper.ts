export const normalizeStatus = (status: string) => {
  if (status === "resolved" || status === "closed") return "resolved";
  if (status === "rejected") return "rejected";
  return "pending";
};

export const isWithinRange = (date: string, range: "90d" | "30d" | "7d") => {
  const now = new Date();
  const created = new Date(date);

  const diffDays = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);

  if (range === "7d") return diffDays <= 7;
  if (range === "30d") return diffDays <= 30;
  return diffDays <= 90;
};

export type TimeRange = "90d" | "30d" | "7d";

export const mapDashboardToStatCards = (
  dashboardData: any,
  selectedInstituteId: string,
  selectedProjectId: string | null,
  timeRange: TimeRange
) => {
  let resolved = 0;
  let pending = 0;
  let rejected = 0;

  const institute = dashboardData?.data?.institutes.find(
    (i: any) => i.institute_id === selectedInstituteId
  );

  if (!institute) return [];

  const projects = selectedProjectId
    ? institute.projects.filter((p: any) => p.project_id === selectedProjectId)
    : institute.projects;

  projects.forEach((project: any) => {
    project.issues.forEach((issue: any) => {
      if (!isWithinRange(issue.created_at, timeRange)) return;

      const bucket = normalizeStatus(issue.status);
      if (bucket === "resolved") resolved++;
      else if (bucket === "rejected") rejected++;
      else pending++;
    });
  });

  const total = resolved + pending + rejected || 1;

  return [
    {
      id: "1",
      title: "Resolved Requests",
      value: resolved,
      percent: Math.round((resolved / total) * 100),
      change: "+0%",
      color: "hsl(var(--chart-1))",
      status: "positive",
    },
    {
      id: "2",
      title: "Pending Requests",
      value: pending,
      percent: Math.round((pending / total) * 100),
      change: "+0%",
      color: "hsl(var(--chart-2))",
      status: "positive",
    },
    {
      id: "3",
      title: "Rejected Requests",
      value: rejected,
      percent: Math.round((rejected / total) * 100),
      change: "-0%",
      color: "hsl(var(--chart-3))",
      status: "negative",
    },
  ];
};



export const exportToCSV = (rows: Record<string, any>[], filename: string) => {
  if (!rows.length) return;

  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(","),
    ...rows.map(row =>
      headers
        .map(h => `"${String(row[h]).replace(/"/g, '""')}"`)
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
