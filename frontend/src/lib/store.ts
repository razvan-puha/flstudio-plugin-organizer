import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { FolderItem, FileItem } from '@/types/folder';

interface StoreState {
  items: (FolderItem | FileItem)[];
  folderContents: Record<string, (FolderItem | FileItem)[]>;
  addItem: (item: FolderItem | FileItem) => void;
  addItemToFolder: (folderId: string, item: FolderItem | FileItem) => void;
  getFolderContents: (folderId: string) => (FolderItem | FileItem)[];
  addNestedItem: (parentId: string, item: FolderItem | FileItem) => void;
  setFolderContents: (folderId: string, items: (FolderItem | FileItem)[]) => void;
}

const updateItemsRecursively = (
  items: (FolderItem | FileItem)[],
  parentId: string,
  newItem: FolderItem | FileItem
): (FolderItem | FileItem)[] => {
  return items.map((item: FolderItem | FileItem) => {
    if (item.id === parentId && item.type === 'folder') {
      return {
        ...item,
        children: [...item.children, newItem],
      };
    }
    if (item.type === 'folder') {
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
      folderContents: {},
      addItem: (item) => set((state) => ({ items: [...state.items, item] })),
      addItemToFolder: (folderId, item) =>
        set((state) => ({
          folderContents: {
            ...state.folderContents,
            [folderId]: [...(state.folderContents[folderId] || []), item],
          },
        })),
      getFolderContents: (folderId) => {
        const state = get();
        return state.folderContents[folderId] || [];
      },
      addNestedItem: (parentId, newItem) => {
        set((state) => {
          const updatedFolderContents = Object.fromEntries(
            Object.entries(state.folderContents).map(([key, items]) => [
              key,
              updateItemsRecursively(items, parentId, newItem),
            ])
          );

          return {
            items: updateItemsRecursively(state.items, parentId, newItem),
            folderContents: updatedFolderContents,
          };
        });
      },
      setFolderContents: (folderId: string, items: (FolderItem | FileItem)[]) =>
        set((state) => ({
          folderContents: {
            ...state.folderContents,
            [folderId]: items,
          },
        })),
    }),
    {
      name: 'folder-storage',
    }
  )
);