"use client";

import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TimelineOpenerProps {
  onOpen: () => void;
}

export function TimelineOpener({ onOpen }: TimelineOpenerProps) {
  return (
    <Button type="button" variant="outline" size="sm" onClick={onOpen}>
      <Clock className="mr-1 h-4 w-4" />
      Timeline
    </Button>
  );
}
