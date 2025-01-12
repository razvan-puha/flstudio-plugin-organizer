"use client";

import { ChevronRight, FolderIcon, FileIcon } from "lucide-react";
import { cn, getEdgeColorByLevel } from "@/lib/utils";
import {
  FileType,
  TreeItemDragData,
  TreeItemState,
  TreeItem as TreeItemType,
} from "@/types/types";
import {
  draggable,
  dropTargetForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import {
  attachClosestEdge,
  extractClosestEdge,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import { pointerOutsideOfPreview } from "@atlaskit/pragmatic-drag-and-drop/element/pointer-outside-of-preview";
import { setCustomNativeDragPreview } from "@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview";
import { useRef, useEffect, useState, useCallback } from "react";
import { DropIndicator } from "../ui/drop-indicator";
import { createPortal } from "react-dom";

interface TreeItemProps {
  item: TreeItemType;
  level: number;
  fileType: FileType;
  onToggle: (id: string) => void;
  onDragStateChange?: (isOver: boolean) => void;
}

export function TreeItem({
  item,
  level,
  fileType,
  onToggle,
  onDragStateChange,
}: Readonly<TreeItemProps>) {
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

  const edgeDropRef = useRef<HTMLDivElement>(null);
  const folderDropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!edgeDropRef.current || !folderDropRef.current) return;

    const cleanup = combine(
      // Draggable config for the folder drop target
      draggable({
        element: folderDropRef.current,
        dragHandle: folderDropRef.current,
        getInitialData: getItemData,
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
      // Drop target for folder drops
      dropTargetForElements({
        element: folderDropRef.current,
        getIsSticky: () => true,
        canDrop({ source }) {
          if (source.element === folderDropRef.current) return false;
          const sourceData = source.data as TreeItemDragData;
          if (innerItem.children?.some((child) => child.id === sourceData.id))
            return false;
          return source.data.type === "tree-item" && fileType === "folder";
        },
        getData: getItemData,
        onDragEnter() {
          setState({ type: "is-dragging-over", closestEdge: null });
          onDragStateChange?.(true);
        },
        onDragLeave() {
          setState({ type: "idle" });
          onDragStateChange?.(false);
        },
        onDrop() {
          setState({ type: "idle" });
        },
      }),
      // Drop target for edge drops
      dropTargetForElements({
        element: edgeDropRef.current,
        getIsSticky: () => true,
        canDrop({ source }) {
          if (source.element === folderDropRef.current) return false;
          return source.data.type === "tree-item";
        },
        getData({ input }) {
          if (!edgeDropRef.current) throw new Error("Element not found");
          const itemData = getItemData();
          const data = attachClosestEdge(itemData, {
            element: edgeDropRef.current,
            input,
            allowedEdges: ["top", "bottom"],
          });

          const edge = extractClosestEdge(data);
          
          // Add edge information in a serializable way
          return {
            ...itemData,
            edge: edge,
            ...data
          };
        },
        onDragEnter({ self }) {
          const closestEdge = extractClosestEdge(self.data);
        //   console.log('TreeItem onDragEnter - full data:', self.data);
        //   console.log('TreeItem onDragEnter - edge:', closestEdge);
          setState({ type: "is-dragging-over", closestEdge });
        },
        onDragLeave() {
          setState({ type: "idle" });
        },
        onDrop() {
          setState({ type: "idle" });
        },
      })
    );

    return cleanup;
  }, [fileType, getItemData, innerItem, onDragStateChange]);

  const Icon = fileType === "folder" ? FolderIcon : FileIcon;

  const getLevelPadding = (level: number): string => {
    switch (level) {
      case 0:
        return "pl-2";
      case 1:
        return "pl-8";
      case 2:
        return "pl-12";
      case 3:
        return "pl-16";
      default:
        return "pl-20";
    }
  };

  return (
    <div className="my-2" ref={edgeDropRef}>
      {state.type === "is-dragging-over" && state.closestEdge && (
        <DropIndicator
          edge={state.closestEdge}
          gap={"1rem"}
          color={getEdgeColorByLevel(level)}
          level={level}
        />
      )}
      <div className="relative my-1">
        <div ref={folderDropRef} className="relative px-1 py-0.5">
          {fileType === "folder" && (
            <div
              className={cn(
                "absolute inset-0 rounded-md transition-colors duration-200 pointer-events-none",
                state.type === "is-dragging-over" &&
                  !state.closestEdge &&
                  "bg-orange-500/20"
              )}
            />
          )}

          <div
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 rounded-md select-none relative z-10",
              "transition-colors duration-200",
              getLevelPadding(level),
              "hover:bg-accent",
              "hover:cursor-pointer",
              state.type === "is-dragging" && "opacity-40"
            )}
            onClick={(e) => {
              e.stopPropagation();
              if (fileType === "folder") {
                onToggle(innerItem.id);
              }
            }}
          >
            {fileType === "folder" && (
              <ChevronRight
                className={cn(
                  "h-4 w-4 transition-transform duration-200 cursor-pointer",
                  innerItem.isExpanded && "rotate-90"
                )}
              />
            )}
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{innerItem.label}</span>
          </div>
        </div>

        {/* Children */}
        {innerItem.isExpanded && innerItem.children && (
          <div className="pt-1">
            {innerItem.children.map((child) => (
              <TreeItem
                key={child.id}
                item={child}
                level={level + 1}
                onToggle={onToggle}
                fileType={child.fileType}
                onDragStateChange={onDragStateChange}
              />
            ))}
          </div>
        )}
      </div>
      {/* Preview portal */}
      {state.type === "preview"
        ? createPortal(<DragPreview item={innerItem} />, state.container)
        : null}
    </div>
  );
}

function DragPreview({ item }: Readonly<{ item: TreeItemType }>) {
  return <div className="border-solid rounded p-2 bg-white">{item.label}</div>;
}
