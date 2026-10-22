import React from "react";
import { Shield } from "lucide-react";

export const PermissionHeader: React.FC<{
  title?: string;
  description?: string;
}> = ({
  title = "Permission Management",
  description = "Manage and configure system permissions",
}) => (
  <div className="flex mb-10 rounded-t-lg items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
    <div className="flex items-center space-x-3">
      <div className="p-2 bg-blue-100 rounded-lg">
        <Shield className="h-6 w-6 text-blue-600" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </div>
  </div>
);
