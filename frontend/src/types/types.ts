import { Edge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/dist/types/types";

export interface TreeItem {
  id: string;
  label: string;
  parentId: string;
  containerId: string;
  children: TreeItem[];
  isExpanded?: boolean;
  containerType: ContainerType;
  fileType: FileType;
}

export type TreeItemState = {
    type: "idle" | "preview" | "is-dragging" | "is-dragging-over";
    container?: HTMLElement;
    closestEdge?: Edge | null;
    activeDropTarget?: 'edge' | 'folder';
}

export type TreeItemDragData = {
  id: string;
  data: TreeItem;
  type: "tree-item";
  edge?: Edge;
};

export type ContainerType = "effects" | "generators";
export type FileType = "file" | "folder" | "container";

export interface TreeViewProps {
  onItemsChange?: (items: TreeItem[]) => void;
  className?: string;
  containerId: string;
  type: ContainerType;
  title: string;
  showViewOperations: boolean;
}

export interface PluginTreeList {
  effects: TreeItem[];
  generators: TreeItem[];
}

export interface PluginList {
  effects: VendorPlugins;
  generators: VendorPlugins;
}

export type VendorPlugins = {
  [key in string]: string[];
};

export interface TreeViewContextType {
  registerContainer: (id: string, callbacks: TreeViewCallbacks, items: TreeItem[]) => void;
  unregisterContainer: (id: string) => void;
  updateContainer: (containerId: string, updater: (items: TreeItem[]) => TreeItem[]) => void;
  notifyItemRemoved: (containerId: string, item: TreeItem) => void;
  getItems: (containerId: string) => TreeItem[];
  callbacks: Record<string, TreeViewCallbacks>;
}

export interface TreeViewCallbacks {
  addItem: (item: TreeItem, targetId?: string, position?: 'before' | 'after') => void;
  removeItem: (itemId: string) => void;
}
