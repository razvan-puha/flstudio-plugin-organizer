import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";

import memoizeOne from "memoize-one";
import invariant from "tiny-invariant";

import { triggerPostMoveFlash } from "@atlaskit/pragmatic-drag-and-drop-flourish/trigger-post-move-flash";
import {
  Instruction,
  ItemMode,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item";
import * as liveRegion from "@atlaskit/pragmatic-drag-and-drop-live-region";
import { monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import type {
  BaseEventPayload,
  ElementDragType,
} from "@atlaskit/pragmatic-drag-and-drop/types";

import {
  getInitialTreeState,
  tree,
  TreeAction,
  TreeItem as TreeItemType,
  treeStateReducer,
} from "../../data/tree";
import {
  DependencyContext,
  TreeContext,
  TreeContextValue,
} from "./tree-context";
import TreeItem from "./tree-item";

type CleanupFn = () => void;

function createTreeItemRegistry() {
  const registry = new Map<
    string,
    { element: HTMLElement; actionMenuTrigger: HTMLElement }
  >();

  const registerTreeItem = ({
    itemId,
    element,
    actionMenuTrigger,
  }: {
    itemId: string;
    element: HTMLElement;
    actionMenuTrigger: HTMLElement;
  }): CleanupFn => {
    registry.set(itemId, { element, actionMenuTrigger });
    return () => {
      registry.delete(itemId);
    };
  };

  return { registry, registerTreeItem };
}

const handleDrop = (
  args: BaseEventPayload<ElementDragType>,
  context: TreeContextValue,
  extractInstruction: (data: Record<string | symbol, unknown>) => Instruction | null,
  updateState: React.Dispatch<TreeAction>
) => {
  const { location, source } = args;
  if (!location.current.dropTargets.length) return;

  if (source.data.type === "tree-item") {
    const itemId = source.data.id as string;
    const target = location.current.dropTargets[0];
    const targetId = target.data.id as string;
    const instruction: Instruction | null = extractInstruction(target.data);

    if (instruction !== null) {
      updateState({
        type: "instruction",
        instruction,
        itemId,
        targetId,
      });
    }
  }
};

const determineItemMode = (
  item: TreeItemType,
  index: number,
  array: TreeItemType[]
): ItemMode => {
  if (item.children.length && item.isOpen) return "expanded";
  if (index === array.length - 1) return "last-in-group";
  return "standard";
};

export default function Tree() {
  const [state, updateState] = useReducer(
    treeStateReducer,
    null,
    getInitialTreeState
  );
  const ref = useRef<HTMLDivElement>(null);
  const { extractInstruction } = useContext(DependencyContext);

  const [{ registry, registerTreeItem }] = useState(createTreeItemRegistry);

  const { data, lastAction } = state;
  const lastStateRef = useRef<TreeItemType[]>(data);
  useEffect(() => {
    lastStateRef.current = data;
  }, [data]);

  useEffect(() => {
    if (lastAction === null) {
      return;
    }

    if (lastAction.type === "modal-move") {
      const parentName =
        lastAction.targetId === "" ? "the root" : `Item ${lastAction.targetId}`;

      liveRegion.announce(
        `You've moved Item ${lastAction.itemId} to position ${
          lastAction.index + 1
        } in ${parentName}.`
      );

      const { element, actionMenuTrigger } =
        registry.get(lastAction.itemId) ?? {};
      if (element) {
        triggerPostMoveFlash(element);
      }

      /**
       * Only moves triggered by the modal will result in focus being
       * returned to the trigger.
       */
      actionMenuTrigger?.focus();

      return;
    }

    if (lastAction.type === "instruction") {
      const { element } = registry.get(lastAction.itemId) ?? {};
      if (element) {
        triggerPostMoveFlash(element);
      }
    }
  }, [lastAction, registry]);

  useEffect(() => {
    return () => {
      liveRegion.cleanup();
    };
  }, []);

  /**
   * Returns the items that the item with `itemId` can be moved to.
   *
   * Uses a depth-first search (DFS) to compile a list of possible targets.
   */
  const getMoveTargets = useCallback(({ itemId }: { itemId: string }) => {
    const data = lastStateRef.current;

    const targets = [];

    const searchStack = Array.from(data);
    while (searchStack.length > 0) {
      const node = searchStack.pop();

      if (!node) {
        continue;
      }

      /**
       * If the current node is the item we want to move, then it is not a valid
       * move target and neither are its children.
       */
      if (node.id === itemId) {
        continue;
      }

      /**
       * Draft items cannot have children.
       */
      if (node.isDraft) {
        continue;
      }

      targets.push(node);

      node.children.forEach((childNode) => searchStack.push(childNode));
    }

    return targets;
  }, []);

  const getChildrenOfItem = useCallback((itemId: string) => {
    const data = lastStateRef.current;

    /**
     * An empty string is representing the root
     */
    if (itemId === "") {
      return data;
    }

    const item = tree.find(data, itemId);
    invariant(item);
    return item.children;
  }, []);

  const context = useMemo<TreeContextValue>(
    () => ({
      dispatch: updateState,
      uniqueContextId: Symbol("unique-id"),
      // memoizing this function as it is called by all tree items repeatedly
      // An ideal refactor would be to update our data shape
      // to allow quick lookups of parents
      getPathToItem: memoizeOne(
        (targetId: string) =>
          tree.getPathToItem({ current: lastStateRef.current, targetId }) ?? []
      ),
      getMoveTargets,
      getChildrenOfItem,
      registerTreeItem,
    }),
    [getChildrenOfItem, getMoveTargets, registerTreeItem]
  );

  useEffect(() => {
    invariant(ref.current);
    return combine(
      monitorForElements({
        canMonitor: ({ source }) =>
          source.data.uniqueContextId === context.uniqueContextId,
        onDrop: (args) =>
          handleDrop(args, context, extractInstruction, updateState),
      })
    );
  }, [context, extractInstruction]);

  return (
    <TreeContext.Provider value={context}>
      <div className="flex justify-start border border-white">
        <div
          className="flex flex-col box-border w-[280px] min-h-[30vh] p-2"
          id="tree"
          ref={ref}
        >
          {data.map((item, index, array) => {
            return (
              <TreeItem
                item={item}
                level={0}
                key={item.id}
                mode={determineItemMode(item, index, array)}
              />
            );
          })}
        </div>
      </div>
    </TreeContext.Provider>
  );
}
