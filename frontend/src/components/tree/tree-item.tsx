"use client";

import { ChevronRight, FolderIcon, FileIcon } from "lucide-react";
import { cn, getEdgeColorByLevel } from "@/lib/utils";
import {
  ContainerType,
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
import { Input } from "../ui/input";
import { useStore } from "@/data/store";

interface TreeItemProps {
  item: TreeItemType;
  level: number;
  fileType: FileType;
  containerType: ContainerType;
  onToggle: (id: string) => void;
  onDragStateChange?: (isOver: boolean) => void;
  isRenaming?: boolean;
  onRename?: (newName: string) => void;
  initialRenameValue?: string;
  onStartRename?: (itemId: string, initialValue: string) => void;
  onItemDrop: () => void;
}

const EDGE_THRESHOLD = 8; // pixels from the edge

function getDropType(
  element: HTMLElement,
  location: { clientX: number; clientY: number }
) {
  const rect = element.getBoundingClientRect();
  const distanceFromTop = Math.abs(location.clientY - rect.top);
  const distanceFromBottom = Math.abs(location.clientY - rect.bottom);

  // If we're close to either edge, it's an edge drop
  if (
    distanceFromTop <= EDGE_THRESHOLD ||
    distanceFromBottom <= EDGE_THRESHOLD
  ) {
    return "edge";
  }

  // Otherwise it's a folder drop
  return "folder";
}

export function TreeItem({
  item,
  level,
  fileType,
  containerType,
  onToggle,
  onDragStateChange,
  isRenaming,
  onRename,
  initialRenameValue,
  onStartRename,
  onItemDrop,
}: Readonly<TreeItemProps>) {
  const { moveItemBetweenTrees, addItemToParent } = useStore();

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
  const draggableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!edgeDropRef.current || !folderDropRef.current || !draggableRef.current)
      return;

    const cleanup = combine(
      // Draggable config for the folder drop target
      draggable({
        element: draggableRef.current,
        dragHandle: draggableRef.current,
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
        canDrop({ source, input }) {
          if (!folderDropRef.current) return false;

          // Don't allow folder drops if edge drop is active
          if (
            state.type === "is-dragging-over" &&
            state.activeDropTarget === "edge"
          ) {
            return false;
          }

          const dropType = getDropType(folderDropRef.current, input);
          if (dropType !== "folder") return false;

          const sourceData = source.data as TreeItemDragData;

          // Then check other conditions
          if (
            sourceData.id === innerItem.id ||
            sourceData.data.parentId === innerItem.id
          ) {
            return false;
          }

          // Only allow dropping into folders
          return sourceData.type === "tree-item" && fileType === "folder";
        },
        getData: getItemData,
        onDragEnter({ location }) {
          if (!folderDropRef.current) return;

          const dropType = getDropType(
            folderDropRef.current,
            location.current.input
          );
          if (dropType === "folder") {
            setState({
              type: "is-dragging-over",
              closestEdge: null,
              activeDropTarget: "folder",
            });
            onDragStateChange?.(true);
          }
        },
        onDragLeave() {
          setState({ type: "idle" });
          onDragStateChange?.(false);
        },
        onDrop({ source, location }) {
          const dropTargets = location.current.dropTargets;
          const target = dropTargets[dropTargets.length - 1];
          if (!target) return;

          const sourceData = source.data as TreeItemDragData;
          const targetData = target.data as TreeItemDragData;

          if (
            targetData.data.fileType === "container" ||
            targetData.data.fileType !== "folder"
          ) {
            return;
          }

          addItemToParent(
            sourceData.data.containerId,
            sourceData.data,
            targetData.data.containerId,
            targetData.data.id
          );

          setState({ type: "idle" });
          onItemDrop();
        },
      }),
      // Drop target for edge drops
      dropTargetForElements({
        element: edgeDropRef.current,
        getIsSticky: () => true,
        canDrop({ source, input }) {
          if (!edgeDropRef.current) return false;

          // Don't allow edge drops if folder drop is active
          if (
            state.type === "is-dragging-over" &&
            state.activeDropTarget === "folder"
          ) {
            return false;
          }

          const dropType = getDropType(edgeDropRef.current, input);
          if (dropType !== "edge") return false;

          const sourceData = source.data as TreeItemDragData;

          // Allow any tree item (file or folder) to be dropped at edges
          return sourceData.type === "tree-item";
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
          return {
            ...itemData,
            edge,
            ...data,
          };
        },
        onDragEnter({ self }) {
          const closestEdge = extractClosestEdge(self.data);
          setState({
            type: "is-dragging-over",
            closestEdge,
            activeDropTarget: "edge",
          });
        },
        onDragLeave() {
          setState({ type: "idle" });
        },
        onDrop({ source, location }) {
          const dropTargets = location.current.dropTargets;
          const target = dropTargets[dropTargets.length - 1];
          if (!target) return;

          const sourceData = source.data as TreeItemDragData;
          const targetData = target.data as TreeItemDragData;

          if (targetData.data.fileType === "container") {
            return;
          }

          // Otherwise handle normal tree item drops
          const targetWithEdge = dropTargets.find((t) => {
            const data = t.data as TreeItemDragData;
            return data.edge !== undefined;
          });

          if (
            sourceData.id === targetData.id ||
            sourceData.type !== "tree-item" ||
            targetData.type !== "tree-item" ||
            sourceData.data.containerType !== containerType
          ) {
            return;
          }

          const edge = extractClosestEdge(targetWithEdge?.data ?? targetData);
          const position = edge === "top" ? "before" : "after";

          moveItemBetweenTrees(
            sourceData.data.containerId,
            targetData.data.containerId,
            sourceData.data,
            targetData.id,
            position
          );

          setState({ type: "idle" });
          onItemDrop();
        },
      })
    );

    return cleanup;
  }, [
    addItemToParent,
    containerType,
    fileType,
    getItemData,
    innerItem,
    moveItemBetweenTrees,
    onDragStateChange,
    onItemDrop,
    state.activeDropTarget,
    state.type,
  ]);

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

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onStartRename?.(item.id, item.label);
  };

  return (
    <div className="group relative">
      {/* Edge drop zone at the top */}
      <div className="absolute inset-x-0 h-2 -top-1" ref={edgeDropRef}>
        {state.type === "is-dragging-over" &&
          state.activeDropTarget === "edge" &&
          state.closestEdge && (
            <DropIndicator
              edge={state.closestEdge}
              gap={"0.5rem"}
              color={getEdgeColorByLevel(level)}
              level={level}
            />
          )}
      </div>

      {/* Main content area - draggable and folder drop target */}
      <div
        ref={draggableRef}
        className={cn(
          "relative",
          "my-1" // Add spacing between items
        )}
      >
        <div
          ref={folderDropRef}
          className={cn(
            "relative px-1 py-1.5 rounded-md",
            // Show folder drop highlight
            fileType === "folder" &&
              state.type === "is-dragging-over" &&
              state.activeDropTarget === "folder" &&
              "bg-orange-500/20 ring-2 ring-orange-500/40"
          )}
        >
          <div
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 rounded-md select-none",
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
            onDoubleClick={handleDoubleClick}
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
            {isRenaming ? (
              <Input
                ref={inputRef}
                className="h-6 py-0 w-full"
                defaultValue={initialRenameValue}
                onBlur={(e) => onRename?.(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    onRename?.(e.currentTarget.value);
                  }
                  if (e.key === "Escape") {
                    onRename?.(initialRenameValue ?? item.label);
                  }
                }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="text-sm">{innerItem.label}</span>
            )}
          </div>
        </div>

        {/* Children */}
        {innerItem.isExpanded && innerItem.children && (
          <div className="pt-1 pl-4">
            {innerItem.children.map((child) => (
              <TreeItem
                key={child.id}
                item={child}
                level={level + 1}
                onToggle={onToggle}
                fileType={child.fileType}
                containerType={containerType}
                onDragStateChange={onDragStateChange}
                onItemDrop={onItemDrop}
              />
            ))}
          </div>
        )}
      </div>
      {/* Preview portal */}
      {state.type === "preview" && state.container
        ? createPortal(<DragPreview item={innerItem} />, state.container)
        : null}
    </div>
  );
}

function DragPreview({ item }: Readonly<{ item: TreeItemType }>) {
  return <div className="border-solid rounded p-2 bg-white">{item.label}</div>;
}
