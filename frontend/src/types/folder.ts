import { UniqueIdentifier } from "@dnd-kit/core";

export interface FolderItem {
  id: string;
  name: string;
  type: "folder";
  children: (FolderItem | FileItem)[];
}

export interface FileItem {
  id: string;
  name: string;
  type: "file";
  content?: string;
}

export interface ItemList {
  id: UniqueIdentifier;
  items: (FolderItem | FileItem)[];
}
