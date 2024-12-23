"use client";

import { Button } from "@/components/ui/button";
import { Plus, FolderPlus, FileText } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FolderActionsProps {
  onNewFile: () => void;
  onNewFolder: () => void;
}

export function FolderActions({ onNewFile, onNewFolder }: Readonly<FolderActionsProps>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="w ml-3 self-end text-white hover:bg-success">
          <Plus className="h-4 w-4 mr-2" />
          New
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onNewFolder}>
          <FolderPlus className="h-4 w-4 mr-2" />
          New Folder
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onNewFile}>
          <FileText className="h-4 w-4 mr-2" />
          New File
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}