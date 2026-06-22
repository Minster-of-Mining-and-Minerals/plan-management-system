import React from "react";

export const PermissionGroupFormSkeleton: React.FC = () => (
  <div className="w-full flex items-center justify-center bg-white rounded-lg p-4">
    <div className="text-center py-12">
      <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
      <p className="text-lg text-primary">Loading permission group data...</p>
    </div>
  </div>
);
