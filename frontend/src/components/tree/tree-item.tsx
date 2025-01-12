"use client";

import { ChevronRight, FolderIcon, FileIcon } from "lucide-react";
import { cn, getEdgeColorByLevel } from "@/lib/utils";
import { TreeItemDragData, TreeItemState, TreeItem as TreeItemType } from "@/types/types";
import {
  draggable,
  dropTargetForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import {
  attachClosestEdge,
  extractClosestEdge
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import { pointerOutsideOfPreview } from "@atlaskit/pragmatic-drag-and-drop/element/pointer-outside-of-preview";
import { setCustomNativeDragPreview } from "@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview";
import { useRef, useEffect, useState, useCallback } from "react";
import { DropIndicator } from "../ui/drop-indicator";
import { createPortal } from "react-dom";

interface TreeItemProps {
  item: TreeItemType;
  level: number;
  onToggle: (id: string) => void;
}

export function TreeItem({ item, level, onToggle }: Readonly<TreeItemProps>) {
  const ref = useRef<HTMLDivElement>(null);
  const [innerItem, setInnerItem] = useState<TreeItemType>(item);
  const [state, setState] = useState<TreeItemState>({ type: "idle" });

  const getItemData = useCallback(
    (): TreeItemDragData => ({
      id: innerItem.id,
      data: innerItem,
      type: "tree-item",
    }),
    [innerItem]
  );

  useEffect(() => {
    setInnerItem(item);
  }, [item]);

  useEffect(() => {
    if (!ref.current) return;

    const cleanup = combine(
      draggable({
        element: ref.current,
        dragHandle: ref.current,
        getInitialData() {
          return getItemData();
        },
        onDragStart() {
          setState({ type: "is-dragging" });
        },
        onDrop() {
          setState({ type: "idle" });
        },
        onGenerateDragPreview({ nativeSetDragImage }) {
          setCustomNativeDragPreview({
            nativeSetDragImage,
            getOffset: pointerOutsideOfPreview({
              x: "16px",
              y: "8px",
            }),
            render({ container }) {
              setState({ type: "preview", container });
            },
          });
        },
      }),
      dropTargetForElements({
        element: ref.current,
        getIsSticky: () => true,
        canDrop({ source }) {
          if (source.element === ref.current) {
            return false;
          }

          const sourceData = source.data as TreeItemDragData;
          if (innerItem.children?.some(child => child.id === sourceData.id)) {
            return false;
          }

          return source.data.type === "tree-item";
        },
        getData({ input }) {
          if (!ref.current) throw new Error("Element not found");
          return attachClosestEdge(getItemData(), {
            element: ref.current,
            input,
            allowedEdges: ["top", "bottom"],
          });
        },
        onDragEnter({ self }) {
          const closestEdge = extractClosestEdge(self.data);
          setState({ type: "is-dragging-over", closestEdge });
        },
        onDragLeave() {
          setState({ type: "idle" });
        },
        onDrag({ self }) {
          const closestEdge = extractClosestEdge(self.data);
          setState((current) => {
            if (
              current.type === "is-dragging-over" &&
              current.closestEdge === closestEdge
            ) {
              return current;
            }
            return { type: "is-dragging-over", closestEdge };
          });
        },
        onDrop() {
          setState({ type: "idle" });
        },
      })
    );

    return cleanup;
  }, [getItemData, innerItem]);

  const hasChildren = innerItem.children && innerItem.children.length > 0;
  const Icon = hasChildren ? FolderIcon : FileIcon;

  const getLevelPadding = (level: number): string => {
    switch (level) {
      case 0: return 'pl-2';
      case 1: return 'pl-8';
      case 2: return 'pl-12';
      case 3: return 'pl-16';
      default: return 'pl-20';
    }
  };

  return (
    <>
      <div ref={ref} className="relative">
        <div
          className={cn(
            "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer select-none",
            "transition-colors duration-200",
            getLevelPadding(level),
            "hover:bg-accent",
            state.type === "is-dragging-over" && hasChildren && "bg-orange-500/20",
            state.type === "is-dragging" && "opacity-40"
          )}
          onClick={() => hasChildren && onToggle(innerItem.id)}
        >
          {hasChildren && (
            <ChevronRight
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                innerItem.isExpanded && "rotate-90"
              )}
            />
          )}
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{innerItem.label}</span>
        </div>
        {state.type === "is-dragging-over" && state.closestEdge ? (
          <DropIndicator 
            edge={state.closestEdge} 
            gap={"8px"} 
            color={getEdgeColorByLevel(level)}
            level={level}
          />
        ) : null}
        {innerItem.isExpanded && innerItem.children && (
          <div>
            {innerItem.children.map((child) => (
              <TreeItem
                key={child.id}
                item={child}
                level={level + 1}
                onToggle={onToggle}
              />
            ))}
          </div>
        )}
      </div>
      {state.type === "preview"
        ? createPortal(<DragPreview item={innerItem} />, state.container)
        : null}
    </>
  );
}

function DragPreview({ item }: Readonly<{ item: TreeItemType }>) {
  return <div className="border-solid rounded p-2 bg-white">{item.label}</div>;
}
