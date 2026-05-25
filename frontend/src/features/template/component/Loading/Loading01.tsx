import React from "react";
import { PLATFORM_NAME } from "@/config/platformBranding";

const Loading01 = () => {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      <p className="text-sm text-muted-foreground">{PLATFORM_NAME}</p>
    </div>
  );
};

export default Loading01;
