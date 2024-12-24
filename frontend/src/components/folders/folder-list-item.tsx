"use client";

import { useState, useEffect } from "react";
import { FolderItem, FileItem } from "@/types/folder";
import { Folder, File, ChevronRight, MoreVertical } from "lucide-react";
import { FolderItemContent } from "./folder-item-content";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface FolderListItemProps {
  item: FolderItem | FileItem;
  onClick: () => void;
  onCreateFile?: (parentId: string) => void;
  onCreateFolder?: (parentId: string) => void;
  searchQuery?: string;
}

export function FolderListItem({ 
  item, 
  onClick, 
  onCreateFile, 
  onCreateFolder,
  searchQuery 
}: Readonly<FolderListItemProps>) {
  const [isOpen, setIsOpen] = useState(false);

  // Automatically open folders that contain search results
  useEffect(() => {
    if (searchQuery && item.type === "folder") {
      const hasMatchingChildren = item.children.length > 0;
      setIsOpen(hasMatchingChildren);
    }
  }, [searchQuery, item]);

  const handleFolderClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.type === "folder") {
      setIsOpen(!isOpen);
    }
    onClick();
  };

  const isHighlighted = searchQuery && 
    item.name.toLowerCase().includes(searchQuery.toLowerCase());

    const {
      attributes,
      listeners,
      setNodeRef,
    transform,
    transition,
  } = useSortable({id: item.id});

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} {...attributes} {...listeners} style={style}>
      <div className="group relative">
        <div
          onClick={handleFolderClick}
          className={cn(
            "flex items-center gap-2 p-2 hover:bg-accent rounded-md cursor-pointer",
            isHighlighted && "bg-accent"
          )}
        >
          {item.type === "folder" && (
            <ChevronRight 
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                isOpen && "transform rotate-90"
              )} 
            />
          )}
          {item.type === "folder" ? (
            <>
              <Folder className="h-4 w-4 text-blue-500" />
              <span className="flex-1">{item.name}</span>
              <span className="text-muted-foreground text-sm">
                {item.children.length} items
              </span>
            </>
          ) : (
            <>
              <div className="w-4" />
              <File className="h-4 w-4 text-gray-500" />
              <span className="flex-1">{item.name}</span>
            </>
          )}
          
          {item.type === "folder" && (onCreateFile || onCreateFolder) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onCreateFile && (
                  <DropdownMenuItem onClick={() => onCreateFile(item.id)}>
                    New File
                  </DropdownMenuItem>
                )}
                {onCreateFolder && (
                  <DropdownMenuItem onClick={() => onCreateFolder(item.id)}>
                    New Folder
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
      
      {item.type === "folder" && (
        <FolderItemContent
          items={item.children}
          isOpen={isOpen}
          onItemClick={onClick}
          onCreateFile={onCreateFile}
          onCreateFolder={onCreateFolder}
          searchQuery={searchQuery}
        />
      )}
    </div>
  );
}