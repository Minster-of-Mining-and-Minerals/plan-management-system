"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (text: string) => void;
};

export function CanvasTextInsertDialog({ open, onOpenChange, onConfirm }: Props) {
  const [text, setText] = useState("");

  useEffect(() => {
    if (open) setText("");
  }, [open]);

  const handleConfirm = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add annotation text</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="canvas_annotation_text">Label</Label>
          <Input
            id="canvas_annotation_text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. Inflamed area, Pain location"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleConfirm();
              }
            }}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={!text.trim()} onClick={handleConfirm}>
            Place on diagram
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
