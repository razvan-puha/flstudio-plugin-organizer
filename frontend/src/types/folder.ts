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