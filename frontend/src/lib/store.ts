import { create } from "zustand";
import { persist } from "zustand/middleware";
import { FolderItem, FileItem, ItemList } from "@/types/folder";
import { UniqueIdentifier } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";

type FolderOrFileItem = FolderItem | FileItem;

interface StoreState {
  items: FolderOrFileItem[];
  effectsFolderContents: ItemList[];
  generatorsFolderContents: ItemList[];
  addItem: (item: FolderOrFileItem) => void;
  addItemToFolder: (
    folderId: UniqueIdentifier,
    item: FolderOrFileItem,
    type: "effects" | "generators"
  ) => void;
  getFolderContents: (
    folderId: UniqueIdentifier,
    type: "effects" | "generators"
  ) => FolderOrFileItem[];
  addNestedItem: (
    parentId: UniqueIdentifier,
    item: FolderOrFileItem,
    type: "effects" | "generators"
  ) => void;
  setFolderContents: (
    folderId: UniqueIdentifier,
    items: FolderOrFileItem[],
    type: "effects" | "generators"
  ) => void;
  getItemIndex: (
    itemId: UniqueIdentifier,
    type: "effects" | "generators",
    containerId: string
  ) => number;
  moveItems: (
    oldIndex: number,
    newIndex: number,
    type: "effects" | "generators",
    containerId: string
  ) => void;
}

const updateItemsRecursively = (
  items: FolderOrFileItem[],
  parentId: UniqueIdentifier,
  newItem: FolderOrFileItem
): FolderOrFileItem[] => {
  return items.map((item: FolderOrFileItem) => {
    if (item.id === parentId && item.type === "folder") {
      return {
        ...item,
        children: [...item.children, newItem],
      };
    }
    if (item.type === "folder") {
      return {
        ...item,
        children: updateItemsRecursively(item.children, parentId, newItem),
      };
    }
    return item;
  });
};

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      items: [],
      effectsFolderContents: [],
      generatorsFolderContents: [],
      addItem: (item) => set((state) => ({ items: [...state.items, item] })),
      addItemToFolder: addItemToFolder(set),
      getFolderContents: getFolderContents(get),
      addNestedItem: addNestedItem(set),
      setFolderContents: setFolderContents(set),
      getItemIndex: getItemIndex(get),
      moveItems: moveItems(get, set),
    }),
    {
      name: "folder-storage",
    }
  )
);

type SetStateFunction = (
  partial:
    | StoreState
    | Partial<StoreState>
    | ((state: StoreState) => StoreState | Partial<StoreState>),
  replace?: boolean
) => void;

function moveItems(get: () => StoreState, set: SetStateFunction) {
  return (
    oldIndex: number,
    newIndex: number,
    type: "effects" | "generators",
    containerId: string
  ) => {
    const state = get();
    if (type === "effects") {
      const folderContents = [...state.effectsFolderContents];
      const folder = folderContents.find((list) => list.id === containerId);
      if (folder) {
        const newItems = arrayMove(folder.items, oldIndex, newIndex);
        folder.items = newItems;
        set({ effectsFolderContents: folderContents });
      }
    } else if (type === "generators") {
      const folderContents = [...state.generatorsFolderContents];
      const folder = folderContents.find((list) => list.id === containerId);
      if (folder) {
        const newItems = arrayMove(folder.items, oldIndex, newIndex);
        folder.items = newItems;
        set({ generatorsFolderContents: folderContents });
      }
    }
  };
}

function getItemIndex(get: () => StoreState) {
  return (
    itemId: UniqueIdentifier,
    type: "effects" | "generators",
    containerId: string
  ): number => {
    const state = get();
    if (type === "effects") {
      const item = state.effectsFolderContents.find(
        (list) => list.id === containerId
      );
      return item ? item.items.findIndex((item) => item.id === itemId) : -1;
    } else if (type === "generators") {
      const item = state.generatorsFolderContents.find(
        (list) => list.id === containerId
      );
      return item ? item.items.findIndex((item) => item.id === itemId) : -1;
    }
    return -1;
  };
}

function setFolderContents(set: SetStateFunction) {
  return (
    folderId: UniqueIdentifier,
    items: FolderOrFileItem[],
    type: "effects" | "generators"
  ) => {
    if (type === "effects") {
      set((state) => {
        const existingIndex = state.effectsFolderContents.findIndex(
          (list) => list.id === folderId
        );

        if (existingIndex >= 0) {
          // Update existing folder contents
          return {
            effectsFolderContents: state.effectsFolderContents.map(
              (list, index) =>
                index === existingIndex ? { id: folderId, items } : list
            ),
          };
        } else {
          // Add new folder contents
          return {
            effectsFolderContents: [
              ...state.effectsFolderContents,
              { id: folderId, items },
            ],
          };
        }
      });
    } else if (type === "generators") {
      set((state) => {
        const existingIndex = state.generatorsFolderContents.findIndex(
          (list) => list.id === folderId
        );

        if (existingIndex >= 0) {
          // Update existing folder contents
          return {
            generatorsFolderContents: state.generatorsFolderContents.map(
              (list, index) =>
                index === existingIndex ? { id: folderId, items } : list
            ),
          };
        } else {
          // Add new folder contents
          return {
            generatorsFolderContents: [
              ...state.generatorsFolderContents,
              { id: folderId, items },
            ],
          };
        }
      });
    }
  };
}

function addNestedItem(set: SetStateFunction) {
  return (
    parentId: UniqueIdentifier,
    newItem: FolderOrFileItem,
    type: "effects" | "generators"
  ) => {
    if (type === "effects") {
      set((state) => ({
        items: updateItemsRecursively(state.items, parentId, newItem),
        effectsFolderContents: state.effectsFolderContents.map((list) => ({
          ...list,
          items: updateItemsRecursively(list.items, parentId, newItem),
        })),
      }));
    } else if (type === "generators") {
      set((state) => ({
        items: updateItemsRecursively(state.items, parentId, newItem),
        generatorsFolderContents: state.generatorsFolderContents.map(
          (list) => ({
            ...list,
            items: updateItemsRecursively(list.items, parentId, newItem),
          })
        ),
      }));
    }
  };
}

function getFolderContents(get: () => StoreState) {
  return (folderId: UniqueIdentifier, type: "effects" | "generators") => {
    const state = get();
    if (type === "effects") {
      const folderList = state.effectsFolderContents.find(
        (list) => list.id === folderId
      );
      return folderList?.items || [];
    } else if (type === "generators") {
      const folderList = state.generatorsFolderContents.find(
        (list) => list.id === folderId
      );
      return folderList?.items || [];
    }
    return [];
  };
}

function addItemToFolder(set: SetStateFunction) {
  return (
    folderId: UniqueIdentifier,
    item: FolderOrFileItem,
    type: "effects" | "generators"
  ) => {
    if (type === "effects") {
      set((state) => ({
        effectsFolderContents: state.effectsFolderContents.map((list) =>
          list.id === folderId
            ? { ...list, items: [...list.items, item] }
            : list
        ),
      }));
    } else if (type === "generators") {
      set((state) => ({
        generatorsFolderContents: state.generatorsFolderContents.map((list) =>
          list.id === folderId
            ? { ...list, items: [...list.items, item] }
            : list
        ),
      }));
    }
  };
}
