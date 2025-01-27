"use client";

import { Card } from "@/components/ui/card";
import { TreeItem } from "@/components/tree/tree-item";
import {
  TreeItemDragData,
  TreeViewProps,
  TreeItem as TreeItemType,
} from "@/types/types";
import { useCallback, useState, useRef, useEffect } from "react";
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
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import { areArraysEqual, areTreeItemsEqual, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useStore } from "@/data/store";

export function TreeView({
  className,
  containerId,
  type,
  title,
  showViewOperations,
}: Readonly<TreeViewProps>) {
  const {
    addPluginTree,
    getPluginTree,
    addItemToPluginTree,
    renameItemInPluginTree,
    moveItemBetweenTrees,
    reorderItemInPluginTree,
    deletePluginTree,
  } = useStore();

  const [items, setItems] = useState(getPluginTree(containerId));
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<
    | { type: "idle" }
    | {
        type: "dragging-over";
        edge: Edge;
        isOverTreeItem?: boolean;
        isOverContainer?: boolean;
      }
  >({ type: "idle" });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [renameState, setRenameState] = useState<{
    itemId: string | null;
    value: string;
  }>({
    itemId: null,
    value: "",
  });

  const handleToggle = useCallback(
    (id: string) => {
      const updateItem = (currentItems: TreeItemType[]): TreeItemType[] => {
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

      const newItems = updateItem(items);
      addPluginTree(containerId, newItems);
      setItems(newItems);
    },
    [items, addPluginTree, containerId]
  );

  const filterItems = useCallback(
    (items: TreeItemType[], query: string): TreeItemType[] => {
      if (!query) return items;
      return items.reduce<TreeItemType[]>((acc, item) => {
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
          console.log("canDrop TreeView");
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
              fileType: "container",
            },
          };
          return attachClosestEdge(data, {
            element: containerRef.current,
            input,
            allowedEdges: ["top", "bottom"],
          });
        },
        onDragEnter() {
          console.log("onDragEnter TreeView");
          setDragState({
            type: "dragging-over",
            edge: "bottom",
            isOverContainer: true,
            isOverTreeItem: false,
          });
        },
        onDragLeave() {
          console.log("onDragLeave TreeView");
          setDragState({ type: "idle" });
        },
        onDrop({ location, source }) {
          const dropTargets = location.current.dropTargets;
          const target = dropTargets[dropTargets.length - 1];
          if (!target) return;

          const sourceData = source.data as TreeItemDragData;
          const targetData = target.data as TreeItemDragData;

          if (targetData.data.fileType !== "container") {
            return;
          }

          if (sourceData.data.containerId === targetData.data.containerId) {
            reorderItemInPluginTree(
              sourceData.data.containerId,
              sourceData.data
            );

            setItems(getPluginTree(containerId));
            setDragState({ type: "idle" });
            return;
          }

          if (targetData.data.containerId === containerId) {
            moveItemBetweenTrees(
              sourceData.data.containerId,
              containerId,
              sourceData.data
            );
            setItems(getPluginTree(containerId));
            setDragState({ type: "idle" });
          }
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
        onDrop({ source }) {
          const sourceData = source.data as TreeItemDragData;

          if (sourceData.data.containerId === containerId) {
            const tree = getPluginTree(containerId);
            if (!areArraysEqual(items, tree, areTreeItemsEqual)) {
              setItems(tree);
            }
          }
        },
      })
    );

    return cleanup;
  }, [
    items,
    containerId,
    moveItemBetweenTrees,
    getPluginTree,
    type,
    setItems,
    reorderItemInPluginTree,
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

  const handleStartRename = useCallback(
    (itemId: string, initialValue: string) => {
      setRenameState({
        itemId,
        value: initialValue,
      });
    },
    []
  );

  const handleFinishRename = useCallback(
    (newName: string) => {
      if (!renameState.itemId) return;

      renameItemInPluginTree(containerId, renameState.itemId, newName);
      setRenameState({ itemId: null, value: "" });
      setItems(getPluginTree(containerId));
    },
    [containerId, getPluginTree, renameItemInPluginTree, renameState.itemId]
  );

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

    addItemToPluginTree(containerId, type, newFolder);
    handleStartRename(newFolderId, "New Folder");
    setItems(getPluginTree(containerId));
  }, [
    containerId,
    type,
    addItemToPluginTree,
    handleStartRename,
    getPluginTree,
  ]);

  const handleReset = useCallback(() => {
    deletePluginTree(containerId);
    setItems([]);
    setSearchQuery("");
  }, [containerId, deletePluginTree]);

  const handleItemDrop = useCallback(() => {
    setItems(getPluginTree(containerId));
  }, [containerId, getPluginTree]);

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
          className={cn(
            "absolute inset-0",
            dragState.type === "dragging-over" &&
              dragState.isOverContainer &&
              "bg-orange-600/20",
            "rounded-md transition-colors duration-200"
            // "border-2"
          )}
        />
        <div
          className={cn(
            "h-full overflow-y-auto px-1 relative",
            dragState.type === "dragging-over" &&
              !dragState.isOverContainer &&
              dragState.isOverTreeItem &&
              "bg-orange-600/10",
            "rounded-md transition-colors duration-200"
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
              containerType={type}
              onItemDrop={handleItemDrop}
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
