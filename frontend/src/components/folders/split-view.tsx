"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { CreateFileDialog } from "./create-file-dialog";
import { CreateFolderDialog } from "./create-folder-dialog";
import { searchItems } from "@/lib/utils/search";
import { ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { FolderPane } from "./folder-pane";

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

  const { getFolderContents, addItemToFolder } = useStore();
  const leftItems = getFolderContents(leftFolderId, type);
  const rightItems = getFolderContents(rightFolderId, type);

  const filteredLeftItems = searchItems(leftItems, leftSearch);
  const filteredRightItems = searchItems(rightItems, rightSearch);

  return (
    <>
      <div
        className={cn(
          "grid grid-cols-[30%,4%,30%] items-center gap-6 w-full",
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
    </>
  );
}
