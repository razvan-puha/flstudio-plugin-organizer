"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { CreateFileDialog } from "./create-file-dialog";
import { CreateFolderDialog } from "./create-folder-dialog";
import { FileItem, FolderItem } from "@/types/folder";
import { searchItems } from "@/lib/utils/search";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { FolderPane } from "./folder-pane";

interface SplitViewProps {
  title: string;
  leftFolderId: string;
  rightFolderId: string;
  onMoveItem: (item: FileItem | FolderItem, fromId: string, toId: string) => void;
  className?: string;
}

export function SplitView({ title, leftFolderId, rightFolderId, onMoveItem, className }: Readonly<SplitViewProps>) {
  const [leftSearch, setLeftSearch] = useState("");
  const [rightSearch, setRightSearch] = useState("");
  const [activeDialog, setActiveDialog] = useState<{
    type: "file" | "folder";
    side: "left" | "right";
  } | null>(null);

  const { getFolderContents, addItemToFolder } = useStore();
  const leftItems = getFolderContents(leftFolderId);
  const rightItems = getFolderContents(rightFolderId);

  const filteredLeftItems = searchItems(leftItems, leftSearch);
  const filteredRightItems = searchItems(rightItems, rightSearch);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const sourceId = result.source.droppableId;
    const destId = result.destination.droppableId;
    
    if (sourceId === destId) return;

    const sourceItems = getFolderContents(sourceId);
    const item = sourceItems[result.source.index];
    
    onMoveItem(item, sourceId, destId);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className={cn("grid grid-cols-[30%,4%,30%] items-center gap-6 w-full", className)}>
        <FolderPane
          id={leftFolderId}
          title={title}
          items={filteredLeftItems}
          searchValue={leftSearch}
          onSearchChange={setLeftSearch}
          onNewFile={() => setActiveDialog({ type: "file", side: "left" })}
          onNewFolder={() => setActiveDialog({ type: "folder", side: "left" })}
        />
        <div className="flex items-center justify-center p-4">
          <ChevronsRight className="h-8 w-8 text-muted-foreground animate-pulse text-white" />
        </div>
        <FolderPane
          id={rightFolderId}
          title={`Organized ${title}`}
          items={filteredRightItems}
          searchValue={rightSearch}
          onSearchChange={setRightSearch}
          onNewFile={() => setActiveDialog({ type: "file", side: "right" })}
          onNewFolder={() => setActiveDialog({ type: "folder", side: "right" })}
          enableImportExport={true}
        />
      </div>

      <CreateFileDialog
        open={activeDialog?.type === "file"}
        onOpenChange={(open) => !open && setActiveDialog(null)}
        onCreateFile={(name, content) => {
          const folderId = activeDialog?.side === "left" ? leftFolderId : rightFolderId;
          addItemToFolder(folderId, {
            id: Math.random().toString(36).substring(7),
            name,
            type: "file",
            content,
          });
          setActiveDialog(null);
        }}
      />

      <CreateFolderDialog
        open={activeDialog?.type === "folder"}
        onOpenChange={(open) => !open && setActiveDialog(null)}
        onCreateFolder={(name) => {
          const folderId = activeDialog?.side === "left" ? leftFolderId : rightFolderId;
          addItemToFolder(folderId, {
            id: Math.random().toString(36).substring(7),
            name,
            type: "folder",
            children: [],
          });
          setActiveDialog(null);
        }}
      />
    </DragDropContext>
  );
}