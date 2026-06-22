import React from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ message, onRetry }) => {
  const router = useRouter();

  return (
    <div className="w-full flex items-center justify-center bg-white rounded-lg p-4">
      <div className="text-center py-12">
        <p className="text-red-600 text-lg mb-4">{message}</p>
        <div className="flex gap-3 justify-center">
          <Button onClick={() => router.push("/role")}>
            Back to Roles
          </Button>
          {onRetry && (
            <Button variant="outline" onClick={onRetry}>
              Retry
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
