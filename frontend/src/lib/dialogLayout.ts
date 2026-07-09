import { cn } from "@/lib/utils";

/** Keeps dialogs visible on short laptop viewports instead of vertically center-clipping. */
export const DIALOG_RESPONSIVE_POSITION =
  "top-[max(1rem,5dvh)] translate-y-0 sm:top-[50%] sm:-translate-y-1/2";

/** Safe max height for modal content on laptop and mobile viewports. */
export const DIALOG_MAX_HEIGHT = "max-h-[min(90dvh,calc(100vh-2rem))]";

/** Sticky-header/footer modal shell with internal scroll body. */
export const DIALOG_SCROLLABLE_CONTENT = cn(
  "flex w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0",
  DIALOG_MAX_HEIGHT,
  DIALOG_RESPONSIVE_POSITION
);

/** Scrollable middle section inside DIALOG_SCROLLABLE_CONTENT. */
export const DIALOG_SCROLLABLE_BODY =
  "min-h-0 flex-1 overflow-y-auto overscroll-contain";

/** Simple modals: entire dialog scrolls when content is tall. */
export const DIALOG_SIMPLE_SCROLL = cn(DIALOG_MAX_HEIGHT, "overflow-y-auto", DIALOG_RESPONSIVE_POSITION);
