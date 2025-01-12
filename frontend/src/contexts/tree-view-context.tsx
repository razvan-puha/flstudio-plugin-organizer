import { createContext, useContext, useCallback, useReducer, useMemo } from 'react';
import { TreeViewContextType, TreeViewCallbacks, TreeItem } from '@/types/types';

type ContainerState = {
  callbacks: Record<string, TreeViewCallbacks>;
  items: Record<string, TreeItem[]>;
};

type Action = 
  | { type: 'REGISTER_CONTAINER'; id: string; callbacks: TreeViewCallbacks; items: TreeItem[] }
  | { type: 'UNREGISTER_CONTAINER'; id: string }
  | { type: 'UPDATE_ITEMS'; containerId: string; items: TreeItem[] }
  | { type: 'NOTIFY_ITEM_REMOVED'; sourceContainerId: string; item: TreeItem };

function containerReducer(state: ContainerState, action: Action): ContainerState {
  switch (action.type) {
    case 'REGISTER_CONTAINER':
      return {
        callbacks: { ...state.callbacks, [action.id]: action.callbacks },
        items: { ...state.items, [action.id]: action.items }
      };
    
    case 'UNREGISTER_CONTAINER': {
        const remainingCallbacks = { ...state.callbacks };
        const remainingItems = { ...state.items };
        delete remainingCallbacks[action.id];
        delete remainingItems[action.id];
        return {
          callbacks: remainingCallbacks,
          items: remainingItems
        };
    }

    case 'UPDATE_ITEMS':
      return {
        ...state,
        items: {
          ...state.items,
          [action.containerId]: action.items
        }
      };

    case 'NOTIFY_ITEM_REMOVED': {
      const newState = { ...state };
      Object.entries(newState.callbacks).forEach(([containerId, callbacks]) => {
        if (containerId !== action.sourceContainerId && 
            state.items[containerId]?.[0]?.containerType === action.item.containerType) {
          callbacks.addItem(action.item);
        }
      });
      return newState;
    }

    default:
      return state;
  }
}

const TreeViewContext = createContext<TreeViewContextType | null>(null);

export function TreeViewProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [state, dispatch] = useReducer(containerReducer, { callbacks: {}, items: {} });

  const registerContainer = useCallback((id: string, callbacks: TreeViewCallbacks, items: TreeItem[]) => {
    dispatch({ type: 'REGISTER_CONTAINER', id, callbacks, items });
  }, []);

  const unregisterContainer = useCallback((id: string) => {
    dispatch({ type: 'UNREGISTER_CONTAINER', id });
  }, []);

  const updateItems = useCallback((containerId: string, items: TreeItem[]) => {
    dispatch({ type: 'UPDATE_ITEMS', containerId, items });
  }, []);

  const notifyItemRemoved = useCallback((sourceContainerId: string, item: TreeItem) => {
    dispatch({ type: 'NOTIFY_ITEM_REMOVED', sourceContainerId, item });
  }, []);

  const value = useMemo(() => ({
    registerContainer,
    unregisterContainer,
    updateItems,
    notifyItemRemoved,
    getItems: (containerId: string) => state.items[containerId] || [],
    callbacks: state.callbacks
  }), [registerContainer, unregisterContainer, updateItems, notifyItemRemoved, state.items, state.callbacks]);

  return (
    <TreeViewContext.Provider value={value}>
      {children}
    </TreeViewContext.Provider>
  );
}

export function useTreeViewContext() {
  const context = useContext(TreeViewContext);
  if (!context) {
    throw new Error('useTreeViewContext must be used within TreeViewProvider');
  }
  return context;
} 