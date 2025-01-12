import { Edge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import { cn } from "@/lib/utils";

interface DropIndicatorProps {
  edge: Edge;
  gap?: string;
  color?: string;
  level: number;
}

export function DropIndicator({
  edge,
  gap = "0",
  color = "rgb(59, 130, 246)",
  level,
}: Readonly<DropIndicatorProps>) {
  const gapOffset = `calc(0px - ${gap})`;

  return (
    <div
      className={cn(
        "absolute right-0 h-0.5 rounded-[1px] pointer-events-none bg-blue-500",
        level === 0 && "left-2",
        level === 1 && "left-8",
        level === 2 && "left-12",
        level === 3 && "left-16",
        level >= 4 && "left-20",
        edge === "top" && `top-[${gapOffset}]`,
        edge === "bottom" && `bottom-[${gapOffset}]`,
        color === "rgb(168, 85, 247)" && "bg-purple-500",
        color === "rgb(236, 72, 153)" && "bg-pink-500",
        color === "rgb(234, 179, 8)" && "bg-yellow-500",
        color === "rgb(34, 197, 94)" && "bg-green-500",
        color === "rgb(249, 115, 22)" && "bg-orange-500"
      )}
    />
  );
}
