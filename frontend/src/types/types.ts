import { Edge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/dist/types/types";

export interface TreeItem {
  id: string;
  label: string;
  parentId: string;
  containerId: string;
  children?: TreeItem[];
  isExpanded?: boolean;
  containerType: ContainerType;
}

export type TreeItemState =
  | {
      type: "idle";
    }
  | {
      type: "preview";
      container: HTMLElement;
    }
  | {
      type: "is-dragging";
    }
  | {
      type: "is-dragging-over";
      closestEdge: Edge | null;
    };

export type TreeItemDragData = {
  id: string;
  data: TreeItem;
  type: "tree-item";
};

export type ContainerType = "effects" | "generators";

export interface TreeViewProps {
  items: TreeItem[];
  onItemsChange?: (items: TreeItem[]) => void;
  className?: string;
  containerId: string;
  type: ContainerType;
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
  updateItems: (containerId: string, items: TreeItem[]) => void;
  notifyItemRemoved: (containerId: string, item: TreeItem) => void;
  getItems: (containerId: string) => TreeItem[];
  callbacks: Record<string, TreeViewCallbacks>;
}

export interface TreeViewCallbacks {
  addItem: (item: TreeItem, targetId?: string, position?: 'before' | 'after') => void;
  removeItem: (itemId: string) => void;
}
