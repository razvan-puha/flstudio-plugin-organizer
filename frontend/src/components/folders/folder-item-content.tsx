"use client";

import { FolderItem, FileItem } from "@/types/folder";
import { FolderListItem } from "./folder-list-item";
import { motion, AnimatePresence } from "framer-motion";

interface FolderItemContentProps {
  items: (FolderItem | FileItem)[];
  isOpen: boolean;
  onItemClick: (item: FolderItem | FileItem) => void;
  onCreateFile?: (parentId: string) => void;
  onCreateFolder?: (parentId: string) => void;
  searchQuery?: string;
}

export function FolderItemContent({ 
  items, 
  isOpen, 
  onItemClick,
  onCreateFile,
  onCreateFolder,
  searchQuery
}: Readonly<FolderItemContentProps>) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="ml-4 border-l-2 border-muted"
        >
          {items.map((item) => (
            <div key={item.id} className="pl-4">
              <FolderListItem 
                item={item} 
                onClick={() => onItemClick(item)}
                onCreateFile={onCreateFile}
                onCreateFolder={onCreateFolder}
                searchQuery={searchQuery}
              />
            </div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}