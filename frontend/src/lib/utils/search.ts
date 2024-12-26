import { FolderItem, FileItem } from "@/types/folder";

export function searchItems(items: (FileItem | FolderItem)[], searchQuery: string): (FileItem | FolderItem)[] {
  if (!searchQuery) return items;
  
  const query = searchQuery.toLowerCase();
  
  return items.reduce<((FileItem | FolderItem)[])>((filtered, item) => {
    // Check if the current item matches the search
    const nameMatch = item.name.toLowerCase().includes(query);
    
    if (item.type === 'folder') {
      // Recursively search children if it's a folder
      const matchingChildren = searchItems(item.children, searchQuery);
      
      if (nameMatch || matchingChildren.length > 0) {
        // If folder name matches or has matching children, include it with filtered children
        filtered.push({
          ...item,
          children: matchingChildren
        });
      }
    } else if (nameMatch) {
      // If it's a file and matches, include it
      filtered.push(item);
    }
    
    return filtered;
  }, []);
}