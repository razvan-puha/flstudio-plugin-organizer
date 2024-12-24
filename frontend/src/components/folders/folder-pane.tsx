"use client";

import { FileItem, FolderItem } from "@/types/folder";
import { FolderList } from "./folder-list";
import { useStore } from "@/lib/store";
import { useState } from "react";
import { CreateFileDialog } from "./create-file-dialog";
import { CreateFolderDialog } from "./create-folder-dialog";
import { ImportDialog } from "./import-dialog";
import { FolderPaneHeader } from "./folder-pane-header";
import { cn } from "@/lib/utils";
import { ResetDialog } from "./reset-dialog";
import { UniqueIdentifier, useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

interface FolderPaneProps {
  id: UniqueIdentifier;
  title: string;
  items: (FileItem | FolderItem)[];
  searchValue: string;
  onSearchChange: (value: string) => void;
  onNewFile: () => void;
  onNewFolder: () => void;
  className?: string;
  enableImportExport?: boolean;
  type: "effects" | "generators";
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
  type,
}: Readonly<FolderPaneProps>) {
  const { addNestedItem, setFolderContents } = useStore();
  const [activeDialog, setActiveDialog] = useState<{
    type: "file" | "folder" | "import" | "reset";
    parentId?: string;
  } | null>(null);

  const handleCreateNestedFile = (name: string, content: string) => {
    if (!activeDialog?.parentId) return;

    addNestedItem(activeDialog.parentId, {
      id: Math.random().toString(36).substring(7),
      name,
      type: "file",
      content,
    }, type);
    setActiveDialog(null);
  };

  const handleCreateNestedFolder = (name: string) => {
    if (!activeDialog?.parentId) return;

    addNestedItem(activeDialog.parentId, {
      id: Math.random().toString(36).substring(7),
      name,
      type: "folder",
      children: [],
    }, type);
    setActiveDialog(null);
  };

  const handleImport = (structure: (FolderItem | FileItem)[]) => {
    setFolderContents(id, structure, type);
  };

  const handleReset = () => {
    setFolderContents(id, [], type);
  };

  const { setNodeRef } = useDroppable({
    id,
  });

  return (
    <div
      className={cn(
        "flex flex-col h-[600px] bg-card rounded-lg border shadow-sm",
        className
      )}
    >
      <FolderPaneHeader
        title={title}
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        onNewFile={onNewFile}
        onNewFolder={onNewFolder}
        onImport={() => setActiveDialog({ type: "import" })}
        onReset={() => setActiveDialog({ type: "reset" })}
        items={items}
        enableImportExport={enableImportExport}
      />

      <div ref={setNodeRef} className="flex-1 overflow-auto">
        <SortableContext id={id as string} items={items} strategy={verticalListSortingStrategy}>
          <FolderList
            items={items}
            onItemClick={() => {}}
            onCreateFile={(parentId) =>
              setActiveDialog({ type: "file", parentId })
            }
            onCreateFolder={(parentId) =>
              setActiveDialog({ type: "folder", parentId })
            }
            searchQuery={searchValue}
          />
        </SortableContext>
      </div>

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

      <ResetDialog
        open={activeDialog?.type === "reset"}
        onOpenChange={(open) => !open && setActiveDialog(null)}
        onReset={() => {
          handleReset();
          setActiveDialog(null);
        }}
      />
    </div>
  );
}
