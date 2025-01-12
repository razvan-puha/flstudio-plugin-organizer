"use client";

import { Card } from "@/components/ui/card";
import { TreeItem } from "@/components/tree/tree-item";
import {
  TreeItemDragData,
  TreeViewProps,
  TreeItem as TreeItemType,
} from "@/types/types";
import { useCallback, useState, useRef, useEffect, useMemo } from "react";
import {
  monitorForElements,
  dropTargetForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { reorderWithEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/util/reorder-with-edge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import {
  Edge,
  attachClosestEdge,
  extractClosestEdge,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import { DropIndicator } from "@/components/ui/drop-indicator";
import { cn, findItemInTree, removeItemFromTree } from "@/lib/utils";
import { useTreeViewContext } from "@/contexts/tree-view-context";

export function TreeView({
  items: initialItems,
  onItemsChange,
  className,
  containerId,
  type,
}: Readonly<TreeViewProps>) {
  const [items, setItems] = useState(initialItems);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<
    { type: "idle" } | { type: "dragging-over"; edge: Edge }
  >({ type: "idle" });

  const { registerContainer, unregisterContainer, notifyItemRemoved, updateItems, callbacks } = useTreeViewContext();

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  useEffect(() => {
    updateItems(containerId, items);
    onItemsChange?.(items);
  }, [items, containerId, updateItems, onItemsChange]);

  const addItem = useCallback(
    (item: TreeItemType, targetId?: string, position?: 'before' | 'after') => {
      setItems((prev) => {
        if (!targetId) {
          return [...prev, { ...item, parentId: containerId, containerType: type }];
        }

        const targetIndex = prev.findIndex(i => i.id === targetId);
        if (targetIndex === -1) {
          return [...prev, { ...item, parentId: containerId, containerType: type }];
        }

        const newItems = [...prev];
        const insertIndex = position === 'before' ? targetIndex : targetIndex + 1;
        newItems.splice(insertIndex, 0, { ...item, parentId: containerId, containerType: type });
        return newItems;
      });
    },
    [containerId, type]
  );

  const removeItem = useCallback(
    (itemId: string) => {
      const item = findItemInTree(items, itemId);
      if (!item) return;

      setItems((prev) => removeItemFromTree(prev, itemId));
      notifyItemRemoved(containerId, item);
    },
    [items, containerId, notifyItemRemoved]
  );

  const containerCallbacks = useMemo(() => ({
    addItem,
    removeItem
  }), [addItem, removeItem]);

  useEffect(() => {
    registerContainer(containerId, containerCallbacks, items);
    return () => unregisterContainer(containerId);
  }, [containerId, containerCallbacks, items, registerContainer, unregisterContainer]);

  const handleMovesUnderTheContainer = useCallback(
    (sourceData: TreeItemDragData, targetData: TreeItemDragData) => {
      const indexOfSource = items.findIndex((item) => item.id === sourceData.id);
      const indexOfTarget = items.findIndex((item) => item.id === targetData.id);

      if (indexOfSource < 0 || indexOfTarget < 0) return;

      const closestEdgeOfTarget = extractClosestEdge(targetData);
      const newItems = reorderWithEdge({
        list: items,
        startIndex: indexOfSource,
        indexOfTarget,
        closestEdgeOfTarget,
        axis: "vertical",
      });
      
      setItems(newItems);
    },
    [items, setItems]
  );

  const handleMovesUnderTheSameParent = useCallback(
    (sourceData: TreeItemDragData, targetData: TreeItemDragData) => {
      const parentItem = items.find((item) => item.id === sourceData.data.parentId);
      if (!parentItem?.children) return;

      const indexOfSource = parentItem.children.findIndex((item) => item.id === sourceData.id);
      const indexOfTarget = parentItem.children.findIndex((item) => item.id === targetData.id);

      if (indexOfSource < 0 || indexOfTarget < 0) return;

      const closestEdgeOfTarget = extractClosestEdge(targetData);
      const newChildren = reorderWithEdge({
        list: parentItem.children,
        startIndex: indexOfSource,
        indexOfTarget,
        closestEdgeOfTarget,
        axis: "vertical",
      });

      setItems(items.map((item) => 
        item.id === parentItem.id 
          ? { ...item, children: newChildren }
          : item
      ));
    },
    [items, setItems]
  );

  const handleSameContainerMoves = useCallback(
    (sourceData: TreeItemDragData, targetData: TreeItemDragData) => {
      if (sourceData.data.parentId === targetData.data.parentId) {
        if (sourceData.data.parentId === containerId) {
          handleMovesUnderTheContainer(sourceData, targetData);
        } else {
          handleMovesUnderTheSameParent(sourceData, targetData);
        }
      }
    },
    [containerId, handleMovesUnderTheContainer, handleMovesUnderTheSameParent]
  );

  const handleCrossContainerMoves = useCallback(
    (sourceData: TreeItemDragData, targetData: TreeItemDragData) => {
      const sourceItem = findItemInTree(items, sourceData.id);
      if (!sourceItem) return;

      const targetCallbacks = callbacks[targetData.data.containerId];
      if (!targetCallbacks) return;

      const newItem = {
        ...sourceItem,
        id: crypto.randomUUID(),
        parentId: targetData.data.containerId,
        containerId: targetData.data.containerId,
        containerType: sourceItem.containerType
      };

      const edge = extractClosestEdge(targetData);
      const position = edge === 'top' ? 'before' : 'after';

      // Add to target container with position
      targetCallbacks.addItem(newItem, targetData.id, position);
      setItems(prev => removeItemFromTree(prev, sourceData.id));
    },
    [items, callbacks]
  );

  const handleToggle = useCallback(
    (id: string) => {
      const updateItem = (currentItems: typeof initialItems): typeof initialItems => {
        return currentItems.map((item) => {
          if (item.id === id) {
            return { ...item, isExpanded: !item.isExpanded };
          }
          if (item.children) {
            return { ...item, children: updateItem(item.children) };
          }
          return item;
        });
      };

      setItems(updateItem(items));
    },
    [items, setItems]
  );

  const filterItems = useCallback(
    (items: typeof initialItems, query: string): typeof items => {
      if (!query) return items;

      return items.reduce<typeof items>((acc, item) => {
        const matchesQuery = item.label
          .toLowerCase()
          .includes(query.toLowerCase());
        const childMatches = item.children
          ? filterItems(item.children, query)
          : [];

        if (matchesQuery || childMatches.length > 0) {
          acc.push({
            ...item,
            children: childMatches,
            isExpanded: childMatches.length > 0 ? true : item.isExpanded,
          });
        }

        return acc;
      }, []);
    },
    []
  );

  const filteredItems = filterItems(items, searchQuery);

  useEffect(() => {
    if (!containerRef.current) return;

    const cleanup = combine(
      dropTargetForElements({
        element: containerRef.current,
        getIsSticky: () => true,
        canDrop({ source }) {
          const sourceData = source.data as TreeItemDragData;
          return sourceData.type === "tree-item" && 
                 sourceData.data.containerType === type;
        },
        getData({ input }) {
          return attachClosestEdge(
            {
              id: containerId,
              type: "tree-item",
              data: { containerId, containerType: type },
            },
            {
              element: containerRef.current!,
              input,
              allowedEdges: ["top"],
            }
          );
        },
        onDragEnter({ self }) {
          const edge = extractClosestEdge(self.data);
          if (edge) {
            setDragState({ type: "dragging-over", edge });
          }
        },
        onDragLeave() {
          setDragState({ type: "idle" });
        },
        onDrop() {
          setDragState({ type: "idle" });
        },
      }),
      monitorForElements({
        canMonitor({ source }) {
          return source.data.type === "tree-item";
        },
        onDrop: ({ location, source }) => {
          const target = location.current.dropTargets[0];
          if (!target) return;

          const sourceData = source.data as TreeItemDragData;
          const targetData = target.data as TreeItemDragData;

          if (
            sourceData.type !== "tree-item" ||
            targetData.type !== "tree-item" ||
            sourceData.data.containerType !== targetData.data.containerType
          ) {
            return;
          }

          if (sourceData.data.containerId === targetData.data.containerId) {
            handleSameContainerMoves(sourceData, targetData);
          } else {
            handleCrossContainerMoves(sourceData, targetData);
          }
        },
      })
    );

    return cleanup;
  }, [items, containerId, handleSameContainerMoves, handleCrossContainerMoves, onItemsChange, type, setItems]);

  return (
    <Card className={cn("p-4 w-full max-w-md h-[30vh]", className)}>
      <div className="mb-4 relative">
        <Input
          type="text"
          placeholder="Search items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
      </div>
      <div
        ref={containerRef}
        className="space-y-0.5 overflow-y-auto h-[calc(30vh-5rem)] relative"
      >
        {dragState.type === "dragging-over" && (
          <DropIndicator
            edge={dragState.edge}
            gap="8px"
            color="rgb(249, 115, 22)"
            level={0}
          />
        )}
        {filteredItems.map((item) => (
          <TreeItem
            key={item.id}
            item={item}
            level={0}
            onToggle={handleToggle}
          />
        ))}
        {filteredItems.length === 0 && (
          <div className="text-center text-sm text-muted-foreground">
            No items found
          </div>
        )}
      </div>
    </Card>
  );
}
