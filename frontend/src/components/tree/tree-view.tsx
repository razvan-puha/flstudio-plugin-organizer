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
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import {
  Edge,
  attachClosestEdge,
  extractClosestEdge,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import { cn, determineInsertIndex, findItemInTree, removeItemFromTree, areArraysEqual, areTreeItemsEqual } from "@/lib/utils";
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
    | { type: "idle" }
    | { type: "dragging-over"; edge: Edge; isOverTreeItem?: boolean }
  >({ type: "idle" });

  const { registerContainer, unregisterContainer, updateContainer, notifyItemRemoved, callbacks } = useTreeViewContext();

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

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  useEffect(() => {
    updateContainer(containerId, () => items);
    onItemsChange?.(items);
  }, [items, containerId, updateContainer, onItemsChange]);

  const handleMovesUnderTheContainer = useCallback(
    (sourceData: TreeItemDragData, targetData: TreeItemDragData) => {
      const indexOfSource = items.findIndex((item) => item.id === sourceData.id);
      const indexOfTarget = items.findIndex((item) => item.id === targetData.id);

      if (indexOfSource < 0 || indexOfTarget < 0) return;

      const edge = extractClosestEdge(targetData);
      const insertIndex = determineInsertIndex(edge, indexOfSource, indexOfTarget, items.length);

      const newItems = [...items];
      const [movedItem] = newItems.splice(indexOfSource, 1);
      newItems.splice(insertIndex, 0, movedItem);
      
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

      const edge = extractClosestEdge(targetData);
      const insertIndex = determineInsertIndex(edge, indexOfSource, indexOfTarget, parentItem.children.length);

      const newChildren = [...parentItem.children];
      const [movedItem] = newChildren.splice(indexOfSource, 1);
      newChildren.splice(insertIndex, 0, movedItem);

      setItems(items.map((item) => 
        item.id === parentItem.id 
          ? { ...item, children: newChildren }
          : item
      ));
    },
    [items, setItems]
  );

  const getDropPosition = (targetData: TreeItemDragData, edge: Edge | null) => {
    if (!edge && targetData.data.fileType === 'folder') {
      return { type: 'inside' as const };
    }
    return {
      type: 'edge' as const,
      position: edge === 'bottom' ? 'after' as const : 'before' as const
    };
  };

  const handleMoveToParent = useCallback(
    (sourceItem: TreeItemType, targetData: TreeItemDragData, itemsWithoutSource: TreeItemType[]) => {
      const dropPosition = getDropPosition(targetData, extractClosestEdge(targetData));
      
      if (dropPosition.type === 'inside') {
        return itemsWithoutSource.map(item => {
          if (item.id === targetData.data.id && item.fileType === 'folder') {
            const newChildren = [...(item.children || []), { ...sourceItem, parentId: item.id }];
            
            if (!areArraysEqual(item.children || [], newChildren, areTreeItemsEqual)) {
              return {
                ...item,
                children: newChildren,
                isExpanded: true
              };
            }
          }
          return item;
        });
      }

      return itemsWithoutSource;
    },
    []
  );

  const handleMoveToSibling = useCallback(
    (sourceItem: TreeItemType, targetData: TreeItemDragData, itemsWithoutSource: TreeItemType[], prev: TreeItemType[]) => {
      const dropPosition = getDropPosition(targetData, extractClosestEdge(targetData));
      if (dropPosition.type !== 'edge') return itemsWithoutSource;

      const siblings = prev.filter(i => i.parentId === targetData.data.parentId);
      const targetIndex = siblings.findIndex(i => i.id === targetData.data.id);
      const insertIndex = dropPosition.position === 'after' ? targetIndex + 1 : targetIndex;
      
      const newSiblings = [...siblings];
      newSiblings.splice(insertIndex, 0, { ...sourceItem, parentId: targetData.data.parentId });
      
      return newSiblings.map(item => 
        item.parentId === targetData.data.parentId ? itemsWithoutSource.find(s => s.id === item.id) || item : item
      );
    },
    []
  );

  const handleSameContainerMoves = useCallback(
    (sourceData: TreeItemDragData, targetData: TreeItemDragData) => {
      if (targetData.id === containerId) {
        updateContainer(containerId, (items) => {
          const sourceItem = findItemInTree(items, sourceData.id);
          if (!sourceItem) return items;
          
          const itemsWithoutSource = removeItemFromTree(items, sourceData.id);
          const edge = extractClosestEdge(targetData);
          const position = edge === 'top' ? 'start' : 'end';
          
          return position === 'start' 
            ? [{ ...sourceItem, parentId: containerId }, ...itemsWithoutSource]
            : [...itemsWithoutSource, { ...sourceItem, parentId: containerId }];
        });
        return;
      }

      if (sourceData.data.parentId === targetData.data.parentId) {
        if (sourceData.data.parentId === containerId) {
          handleMovesUnderTheContainer(sourceData, targetData);
        } else {
          handleMovesUnderTheSameParent(sourceData, targetData);
        }
        return;
      }

      // This algorithm handles moving items within the same container but to different parents
      setItems(prev => {
        // First find the item being dragged by its ID
        const sourceItem = findItemInTree(prev, sourceData.id);
        if (!sourceItem) return prev; // If not found, make no changes

        // Remove the dragged item from its current position
        const itemsWithoutSource = removeItemFromTree(prev, sourceData.id);
        
        // Try to move the item to the target as a child (into a folder)
        const withParentMove = handleMoveToParent(sourceItem, targetData, itemsWithoutSource);
        // If the parent move was successful (arrays are different), return the new tree
        if (!areArraysEqual(withParentMove, itemsWithoutSource, areTreeItemsEqual)) return withParentMove;

        // If parent move wasn't applicable, try moving as a sibling instead
        // This handles moving items before/after other items at the same level
        return handleMoveToSibling(sourceItem, targetData, itemsWithoutSource, prev);
      });
    },
    [containerId, handleMoveToParent, handleMoveToSibling, handleMovesUnderTheContainer, handleMovesUnderTheSameParent, updateContainer]
  );

  const handleCrossContainerMoves = useCallback(
    (sourceData: TreeItemDragData, targetData: TreeItemDragData) => {
      updateContainer(containerId, items => 
        removeItemFromTree(items, sourceData.id)
      );

      const targetCallbacks = callbacks[targetData.data.containerId];
      if (!targetCallbacks) return;

      const sourceItem = findItemInTree(items, sourceData.id);
      if (!sourceItem) return;

      const newItem = {
        ...sourceItem,
        id: crypto.randomUUID(),
        parentId: targetData.data.containerId,
        containerId: targetData.data.containerId,
        containerType: sourceItem.containerType
      };

      const edge = extractClosestEdge(targetData);
      const position = edge === 'top' ? 'before' : 'after';
      targetCallbacks.addItem(newItem, targetData.id, position);
    },
    [containerId, items, callbacks, updateContainer]
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

  const notifyTreeItemDragState = useCallback((isOver: boolean) => {
    setDragState(current => 
      current.type === "dragging-over" 
        ? { ...current, isOverTreeItem: isOver }
        : current
    );
  }, []);

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
          if (!containerRef.current) throw new Error("Element not found");
          const data = {
            id: containerId,
            type: "tree-item",
            data: { 
              id: containerId,
              containerId, 
              containerType: type,
              parentId: containerId
            },
          };
          return attachClosestEdge(data, {
            element: containerRef.current,
            input,
            allowedEdges: ["top", "bottom"]
          });
        },
        onDragEnter({ self }) {
          const edge = extractClosestEdge(self.data);
          setDragState({ 
            type: "dragging-over", 
            edge: edge ?? 'bottom',
            isOverTreeItem: false 
          });
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
          const sourceData = source.data as TreeItemDragData;
          return sourceData.type === "tree-item" && 
                 sourceData.data.containerType === type;
        },
        onDrop: ({ location, source }) => {
          // Get the most recent drop target data
          const dropTargets = location.current.dropTargets;
          const target = dropTargets[dropTargets.length - 1];  // Get the last (most specific) target
          if (!target) return;

          // Try to find a target with edge information
          const targetWithEdge = dropTargets.find(t => {
            const data = t.data as TreeItemDragData;
            return data.edge !== undefined;
          });

          const sourceData = source.data as TreeItemDragData;
          const targetData = targetWithEdge ? targetWithEdge.data as TreeItemDragData : target.data as TreeItemDragData;

          if (
            sourceData.id === targetData.id ||
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
      <div ref={containerRef} className="absolute inset-0 pointer-events-none">
        {/* This div will receive drag events for the container */}
      </div>
      <div
        className={cn(
          "space-y-1 overflow-y-auto h-[calc(30vh-5rem)] relative p-1",
          dragState.type === "dragging-over" && !dragState.isOverTreeItem && "bg-orange-600/20 rounded-md"
        )}
      >
        {filteredItems.map((item) => (
          <TreeItem
            key={item.id}
            item={item}
            level={0}
            onToggle={handleToggle}
            fileType={item.fileType}
            onDragStateChange={notifyTreeItemDragState}
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
