"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { CreateFileDialog } from "./create-file-dialog";
import { CreateFolderDialog } from "./create-folder-dialog";
import { searchItems } from "@/lib/utils/search";
import { ChevronsRight } from "lucide-react";
import { cn, getTypeFromContainerId } from "@/lib/utils";
import { FolderPane } from "./folder-pane";
import { DndContext, useSensors, useSensor, PointerSensor, KeyboardSensor, DragEndEvent, UniqueIdentifier, closestCenter } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

interface SplitViewProps {
  title: string;
  leftFolderId: string;
  rightFolderId: string;
  className?: string;
  type: "effects" | "generators";
}

export function SplitView({
  title,
  leftFolderId,
  rightFolderId,
  className,
  type,
}: Readonly<SplitViewProps>) {
  const [leftSearch, setLeftSearch] = useState("");
  const [rightSearch, setRightSearch] = useState("");
  const [activeDialog, setActiveDialog] = useState<{
    type: "file" | "folder";
    side: "left" | "right";
  } | null>(null);

  const { getFolderContents, addItemToFolder, moveItems, getItemIndex } = useStore();
  const leftItems = getFolderContents(leftFolderId, type);
  const rightItems = getFolderContents(rightFolderId, type);

  const filteredLeftItems = searchItems(leftItems, leftSearch);
  const filteredRightItems = searchItems(rightItems, rightSearch);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    // Get source and destination container IDs
    const activeContainer = active.data.current?.sortable?.containerId;
    const overContainer = over.data.current?.sortable?.containerId;
    
    // If we're dropping on an item in the same container, handle as a sort operation
    if (activeContainer && overContainer && activeContainer === overContainer) {
      if (activeId !== overId) {
        const type = getTypeFromContainerId(activeContainer);
        onMoveItem(activeId, overId, type, activeContainer);
      }
      return;
    }

    // If we're dropping directly on a container (FolderPane)
    const targetContainer = overContainer || over.id;
    if (targetContainer === leftFolderId || targetContainer === rightFolderId) {
      // Don't move if dropping in the same container
      if (activeContainer === targetContainer) return;

      const item = leftItems.find(i => i.id === activeId) || rightItems.find(i => i.id === activeId);
      if (!item) return;

      const sourceFolder = activeContainer === leftFolderId ? leftFolderId : rightFolderId;
      
      // Remove item from source folder and add to target folder
      useStore.getState().removeItemFromFolder(sourceFolder, activeId, type);
      useStore.getState().addItemToFolder(targetContainer, item, type);
    }
  }

  const onMoveItem = (
    fromId: UniqueIdentifier,
    toId: UniqueIdentifier,
    type: "effects" | "generators",
    containerId: string
  ): void => {
    if (fromId === toId) {
      return;
    }
    const activeIndex = getItemIndex(fromId, type, containerId);
    const overIndex = getItemIndex(toId, type, containerId);
    moveItems(activeIndex, overIndex, type, containerId);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div
        className={cn(
          "grid grid-cols-[30%,4%,30%] items-start gap-6 w-full",
          className
        )}
      >
        <FolderPane
          id={leftFolderId}
          title={`Default ${title} Structure`}
          items={filteredLeftItems}
          searchValue={leftSearch}
          onSearchChange={setLeftSearch}
          onNewFile={() => setActiveDialog({ type: "file", side: "left" })}
          onNewFolder={() => setActiveDialog({ type: "folder", side: "left" })}
          type={type}
        />
        <div className="flex items-center justify-center p-4">
          <ChevronsRight className="h-8 w-8 text-muted-foreground animate-pulse text-white" />
        </div>
        <FolderPane
          id={rightFolderId}
          title={`New ${title} Structure`}
          items={filteredRightItems}
          searchValue={rightSearch}
          onSearchChange={setRightSearch}
          onNewFile={() => setActiveDialog({ type: "file", side: "right" })}
          onNewFolder={() => setActiveDialog({ type: "folder", side: "right" })}
          enableImportExport={true}
          type={type}
        />
      </div>
      <CreateFileDialog
        open={activeDialog?.type === "file"}
        onOpenChange={(open) => !open && setActiveDialog(null)}
        onCreateFile={(name, content) => {
          const folderId =
            activeDialog?.side === "left" ? leftFolderId : rightFolderId;
          addItemToFolder(folderId, {
            id: Math.random().toString(36).substring(7),
            name,
            type: "file",
            content,
          }, type);
          setActiveDialog(null);
        }}
      />
      <CreateFolderDialog
        open={activeDialog?.type === "folder"}
        onOpenChange={(open) => !open && setActiveDialog(null)}
        onCreateFolder={(name) => {
          const folderId =
            activeDialog?.side === "left" ? leftFolderId : rightFolderId;
          addItemToFolder(folderId, {
            id: Math.random().toString(36).substring(7),
            name,
            type: "folder",
            children: [],
          }, type);
          setActiveDialog(null);
        }}
      />
    </DndContext>
  );
}
