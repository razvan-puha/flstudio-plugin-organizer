"use client";

import { FileItem, FolderItem } from "@/types/folder";
import { FolderList } from "./folder-list";
import { Droppable } from "@hello-pangea/dnd";
import { useStore } from "@/lib/store";
import { useState } from "react";
import { CreateFileDialog } from "./create-file-dialog";
import { CreateFolderDialog } from "./create-folder-dialog";
import { ImportDialog } from "./import-dialog";
import { FolderPaneHeader } from "./folder-pane-header";
import { cn } from "@/lib/utils";

interface FolderPaneProps {
  id: string;
  title: string;
  items: (FileItem | FolderItem)[];
  searchValue: string;
  onSearchChange: (value: string) => void;
  onNewFile: () => void;
  onNewFolder: () => void;
  className?: string;
  enableImportExport?: boolean;
}

export function FolderPane({
  id,
  title,
  items,
  searchValue,
  onSearchChange,
  onNewFile,
  onNewFolder,
  className,
  enableImportExport = false,
}: Readonly<FolderPaneProps>) {
  const { addNestedItem, setFolderContents } = useStore();
  const [activeDialog, setActiveDialog] = useState<{
    type: "file" | "folder" | "import";
    parentId?: string;
  } | null>(null);

  const handleCreateNestedFile = (name: string, content: string) => {
    if (!activeDialog?.parentId) return;

    addNestedItem(activeDialog.parentId, {
      id: Math.random().toString(36).substring(7),
      name,
      type: "file",
      content,
    });
    setActiveDialog(null);
  };

  const handleCreateNestedFolder = (name: string) => {
    if (!activeDialog?.parentId) return;

    addNestedItem(activeDialog.parentId, {
      id: Math.random().toString(36).substring(7),
      name,
      type: "folder",
      children: [],
    });
    setActiveDialog(null);
  };

  const handleImport = (structure: (FolderItem | FileItem)[]) => {
    setFolderContents(id, structure);
  };

  return (
    <div className={cn("flex flex-col h-[600px] bg-card rounded-lg border shadow-sm", className)}>
      <FolderPaneHeader
        title={title}
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        onNewFile={onNewFile}
        onNewFolder={onNewFolder}
        onImport={() => setActiveDialog({ type: "import" })}
        items={items}
        enableImportExport={enableImportExport}
      />
      <Droppable droppableId={id}>
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex-1 overflow-auto"
          >
            <FolderList
              items={items}
              isDraggable
              onItemClick={() => {}}
              onCreateFile={(parentId) => setActiveDialog({ type: "file", parentId })}
              onCreateFolder={(parentId) => setActiveDialog({ type: "folder", parentId })}
              searchQuery={searchValue}
            />
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      <CreateFileDialog
        open={activeDialog?.type === "file"}
        onOpenChange={(open) => !open && setActiveDialog(null)}
        onCreateFile={handleCreateNestedFile}
      />

      <CreateFolderDialog
        open={activeDialog?.type === "folder"}
        onOpenChange={(open) => !open && setActiveDialog(null)}
        onCreateFolder={handleCreateNestedFolder}
      />

      <ImportDialog
        open={activeDialog?.type === "import"}
        onOpenChange={(open) => !open && setActiveDialog(null)}
        onImport={handleImport}
      />
    </div>
  );
}
