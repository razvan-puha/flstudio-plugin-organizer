import { FolderItem, FileItem } from "@/types/folder";

export function searchItems(
  items: (FolderItem | FileItem)[], 
  query: string
): (FolderItem | FileItem)[] {
  if (!query.trim()) return items;
  
  const normalizedQuery = query.toLowerCase().trim();
  
  return items.reduce<(FolderItem | FileItem)[]>((results, item) => {
    const nameMatch = item.name.toLowerCase().includes(normalizedQuery);
    
    if (item.type === "folder") {
      const childMatches = searchItems(item.children, query);
      
      if (nameMatch || childMatches.length > 0) {
        results.push({
          ...item,
          children: childMatches,
        });
      }
    } else if (nameMatch || item.content?.toLowerCase().includes(normalizedQuery)) {
      results.push(item);
    }
    
    return results;
  }, []);
}