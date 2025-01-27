import { ContainerType, TreeItem } from "@/types/types";
import { create } from "zustand";

type StoreState = {
  pluginTreeMap: Map<string, TreeItem[]>;
  addPluginTree: (containerId: string, tree: TreeItem[]) => void;
  getPluginTree: (containerId: string) => TreeItem[];
  deletePluginTree: (containerId: string) => void;
  addItemToPluginTree: (
    containerId: string,
    type: ContainerType,
    item: TreeItem,
    targetId?: string,
    position?: "before" | "after"
  ) => void;
  removeItemFromPluginTree: (containerId: string, itemId: string) => TreeItem[];
  renameItemInPluginTree: (
    containerId: string,
    itemId: string,
    newName: string
  ) => TreeItem[];
  findItemInPluginTree: (
    containerId: string,
    itemId: string
  ) => TreeItem | null;
  updateItemInPluginTree: (
    containerId: string,
    sourceItem: TreeItem,
    targetId: string,
    newItem: TreeItem
  ) => TreeItem[];
  moveItemBetweenTrees: (
    sourceContainerId: string,
    targetContainerId: string,
    sourceItem: TreeItem,
    targetId?: string,
    position?: "before" | "after"
  ) => void;
  resetStore: () => void;
  reorderItemInPluginTree: (
    containerId: string,
    sourceItem: TreeItem,
    targetId?: string,
    position?: "before" | "after"
  ) => void;
  addItemToParent: (
    containerId: string,
    sourceItem: TreeItem,
    targetContainerId: string,
    targetId: string
  ) => void;
};

export const useStore = create<StoreState>((set, get) => ({
  pluginTreeMap: new Map<string, TreeItem[]>(),
  addPluginTree: (containerId: string, tree: TreeItem[]) =>
    set((state) => {
      const newMap = new Map(state.pluginTreeMap);
      newMap.set(containerId, tree);
      return { pluginTreeMap: newMap };
    }),
  getPluginTree: (containerId: string): TreeItem[] => {
    return get().pluginTreeMap.get(containerId) ?? [];
  },
  addItemToPluginTree: (
    containerId: string,
    type: ContainerType,
    item: TreeItem,
    targetId?: string,
    position?: "before" | "after"
  ) => {
    const pluginTree = get().getPluginTree(containerId);
    if (!targetId) {
      set((state) => {
        const newMap = new Map(state.pluginTreeMap);
        newMap.set(containerId, [
          ...pluginTree,
          {
            ...item,
            parentId: containerId,
            containerType: type,
            containerId: containerId,
          },
        ]);
        return { pluginTreeMap: newMap };
      });
    }

    const targetIndex = pluginTree.findIndex((i) => i.id === targetId);
    if (targetIndex === -1) {
      return set((state) => {
        const newMap = new Map(state.pluginTreeMap);
        newMap.set(containerId, [
          ...pluginTree,
          {
            ...item,
            parentId: containerId,
            containerType: type,
            containerId: containerId,
          },
        ]);
        return { pluginTreeMap: newMap };
      });
    }

    const newItems = [...pluginTree];
    const insertIndex = position === "before" ? targetIndex : targetIndex + 1;
    newItems.splice(insertIndex, 0, {
      ...item,
      parentId: containerId,
      containerType: type,
    });
    set((state) => {
      const newMap = new Map(state.pluginTreeMap);
      newMap.set(containerId, newItems);
      return { pluginTreeMap: newMap };
    });
  },
  removeItemFromPluginTree: (containerId: string, itemId: string) => {
    const pluginTree = get().getPluginTree(containerId);
    const newTree = removeItemFromTreeRecursive(pluginTree, itemId);
    if (!newTree) {
      return [];
    }

    set((state) => {
      const newMap = new Map(state.pluginTreeMap);
      newMap.set(containerId, newTree);
      return { pluginTreeMap: newMap };
    });

    return newTree;
  },
  renameItemInPluginTree: (
    containerId: string,
    itemId: string,
    newName: string
  ) => {
    const pluginTree = get().getPluginTree(containerId);
    const newTree = renameItemInTreeRecursive(pluginTree, itemId, newName);
    if (!newTree) {
      return [];
    }

    set((state) => {
      const newMap = new Map(state.pluginTreeMap);
      newMap.set(containerId, newTree);
      return { pluginTreeMap: newMap };
    });

    return newTree;
  },
  findItemInPluginTree: (containerId: string, itemId: string) => {
    const pluginTree = get().getPluginTree(containerId);
    return findItemInTreeRecursive(pluginTree, itemId);
  },
  updateItemInPluginTree: (
    containerId: string,
    sourceItem: TreeItem,
    targetId: string,
    newItem: TreeItem
  ) => {
    const pluginTree = get().getPluginTree(containerId);
    const newTree = updateItemInTreeRecursive(
      pluginTree,
      sourceItem,
      targetId,
      newItem
    );
    if (!newTree) {
      return [];
    }

    set((state) => {
      const newMap = new Map(state.pluginTreeMap);
      newMap.set(containerId, newTree);
      return { pluginTreeMap: newMap };
    });

    return newTree;
  },
  resetStore: () => {
    set(() => ({
      pluginTreeMap: new Map<string, TreeItem[]>(),
    }));
  },
  reorderItemInPluginTree: (
    containerId: string,
    sourceItem: TreeItem,
    targetId?: string,
    position?: "before" | "after"
  ) => {
    const sourceTree = get().getPluginTree(containerId);
    const reorderedTree = reorderItemInTree(
      sourceTree,
      sourceItem,
      targetId,
      position
    );

    set((state) => {
      const newMap = new Map(state.pluginTreeMap);
      newMap.set(containerId, reorderedTree);
      return { pluginTreeMap: newMap };
    });
  },
  moveItemBetweenTrees: (
    sourceContainerId: string,
    targetContainerId: string,
    sourceItem: TreeItem,
    targetId?: string,
    position?: "before" | "after"
  ) => {
    if (sourceContainerId === targetContainerId) {
      get().reorderItemInPluginTree(
        sourceContainerId,
        sourceItem,
        targetId,
        position
      );
      return;
    }

    const sourceTree = get().getPluginTree(sourceContainerId);
    const targetTree = get().getPluginTree(targetContainerId);

    const newSourceTree = removeItemFromTreeRecursive(
      sourceTree,
      sourceItem.id
    );

    const newTargetTree = addItemToTree(
      targetTree,
      {
        ...sourceItem,
        parentId: targetContainerId,
        containerId: targetContainerId,
        children: sourceItem.children.map((child) => ({
          ...child,
          containerId: targetContainerId,
        })),
      },
      targetId,
      position
    );

    set((state) => {
      const newMap = new Map(state.pluginTreeMap);
      if (newSourceTree) newMap.set(sourceContainerId, newSourceTree);
      if (newTargetTree) newMap.set(targetContainerId, newTargetTree);
      return { pluginTreeMap: newMap };
    });
  },
  addItemToParent: (
    containerId: string,
    sourceItem: TreeItem,
    targetContainerId: string,
    targetId: string
  ) => {
    const sourceTree = get().getPluginTree(containerId);

    if (targetContainerId === containerId) {
      // If moving within the same tree
      const newSourceTree = removeItemFromTreeRecursive(
        sourceTree,
        sourceItem.id
      );
      if (!newSourceTree) return;

      const newTargetTree = addChildrenToTree(
        newSourceTree,
        sourceItem,
        targetId
      );
      set((state) => {
        const newMap = new Map(state.pluginTreeMap);
        newMap.set(containerId, newTargetTree);
        return { pluginTreeMap: newMap };
      });
    } else {
      // If moving between different trees
      const targetTree = get().getPluginTree(targetContainerId);
      const newSourceTree = removeItemFromTreeRecursive(
        sourceTree,
        sourceItem.id
      );
      const newTargetTree = addChildrenToTree(targetTree, sourceItem, targetId);

      set((state) => {
        const newMap = new Map(state.pluginTreeMap);
        if (newSourceTree) newMap.set(containerId, newSourceTree);
        if (newTargetTree) newMap.set(targetContainerId, newTargetTree);
        return { pluginTreeMap: newMap };
      });
    }
  },
  deletePluginTree: (containerId: string) => {
    set((state) => {
      const newMap = new Map(state.pluginTreeMap);
      newMap.delete(containerId);
      return { pluginTreeMap: newMap };
    });
  },
}));

function removeItemFromTreeRecursive(
  tree: TreeItem[],
  itemId: string
): TreeItem[] | undefined {
  return tree
    .filter((item) => item.id !== itemId)
    .map((item) => ({
      ...item,
      children: item.children
        ? removeItemFromTreeRecursive(item.children, itemId) ?? []
        : [],
    }));
}

function renameItemInTreeRecursive(
  tree: TreeItem[],
  itemId: string,
  newName: string
): TreeItem[] | undefined {
  return tree.map((item) => ({
    ...item,
    label: item.id === itemId ? newName : item.label,
    children: item.children
      ? renameItemInTreeRecursive(item.children, itemId, newName) ?? []
      : [],
  }));
}

function findItemInTreeRecursive(
  tree: TreeItem[],
  itemId: string
): TreeItem | null {
  for (const item of tree) {
    if (item.id === itemId) return item;
    if (item.children) {
      const found = findItemInTreeRecursive(item.children, itemId);
      if (found) return found;
    }
  }
  return null;
}

function updateItemInTreeRecursive(
  tree: TreeItem[],
  sourceItem: TreeItem,
  targetId: string,
  newItem?: TreeItem,
  position?: "before" | "after"
): TreeItem[] {
  // Handle root level items
  const targetIndex = tree.findIndex((item) => item.id === targetId);
  if (targetIndex !== -1) {
    const result = [...tree];
    if (newItem) {
      // Folder insertion case
      result[targetIndex] = {
        ...result[targetIndex],
        children: [
          ...result[targetIndex].children,
          {
            ...sourceItem,
            parentId: result[targetIndex].id,
            containerId: result[targetIndex].containerId,
          },
        ],
        // Keep the folder's current expanded state
        isExpanded: result[targetIndex].isExpanded,
      };
    } else {
      // Reordering case
      const insertIndex = position === "before" ? targetIndex : targetIndex + 1;
      result.splice(insertIndex, 0, {
        ...sourceItem,
        parentId: tree[0]?.parentId,
      });
    }
    return result;
  }

  // Recursively process children
  return tree.map((item) => ({
    ...item,
    children:
      item.children && item.children.length > 0
        ? updateItemInTreeRecursive(
            item.children,
            sourceItem,
            targetId,
            newItem,
            position
          )
        : [],
  }));
}

function reorderItemInTree(
  tree: TreeItem[],
  sourceItem: TreeItem,
  targetId?: string,
  position?: "before" | "after"
): TreeItem[] {
  // If no target or target not found, append to root level
  if (!targetId) {
    const treeWithoutSource =
      removeItemFromTreeRecursive(tree, sourceItem.id) ?? [];
    return [...treeWithoutSource, sourceItem];
  }

  // Remove source item from its current position
  const treeWithoutSource =
    removeItemFromTreeRecursive(tree, sourceItem.id) ?? [];

  // Use updateItemInTreeRecursive for reordering
  return updateItemInTreeRecursive(
    treeWithoutSource,
    sourceItem,
    targetId,
    undefined,
    position
  );
}

function addItemToTree(
  tree: TreeItem[],
  item: TreeItem,
  targetId?: string,
  position?: "before" | "after"
): TreeItem[] {
  if (!targetId) {
    return [...tree, item];
  }

  const targetIndex = tree.findIndex((i) => i.id === targetId);
  if (targetIndex === -1) {
    return [...tree, item];
  }

  const result = [...tree];
  const insertIndex = position === "before" ? targetIndex : targetIndex + 1;
  result.splice(insertIndex, 0, item);
  return result;
}

function addChildrenToTree(
  tree: TreeItem[],
  item: TreeItem,
  targetId: string
): TreeItem[] {
  // Helper function to recursively update the tree
  const updateTreeRecursive = (items: TreeItem[]): TreeItem[] => {
    return items.map((currentItem) => {
      // If this is the target parent
      if (currentItem.id === targetId) {
        return {
          ...currentItem,
          children: [
            ...(currentItem.children || []),
            {
              ...item,
              parentId: currentItem.id,
              containerId: currentItem.containerId,
            },
          ],
          // Ensure folder is expanded when adding children
          isExpanded: true,
        };
      }

      // If this item has children, recursively search them
      if (currentItem.children) {
        return {
          ...currentItem,
          children: updateTreeRecursive(currentItem.children),
        };
      }

      // Otherwise return the item unchanged
      return currentItem;
    });
  };

  // Start the recursive update from the root of the tree
  return updateTreeRecursive(tree);
}
