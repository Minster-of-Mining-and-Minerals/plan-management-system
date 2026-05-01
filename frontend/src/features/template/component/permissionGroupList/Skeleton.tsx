import React from "react";

export const PermissionGroupFormSkeleton: React.FC = () => (
  <div className="w-full flex items-center justify-center bg-white rounded-lg p-4">
    <div className="text-center py-12">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#094C81] mx-auto mb-4"></div>
      <p className="text-[#094C81] text-lg">Loading permission group data...</p>
    </div>
  </div>
);
