export const formatStatus = (status: string = ""): string => {
    const normalized = status.toLowerCase().replace(/[-\s]/g, "_");
  
    if (normalized.includes("pending")) return "Pending";
    if (normalized.includes("in_progress") || normalized.includes("inprogress"))
      return "In Progress";
    if (normalized.includes("resolved")) return "Resolved";
    if (normalized.includes("closed")) return "Closed";
    if (normalized.includes("escalated")) return "Escalated";
    if (normalized.includes("completed")) return "Completed";
    if (normalized.includes("active")) return "Active";
    if (normalized.includes("accepted")) return "Accepted";
  
    // Additional fallback mappings for unknown BUT possible statuses:
    if (normalized.includes("open")) return "Open";
    if (normalized.includes("reopened")) return "Reopened";
    if (normalized.includes("failed")) return "Failed";
    if (normalized.includes("cancelled") || normalized.includes("canceled"))
      return "Cancelled";
  
    // Fallback for future unexpected values:
    return status
      .replace(/[_-]/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };
  