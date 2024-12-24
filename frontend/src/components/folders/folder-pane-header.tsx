"use client";

import { Button } from "@/components/ui/button";
import { FolderActions } from "./folder-actions";
import { SearchBar } from "./search-bar";
import { Download, Upload } from "lucide-react";
import { exportFileStructure } from "@/lib/utils/file-structure";
import { FolderItem, FileItem } from "@/types/folder";

interface FolderPaneHeaderProps {
  title: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onNewFile: () => void;
  onNewFolder: () => void;
  onImport: () => void;
  items: (FolderItem | FileItem)[];
  enableImportExport?: boolean;
}

export function FolderPaneHeader({
  title,
  searchValue,
  onSearchChange,
  onNewFile,
  onNewFolder,
  onImport,
  items,
  enableImportExport = false,
}: Readonly<FolderPaneHeaderProps>) {
  const handleExport = () => {
    const structure = exportFileStructure(items);
    const blob = new Blob([structure], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "file-structure.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 border-b space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="flex items-center gap-2">
          {enableImportExport && (
            <>
              <Button
                variant="outline"
                size="icon"
                onClick={handleExport}
                title="Export structure"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={onImport}
                title="Import structure"
              >
                <Upload className="h-4 w-4" />
              </Button>
            </>
          )}
          <FolderActions onNewFile={onNewFile} onNewFolder={onNewFolder} />
        </div>
      </div>
      <SearchBar value={searchValue} onChange={onSearchChange} />
    </div>
  );
}
