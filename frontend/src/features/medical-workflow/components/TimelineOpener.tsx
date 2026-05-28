"use client";

import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  onOpen: () => void;
};

export function TimelineOpener({ onOpen }: Props) {
  return (
    <Button type="button" variant="outline" size="sm" onClick={onOpen}>
      <Clock className="mr-1.5 h-4 w-4" />
      History log
    </Button>
  );
}
