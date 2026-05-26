import type { SlipDecorConfig } from "@/redux/types/patientSlipConfig";

interface SlipDecorBarProps {
  position: "top" | "bottom";
  config?: SlipDecorConfig;
}

const FALLBACK = {
  top: "/top-bar.png",
  bottom: "/bottom-bar.png",
} as const;

export function SlipDecorBar({ position, config }: SlipDecorBarProps) {
  if (config && !config.enabled) return null;

  const src = config?.image_url || FALLBACK[position];
  const height = config?.height_px ?? 32;
  const objectFit = config?.object_fit ?? "cover";
  const objectPosition = config?.object_position ?? "center";

  return (
    <img
      src={src}
      alt=""
      className="w-full block"
      style={{
        height,
        objectFit,
        objectPosition,
      }}
      aria-hidden
      draggable={false}
      crossOrigin={src.startsWith("http") ? "anonymous" : undefined}
    />
  );
}
