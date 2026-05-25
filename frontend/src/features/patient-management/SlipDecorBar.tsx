interface SlipDecorBarProps {
  position: "top" | "bottom";
}

const BAR_SRC = {
  top: "/top-bar.png",
  bottom: "/bottom-bar.png",
} as const;

export function SlipDecorBar({ position }: SlipDecorBarProps) {
  return (
    <img
      src={BAR_SRC[position]}
      alt=""
      className="w-full h-8 block"
      aria-hidden
      draggable={false}
    />
  );
}
