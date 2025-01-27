"use client";

import { createContext, useContext, useCallback, useMemo, useState } from 'react';
import { TreeViewContextType, TreeViewCallbacks, TreeItem } from '@/types/types';


export const TreeViewContext = createContext<TreeViewContextType>({
    registerContainer: () => {},
    unregisterContainer: () => {},
    updateContainer: () => {},
    notifyItemRemoved: () => {},
    getItems: () => [],
    callbacks: {},
    refreshContainer: () => {},
    refreshTrigger: {},
    resetContainer: () => {},
});

export function TreeViewProvider({ children }: Readonly<{ children: React.ReactNode }>) {
    const [containers, setContainers] = useState<Record<string, TreeItem[]>>({});
    const [callbacks, setCallbacks] = useState<Record<string, TreeViewCallbacks>>({});
    const [refreshTrigger, setRefreshTrigger] = useState<Record<string, number>>({});

    const registerContainer = useCallback((id: string, callbacks: TreeViewCallbacks, items: TreeItem[]) => {
        setCallbacks(prev => ({ ...prev, [id]: callbacks }));
        setContainers(prev => ({ ...prev, [id]: items }));
    }, []);

    const unregisterContainer = useCallback((id: string) => {
        setCallbacks(prev => {
            const newCallbacks = { ...prev };
            delete newCallbacks[id];
            return newCallbacks;
        });
        setContainers(prev => {
            const newContainers = { ...prev };
            delete newContainers[id];
            return newContainers;
        });
    }, []);

    const notifyItemRemoved = useCallback((sourceContainerId: string, item: TreeItem) => {
        setContainers(prev => {
            const newContainers = { ...prev };
            Object.entries(newContainers).forEach(([containerId, items]) => {
                if (containerId !== sourceContainerId && 
                    items[0]?.containerType === item.containerType) {
                    const newItems = items.filter(i => i.id !== item.id);
                    newContainers[containerId] = newItems;
                }
            });
            return newContainers;
        });
    }, []);

    const updateContainer = useCallback((containerId: string, updater: (items: TreeItem[]) => TreeItem[]) => {
        setContainers(prev => ({
            ...prev,
            [containerId]: updater(prev[containerId] || [])
        }));
    }, []);

    const refreshContainer = useCallback((containerId: string) => {
        setRefreshTrigger(prev => ({
            ...prev,
            [containerId]: (prev[containerId] || 0) + 1
        }));
    }, []);

    const resetContainer = useCallback((containerId: string) => {
        setContainers(prev => ({
            ...prev,
            [containerId]: []
        }));
        setRefreshTrigger(prev => ({
            ...prev,
            [containerId]: (prev[containerId] || 0) + 1
        }));
    }, []);

    const getItems = useCallback((containerId: string) => containers[containerId] || [], [containers]);

    const value = useMemo(
        () => ({
            registerContainer,
            unregisterContainer,
            updateContainer,
            notifyItemRemoved,
            getItems,
            callbacks,
            refreshContainer,
            refreshTrigger,
            resetContainer,
        }),
        [
            registerContainer,
            unregisterContainer,
            updateContainer,
            notifyItemRemoved,
            getItems,
            callbacks,
            refreshContainer,
            refreshTrigger,
            resetContainer,
        ]
    );

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