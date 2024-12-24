import { FolderItem, FileItem } from "@/types/folder";

// Utilities for handling file structure import/export
export function exportFileStructure(items: (FolderItem | FileItem)[]): string {
    return JSON.stringify(items, null, 2);
  }
  
  export function validateFileStructure(structure: (FolderItem | FileItem)[]): boolean {
    if (!Array.isArray(structure)) return false;
    
    const isValidItem = (item: FolderItem | FileItem): boolean => {
      if (!item?.id || !item?.name || !item?.type) return false;
      
      if (item.type === 'folder') {
        return Array.isArray(item.children) && 
          item.children.every((child: FolderItem | FileItem) => isValidItem(child));
      }
      
      return item.type === 'file';
    };
    
    return structure.every(isValidItem);
  }