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
import { Search, Download, Upload, FolderPlus, RotateCcw } from "lucide-react";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import {
  Edge,
  attachClosestEdge,
  extractClosestEdge,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import {
  cn,
  findItemInTree,
  removeItemFromTree,
  areArraysEqual,
  areTreeItemsEqual,
} from "@/lib/utils";
import { useTreeViewContext } from "@/contexts/tree-view-context";
import { Button } from "@/components/ui/button";

export function TreeView({
  items: initialItems,
  onItemsChange,
  className,
  containerId,
  type,
  title,
  showViewOperations,
}: Readonly<TreeViewProps>) {
  const [items, setItems] = useState(initialItems);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<
    | { type: "idle" }
    | { type: "dragging-over"; edge: Edge; isOverTreeItem?: boolean }
  >({ type: "idle" });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [renameState, setRenameState] = useState<{
    itemId: string | null;
    value: string;
  }>({
    itemId: null,
    value: "",
  });

  const {
    registerContainer,
    unregisterContainer,
    updateContainer,
    notifyItemRemoved,
    callbacks,
  } = useTreeViewContext();

  const addItem = useCallback(
    (item: TreeItemType, targetId?: string, position?: "before" | "after") => {
      setItems((prev) => {
        if (!targetId) {
          return [
            ...prev,
            { ...item, parentId: containerId, containerType: type },
          ];
        }

        const targetIndex = prev.findIndex((i) => i.id === targetId);
        if (targetIndex === -1) {
          return [
            ...prev,
            { ...item, parentId: containerId, containerType: type },
          ];
        }

        const newItems = [...prev];
        const insertIndex =
          position === "before" ? targetIndex : targetIndex + 1;
        newItems.splice(insertIndex, 0, {
          ...item,
          parentId: containerId,
          containerType: type,
        });
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

  const containerCallbacks = useMemo(
    () => ({
      addItem,
      removeItem,
    }),
    [addItem, removeItem]
  );

  useEffect(() => {
    registerContainer(containerId, containerCallbacks, items);
    return () => unregisterContainer(containerId);
  }, [
    containerId,
    containerCallbacks,
    items,
    registerContainer,
    unregisterContainer,
  ]);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  useEffect(() => {
    updateContainer(containerId, () => items);
    onItemsChange?.(items);
  }, [items, containerId, updateContainer, onItemsChange]);

  const getDropPosition = (targetData: TreeItemDragData, edge: Edge | null) => {
    if (!edge && targetData.data.fileType === "folder") {
      return { type: "inside" as const };
    }
    return {
      type: "edge" as const,
      position: edge === "bottom" ? ("after" as const) : ("before" as const),
    };
  };

  const handleMoveToParent = useCallback(
    (
      sourceItem: TreeItemType,
      targetData: TreeItemDragData,
      itemsWithoutSource: TreeItemType[]
    ) => {
      const dropPosition = getDropPosition(
        targetData,
        extractClosestEdge(targetData)
      );

      if (dropPosition.type === "inside") {
        // Function to update children recursively
        const updateChildrenInTree = (
          items: TreeItemType[],
          targetId: string
        ): TreeItemType[] => {
          return items.map((item) => {
            if (item.id === targetId && item.fileType === "folder") {
              // Add the source item as a child of the target folder
              const newChildren = [
                ...item.children,
                {
                  ...sourceItem,
                  parentId: item.id,
                  containerId: item.containerId,
                },
              ];

              return {
                ...item,
                children: newChildren,
                isExpanded: false,
              };
            }
            if (item.children.length > 0) {
              return {
                ...item,
                children: updateChildrenInTree(item.children, targetId),
              };
            }
            return item;
          });
        };

        // Update the tree recursively
        return updateChildrenInTree(itemsWithoutSource, targetData.data.id);
      }

      return itemsWithoutSource;
    },
    []
  );

  const handleMoveToSibling = useCallback(
    (
      sourceItem: TreeItemType,
      targetData: TreeItemDragData,
      itemsWithoutSource: TreeItemType[]
    ) => {
      const dropPosition = getDropPosition(
        targetData,
        extractClosestEdge(targetData)
      );
      if (dropPosition.type !== "edge") return itemsWithoutSource;

      // Function to update children recursively
      const updateChildrenInTree = (
        items: TreeItemType[],
        parentId: string,
        newChildren: TreeItemType[]
      ): TreeItemType[] => {
        return items.map((item) => {
          if (item.id === parentId) {
            return { ...item, children: newChildren };
          }
          if (item.children.length > 0) {
            return {
              ...item,
              children: updateChildrenInTree(
                item.children,
                parentId,
                newChildren
              ),
            };
          }
          return item;
        });
      };

      // Find the parent item to get correct siblings
      const targetParentId = targetData.data.parentId;
      const parent = findItemInTree(itemsWithoutSource, targetParentId);

      // Get the correct siblings array
      let siblings: TreeItemType[];
      if (targetParentId === targetData.data.containerId) {
        // Root level items
        siblings = itemsWithoutSource;
      } else if (parent) {
        // Nested items
        siblings = parent.children;
      } else {
        return itemsWithoutSource;
      }

      // Create new siblings array with inserted item
      const targetIndex = siblings.findIndex(
        (i) => i.id === targetData.data.id
      );
      const insertIndex =
        dropPosition.position === "after" ? targetIndex + 1 : targetIndex;
      const newSiblings = [...siblings];
      newSiblings.splice(insertIndex, 0, {
        ...sourceItem,
        parentId: targetParentId,
      });

      // If we're at root level, return the new array directly
      if (targetParentId === targetData.data.containerId) {
        return newSiblings;
      }

      // Otherwise, update the parent's children in the tree
      return updateChildrenInTree(
        itemsWithoutSource,
        targetParentId,
        newSiblings
      );
    },
    []
  );

  const handleSameContainerMoves = useCallback(
    (sourceData: TreeItemDragData, targetData: TreeItemDragData) => {
      // This algorithm handles moving items within the same container but to different parents
      setItems((prev) => {
        // First find the item being dragged by its ID
        const sourceItem = findItemInTree(prev, sourceData.id);
        if (!sourceItem) return prev; // If not found, make no changes

        // Remove the dragged item from its current position
        const itemsWithoutSource = removeItemFromTree(prev, sourceData.id);

        // Try to move the item to the target as a child (into a folder)
        const withParentMove = handleMoveToParent(
          sourceItem,
          targetData,
          itemsWithoutSource
        );
        // If the parent move was successful (arrays are different), return the new tree
        if (
          !areArraysEqual(withParentMove, itemsWithoutSource, areTreeItemsEqual)
        ) {
          return withParentMove;
        }

        // If parent move wasn't applicable, try moving as a sibling instead
        // This handles moving items before/after other items at the same level
        return handleMoveToSibling(sourceItem, targetData, itemsWithoutSource);
      });
    },
    [handleMoveToParent, handleMoveToSibling]
  );

  const handleCrossContainerMoves = useCallback(
    (sourceData: TreeItemDragData, targetData: TreeItemDragData) => {
      updateContainer(containerId, (items) =>
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
        containerType: sourceItem.containerType,
      };

      const edge = extractClosestEdge(targetData);
      const position = edge === "top" ? "before" : "after";
      targetCallbacks.addItem(newItem, targetData.id, position);
    },
    [containerId, items, callbacks, updateContainer]
  );

  const handleToggle = useCallback(
    (id: string) => {
      const updateItem = (
        currentItems: typeof initialItems
      ): typeof initialItems => {
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
    setDragState((current) =>
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
          return (
            sourceData.type === "tree-item" &&
            sourceData.data.containerType === type
          );
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
              parentId: containerId,
            },
          };
          return attachClosestEdge(data, {
            element: containerRef.current,
            input,
            allowedEdges: ["top", "bottom"],
          });
        },
        onDragEnter({ self }) {
          const edge = extractClosestEdge(self.data);
          setDragState({
            type: "dragging-over",
            edge: edge ?? "bottom",
            isOverTreeItem: false,
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
          return (
            sourceData.type === "tree-item" &&
            sourceData.data.containerType === type
          );
        },
        onDrop: ({ location, source }) => {
          // Get the most recent drop target data
          const dropTargets = location.current.dropTargets;
          const target = dropTargets[dropTargets.length - 1]; // Get the last (most specific) target
          if (!target) return;

          // Try to find a target with edge information
          const targetWithEdge = dropTargets.find((t) => {
            const data = t.data as TreeItemDragData;
            return data.edge !== undefined;
          });

          const sourceData = source.data as TreeItemDragData;
          const targetData = targetWithEdge
            ? (targetWithEdge.data as TreeItemDragData)
            : (target.data as TreeItemDragData);

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
  }, [
    items,
    containerId,
    handleSameContainerMoves,
    handleCrossContainerMoves,
    onItemsChange,
    type,
    setItems,
  ]);

  const handleDownload = () => {
    const dataStr = JSON.stringify(items, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tree-structure-${containerId}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsedData = JSON.parse(content) as TreeItemType[];
        setItems(parsedData);
      } catch (error) {
        console.error("Error parsing JSON:", error);
      }
    };
    reader.readAsText(file);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleStartRename = useCallback((itemId: string, initialValue: string) => {
    setRenameState({
      itemId,
      value: initialValue,
    });
  }, []);

  const handleFinishRename = useCallback((newName: string) => {
    if (!renameState.itemId) return;
    
    setItems(prev => prev.map(item => {
      if (item.id === renameState.itemId) {
        return { ...item, label: newName };
      }
      return item;
    }));
    
    setRenameState({ itemId: null, value: "" });
  }, [renameState.itemId]);

  const handleAddFolder = useCallback(() => {
    const newFolderId = crypto.randomUUID();
    const newFolder: TreeItemType = {
      id: newFolderId,
      label: "New Folder",
      parentId: containerId,
      containerId: containerId,
      containerType: type,
      fileType: "folder",
      children: [],
      isExpanded: false,
    };
    
    setItems(prev => [...prev, newFolder]);
    handleStartRename(newFolderId, "New Folder");
  }, [containerId, type, handleStartRename]);

  const handleReset = useCallback(() => {
    setItems(initialItems);
    setSearchQuery("");
  }, [initialItems]);

  return (
    <Card
      className={cn(
        "flex flex-col w-full max-w-md h-[30vh] min-h-[300px]",
        className
      )}
    >
      <div className="shrink-0 p-4 pb-2">
        <div className="h-8 flex items-center justify-between mb-4 pb-2 border-b">
          <h2 className="text-sm font-medium truncate" title={title}>
            {title || type}
          </h2>

          {showViewOperations && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleReset}
                title="Reset structure to initial state"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDownload}
                title="Download current structure as JSON"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                title="Upload structure from JSON file"
              >
                <Upload className="h-4 w-4" />
              </Button>
              <Input
                type="file"
                ref={fileInputRef}
                onChange={handleUpload}
                accept="application/json"
                className="hidden"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={handleAddFolder}
                title="Add new folder to root level"
              >
                <FolderPlus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <div className="h-10 relative">
          <Input
            type="text"
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-full"
          />
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>

      <div className="flex-1 min-h-0 p-4 pt-0 relative">
        <div
          ref={containerRef}
          className="absolute inset-0 pointer-events-none"
        />
        <div
          className={cn(
            "h-full overflow-y-auto px-1",
            dragState.type === "dragging-over" &&
              !dragState.isOverTreeItem &&
              "bg-orange-600/20 rounded-md"
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
              isRenaming={item.id === renameState.itemId}
              onRename={handleFinishRename}
              initialRenameValue={renameState.value}
              onStartRename={handleStartRename}
            />
          ))}
          {filteredItems.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-2">
              No items found
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
