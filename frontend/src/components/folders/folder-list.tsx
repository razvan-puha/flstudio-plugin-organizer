"use client";

import { FolderItem, FileItem } from "@/types/folder";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FolderPlus } from "lucide-react";
import { FolderListItem } from "./folder-list-item";
import { Draggable } from "@hello-pangea/dnd";

interface FolderListProps {
  items: (FolderItem | FileItem)[];
  onItemClick: (item: FolderItem | FileItem) => void;
  isDraggable?: boolean;
  onCreateFile?: (parentId: string) => void;
  onCreateFolder?: (parentId: string) => void;
  searchQuery?: string;
}

export function FolderList({ 
  items, 
  onItemClick, 
  isDraggable,
  onCreateFile,
  onCreateFolder,
  searchQuery
}: Readonly<FolderListProps>) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground p-4">
        <FolderPlus className="h-12 w-12 mb-4" />
        <p>No items found</p>
      </div>
    );
  }

  const content = (
    <div className="space-y-2 p-4">
      {items.map((item, index) => 
        isDraggable ? (
          <Draggable key={item.id} draggableId={item.id} index={index}>
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.draggableProps}
                {...provided.dragHandleProps}
              >
                <FolderListItem 
                  item={item} 
                  onClick={() => onItemClick(item)}
                  onCreateFile={onCreateFile}
                  onCreateFolder={onCreateFolder}
                  searchQuery={searchQuery}
                />
              </div>
            )}
          </Draggable>
        ) : (
          <FolderListItem 
            key={item.id} 
            item={item} 
            onClick={() => onItemClick(item)}
            onCreateFile={onCreateFile}
            onCreateFolder={onCreateFolder}
            searchQuery={searchQuery}
          />
        )
      )}
    </div>
  );

  return (
    <ScrollArea className="h-full">
      {content}
    </ScrollArea>
  );
}