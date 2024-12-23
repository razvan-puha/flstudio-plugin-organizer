"use client";

import { FileItem, FolderItem } from "@/types/folder";
import { FolderActions } from "./folder-actions";
import { SearchBar } from "./search-bar";
import { FolderList } from "./folder-list";
import { Droppable } from "@hello-pangea/dnd";
import { useStore } from "@/lib/store";
import { useState } from "react";
import { CreateFileDialog } from "./create-file-dialog";
import { CreateFolderDialog } from "./create-folder-dialog";

interface FolderPaneProps {
  id: string;
  title: string;
  items: (FileItem | FolderItem)[];
  searchValue: string;
  onSearchChange: (value: string) => void;
  onNewFile: () => void;
  onNewFolder: () => void;
}

export function FolderPane({
  id,
  title,
  items,
  searchValue,
  onSearchChange,
  onNewFile,
  onNewFolder,
}: Readonly<FolderPaneProps>) {
  const { addNestedItem } = useStore();
  const [activeDialog, setActiveDialog] = useState<{
    type: "file" | "folder";
    parentId: string;
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

  return (
    <div className="flex flex-col h-[600px] bg-card rounded-lg border shadow-sm">
      <div className="p-4 border-b space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <FolderActions onNewFile={onNewFile} onNewFolder={onNewFolder} />
        </div>
        <SearchBar value={searchValue} onChange={onSearchChange} />
      </div>
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
    </div>
  );
}
