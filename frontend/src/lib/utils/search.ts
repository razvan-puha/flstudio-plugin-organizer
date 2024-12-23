import { FolderItem, FileItem } from "@/types/folder";

export function searchItems(items: (FolderItem | FileItem)[], query: string): (FolderItem | FileItem)[] {
  if (!query.trim()) return items;
  
  const normalizedQuery = query.toLowerCase().trim();
  
  return items.filter(item => 
    item.name.toLowerCase().includes(normalizedQuery)
  );
}