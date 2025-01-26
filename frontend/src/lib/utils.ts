import { TreeItem } from "@/types/types";
import { Edge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/dist/types/types";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function createRequestBody(file: FileList): FormData {
  const formData = new FormData();
  formData.append("file", file[0]);
  return formData;
}

export function getEdgeColorByLevel(level: number): string {
  switch (level) {
    case 0:
      return "rgb(59, 130, 246)"; // blue-500
    case 1:
      return "rgb(168, 85, 247)"; // purple-500
    case 2:
      return "rgb(236, 72, 153)"; // pink-500
    case 3:
      return "rgb(234, 179, 8)"; // yellow-500
    default:
      return "rgb(34, 197, 94)"; // green-500
  }
}
export function removeItemFromTree(
  items: TreeItem[],
  itemId: string
): TreeItem[] {
  return items.reduce<TreeItem[]>((acc, item) => {
    if (item.id === itemId) return acc;

    if (item.children) {
      const newChildren = removeItemFromTree(item.children, itemId);
      acc.push({ ...item, children: newChildren });
    } else {
      acc.push(item);
    }
    return acc;
  }, []);
}

export function insertItemInTree(
  items: TreeItem[],
  item: TreeItem,
  targetId: string,
  position: "before" | "after" | "inside"
): TreeItem[] {
  return items.reduce<TreeItem[]>((acc, current) => {
    if (current.id === targetId) {
      if (position === "before") {
        acc.push(item, current);
      } else if (position === "after") {
        acc.push(current, item);
      } else if (position === "inside") {
        acc.push({
          ...current,
          children: [...(current.children || []), item],
          isExpanded: true,
        });
      }
    } else if (current.children) {
      acc.push({
        ...current,
        children: insertItemInTree(current.children, item, targetId, position),
      });
    } else {
      acc.push(current);
    }
    return acc;
  }, []);
}

export function determineInsertIndex(edge: Edge | null, sourceIndex: number, targetIndex: number, arrayLength: number): number {
  if (edge === "top") {
    if (sourceIndex <= targetIndex) {
      return targetIndex === 0 ? 0 : targetIndex - 1;
    }
    return targetIndex;
  }

  if (edge === "bottom") {
    return targetIndex === arrayLength - 1
      ? arrayLength - 1
      : targetIndex + 1;
  }

  return targetIndex;
}

export function areArraysEqual<T>(arr1: T[], arr2: T[], comparator: (a: T, b: T) => boolean = (a, b) => a === b): boolean {
  if (arr1.length !== arr2.length) return false;
  
  return arr1.every((item, index) => comparator(item, arr2[index]));
}

// Specific comparator for TreeItems
export function areTreeItemsEqual(a: TreeItem, b: TreeItem): boolean {
  return a.id === b.id && 
         a.parentId === b.parentId && 
         a.containerId === b.containerId &&
         a.containerType === b.containerType &&
         a.fileType === b.fileType &&
         a.label === b.label &&
         areArraysEqual(a.children || [], b.children || [], areTreeItemsEqual);
}