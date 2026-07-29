import React from "react";
import { useGetDrillDownRecordsQuery } from "../../../redux/api/dashboardApi";

interface DrillDownDrawerProps {
  isOpen: boolean;
  metricKey: string | null;
  title: string;
  onClose: () => void;
}

export const DrillDownDrawer: React.FC<DrillDownDrawerProps> = ({
  isOpen,
  metricKey,
  title,
  onClose,
}) => {
  if (!isOpen || !metricKey) return null;

  const { data, isLoading } = useGetDrillDownRecordsQuery(
    { metricKey },
    { skip: !metricKey }
  );

  const records = data?.data?.records || [];

  const handleExportCSV = () => {
    if (!records.length) return;
    const keys = Object.keys(records[0]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [keys.join(","), ...records.map((r) => keys.map((k) => `"${r[k] || ""}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${metricKey}_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl bg-background text-foreground h-full shadow-2xl flex flex-col border-l border-border animate-slide-in-right">
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-muted/20">
          <div>
            <h2 className="text-xl font-bold tracking-tight">{title}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Detailed raw record analytics and drill-down audit log data for {metricKey}.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b border-border bg-muted/10 flex items-center justify-between gap-3">
          <div className="text-xs font-semibold text-muted-foreground">
            Total Records: <span className="text-foreground font-bold">{records.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="text-xs bg-primary text-primary-foreground font-semibold px-3 py-1.5 rounded-md hover:bg-primary/90 transition-colors flex items-center gap-1"
            >
              📥 Export CSV
            </button>
            <button
              onClick={() => window.print()}
              className="text-xs bg-secondary text-secondary-foreground font-semibold px-3 py-1.5 rounded-md hover:bg-secondary/90 transition-colors"
            >
              🖨️ Print
            </button>
          </div>
        </div>

        {/* Body Table */}
        <div className="flex-1 overflow-y-auto p-5">
          {isLoading ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm font-medium">
              Loading drill-down raw records...
            </div>
          ) : records.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
              No matching records found.
            </div>
          ) : (
            <div className="overflow-x-auto border border-border rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 text-muted-foreground font-semibold uppercase tracking-wider border-b border-border">
                  <tr>
                    {Object.keys(records[0]).map((col) => (
                      <th key={col} className="p-3">
                        {col.replace(/_/g, " ")}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {records.map((row, idx) => (
                    <tr key={idx} className="hover:bg-muted/30 transition-colors">
                      {Object.values(row).map((val, i) => (
                        <td key={i} className="p-3 max-w-[200px] truncate font-mono text-[11px]">
                          {typeof val === "object" ? JSON.stringify(val) : String(val)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/20 flex justify-end">
          <button
            onClick={onClose}
            className="text-xs font-semibold px-4 py-2 bg-muted text-foreground hover:bg-muted/80 rounded-md transition-colors"
          >
            Close Drawer
          </button>
        </div>
      </div>
    </div>
  );
};

export default DrillDownDrawer;
