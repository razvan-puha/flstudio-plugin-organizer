import {
  Fragment,
  memo,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import invariant from "tiny-invariant";

import DropdownMenu, {
  DropdownItem,
  DropdownItemGroup,
  CustomTriggerProps,
} from "@atlaskit/dropdown-menu";
import FocusRing from "@atlaskit/focus-ring";
import ChevronDownIcon from "@atlaskit/icon/glyph/chevron-down";
import ChevronRightIcon from "@atlaskit/icon/glyph/chevron-right";
import { ModalTransition } from "@atlaskit/modal-dialog";
import mergeRefs from "@atlaskit/ds-lib/merge-refs";
import {
  Instruction,
  ItemMode,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item";
import {
  draggable,
  dropTargetForElements,
  monitorForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import type { DragLocationHistory } from "@atlaskit/pragmatic-drag-and-drop/types";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import { pointerOutsideOfPreview } from "@atlaskit/pragmatic-drag-and-drop/element/pointer-outside-of-preview";
import { setCustomNativeDragPreview } from "@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview";
import { token } from "@atlaskit/tokens";

import { TreeItem as TreeItemType } from "../../data/tree";

import { INDENT_PER_LEVEL } from "../../data/constants";
import { DependencyContext, TreeContext } from "./tree-context";
import { MoveDialog } from "./move-dialog";
import * as ReactDOM from 'react-dom/client';
import { Button } from "../ui/button";

const iconColor = token("color.icon", "#ffffff");

function ChildIcon() {
  return (
    <svg aria-hidden="true" width={24} height={24} viewBox="0 0 24 24">
      <circle cx={12} cy={12} r={2} fill={iconColor} />
    </svg>
  );
}

function GroupIcon({ isOpen }: Readonly<{ isOpen: boolean }>) {
  const Icon = isOpen ? ChevronDownIcon : ChevronRightIcon;
  return <Icon label="" primaryColor={iconColor} />;
}

function Icon({ item }: Readonly<{ item: TreeItemType }>) {
  if (!item.children.length) {
    return <ChildIcon />;
  }
  return <GroupIcon isOpen={item.isOpen ?? false} />;
}

function Preview({ item }: Readonly<{ item: TreeItemType }>) {
  return <div className="bg-surface-raised p-2 rounded">Item {item.id}</div>;
}

function getParentLevelOfInstruction(instruction: Instruction): number {
  if (instruction.type === "instruction-blocked") {
    return getParentLevelOfInstruction(instruction.desired);
  }
  if (instruction.type === "reparent") {
    return instruction.desiredLevel - 1;
  }
  return instruction.currentLevel - 1;
}

function delay({
  waitMs: timeMs,
  fn,
}: {
  waitMs: number;
  fn: () => void;
}): () => void {
  let timeoutId: number | null = window.setTimeout(() => {
    timeoutId = null;
    fn();
  }, timeMs);
  return function cancel() {
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      timeoutId = null;
    }
  };
}

const getStateClasses = (state: "idle" | "dragging" | "preview" | "parent-of-instruction") => {
  if (state === "dragging") return "bg-orange-500/90 opacity-40";
  if (state === "parent-of-instruction") return "bg-selected-hover";
  return "";
};

const getMarginClass = (level: number) => {
  switch (level) {
    case 0: return 'ml-0';
    case 1: return 'ml-6';
    case 2: return 'ml-12';
    case 3: return 'ml-18';
    case 4: return 'ml-24';
    case 5: return 'ml-30';
    default: return `ml-${Math.min(level * 6, 36)}`; // cap at ml-36 for deep nesting
  }
};

const TreeItem = memo(function TreeItem({
  item,
  mode,
  level,
}: {
  item: TreeItemType;
  mode: ItemMode;
  level: number;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const [state, setState] = useState<
    "idle" | "dragging" | "preview" | "parent-of-instruction"
  >("idle");
  const [instruction, setInstruction] = useState<Instruction | null>(null);
  const cancelExpandRef = useRef<(() => void) | null>(null);

  const { dispatch, uniqueContextId, getPathToItem, registerTreeItem } =
    useContext(TreeContext);
  const { DropIndicator, attachInstruction, extractInstruction } =
    useContext(DependencyContext);
  const toggleOpen = useCallback(() => {
    dispatch({ type: "toggle", itemId: item.id });
  }, [dispatch, item]);

  const actionMenuTriggerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    invariant(buttonRef.current);
    invariant(actionMenuTriggerRef.current);
    return registerTreeItem({
      itemId: item.id,
      element: buttonRef.current,
      actionMenuTrigger: actionMenuTriggerRef.current,
    });
  }, [item.id, registerTreeItem]);

  const cancelExpand = useCallback(() => {
    cancelExpandRef.current?.();
    cancelExpandRef.current = null;
  }, []);

  const clearParentOfInstructionState = useCallback(() => {
    setState((current) =>
      current === "parent-of-instruction" ? "idle" : current
    );
  }, []);

  // When an item has an instruction applied
  // we are highlighting it's parent item for improved clarity
  const shouldHighlightParent = useCallback(
    (location: DragLocationHistory): boolean => {
      const target = location.current.dropTargets[0];

      if (!target) {
        return false;
      }

      const instruction = extractInstruction(target.data);

      if (!instruction) {
        return false;
      }

      const targetId = target.data.id;
      invariant(typeof targetId === "string");

      const path = getPathToItem(targetId);
      const parentLevel: number = getParentLevelOfInstruction(instruction);
      const parentId = path[parentLevel];
      return parentId === item.id;
    },
    [getPathToItem, extractInstruction, item]
  );

  const renderTrigger = ({ triggerRef }: CustomTriggerProps<HTMLButtonElement>) => (
    <Button
      ref={mergeRefs([triggerRef, actionMenuTriggerRef])}
      className="absolute top-0 right-0 hidden"
    />
  );

  useEffect(() => {
    invariant(buttonRef.current);

    function updateIsParentOfInstruction({
      location,
    }: {
      location: DragLocationHistory;
    }) {
      if (shouldHighlightParent(location)) {
        setState("parent-of-instruction");
        return;
      }
      clearParentOfInstructionState();
    }

    return combine(
      draggable({
        element: buttonRef.current,
        getInitialData: () => ({
          id: item.id,
          type: "tree-item",
          isOpenOnDragStart: item.isOpen,
          uniqueContextId,
        }),
        onGenerateDragPreview: generateDragPreview(item),
        onDragStart: ({ source }) => {
          setState("dragging");
          // collapse open items during a drag
          if (source.data.isOpenOnDragStart) {
            dispatch({ type: "collapse", itemId: item.id });
          }
        },
        onDrop: ({ source }) => {
          setState("idle");
          if (source.data.isOpenOnDragStart) {
            dispatch({ type: "expand", itemId: item.id });
          }
        },
      }),
      dropTargetForElements({
        element: buttonRef.current,
        getData: ({ input, element }) => {
          const data = { id: item.id };

          return attachInstruction(data, {
            input,
            element,
            indentPerLevel: INDENT_PER_LEVEL,
            currentLevel: level,
            mode,
            block: item.isDraft ? ["make-child"] : [],
          });
        },
        canDrop: ({ source }) =>
          source.data.type === "tree-item" &&
          source.data.uniqueContextId === uniqueContextId,
        getIsSticky: () => true,
        onDrag: ({ self, source }) => {
          const instruction = extractInstruction(self.data);

          if (source.data.id !== item.id) {
            // expand after 500ms if still merging
            if (
              instruction?.type === "make-child" &&
              item.children.length &&
              !item.isOpen &&
              !cancelExpandRef.current
            ) {
              cancelExpandRef.current = delay({
                waitMs: 500,
                fn: () => dispatch({ type: "expand", itemId: item.id }),
              });
            }
            if (instruction?.type !== "make-child" && cancelExpandRef.current) {
              cancelExpand();
            }

            setInstruction(instruction);
            return;
          }
          if (instruction?.type === "reparent") {
            setInstruction(instruction);
            return;
          }
          setInstruction(null);
        },
        onDragLeave: () => {
          cancelExpand();
          setInstruction(null);
        },
        onDrop: () => {
          cancelExpand();
          setInstruction(null);
        },
      }),
      monitorForElements({
        canMonitor: ({ source }) =>
          source.data.uniqueContextId === uniqueContextId,
        onDragStart: updateIsParentOfInstruction,
        onDrag: updateIsParentOfInstruction,
        onDrop() {
          clearParentOfInstructionState();
        },
      })
    );
  }, [
    dispatch,
    item,
    mode,
    level,
    cancelExpand,
    uniqueContextId,
    extractInstruction,
    attachInstruction,
    getPathToItem,
    clearParentOfInstructionState,
    shouldHighlightParent,
  ]);

  useEffect(
    function mount() {
      return function unmount() {
        cancelExpand();
      };
    },
    [cancelExpand]
  );

  const aria = (() => {
    if (!item.children.length) {
      return undefined;
    }
    return {
      "aria-expanded": item.isOpen,
      "aria-controls": `tree-item-${item.id}--subtree`,
    };
  })();

  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const openMoveDialog = useCallback(() => {
    setIsMoveDialogOpen(true);
  }, []);
  const closeMoveDialog = useCallback(() => {
    setIsMoveDialogOpen(false);
  }, []);

  return (
    <Fragment>
      <div className="relative border-b border-white/20">
        <FocusRing isInset>
          <Button
            {...aria}
            className="w-full relative border-0 m-0 p-0 rounded cursor-pointer bg-transparent hover:bg-orange-500/90 flex items-start justify-start"
            id={`tree-item-${String(uniqueContextId)}-${item.id}`}
            onClick={toggleOpen}
            ref={buttonRef}
            type="button"
          >
            <div 
              className={`flex items-center gap-2 p-2 ${getMarginClass(level)} ${getStateClasses(state)}`}
            >
              <Icon item={item} />
              <span className="text-white">
                Item {item.id}
              </span>
            </div>
            {instruction && <DropIndicator instruction={instruction} />}
          </Button>
        </FocusRing>

        <div className="absolute top-0 right-0 hidden">
          <DropdownMenu trigger={renderTrigger}>
            <DropdownItemGroup>
              <DropdownItem onClick={openMoveDialog}>Move</DropdownItem>
            </DropdownItemGroup>
          </DropdownMenu>
        </div>
      </div>

      {Boolean(item.children.length) && item.isOpen && (
        <div id={aria?.["aria-controls"]}>
          {item.children.map((child, index, array) => {
            const childType: ItemMode = (() => {
              if (child.children.length && child.isOpen) return 'expanded'
              if (index === array.length - 1) return 'last-in-group'
              return 'standard'
            })()
            
            return (
              <TreeItem
                item={child}
                key={child.id}
                level={level + 1}
                mode={childType}
              />
            )
          })}
        </div>
      )}

      <ModalTransition>
        {isMoveDialogOpen && (
          <MoveDialog onClose={closeMoveDialog} itemId={item.id} />
        )}
      </ModalTransition>
    </Fragment>
  );
});

export default TreeItem;
function generateDragPreview(item: TreeItemType) {
  return ({ nativeSetDragImage }: { nativeSetDragImage: DataTransfer['setDragImage'] | null }) => {
        setCustomNativeDragPreview({
            getOffset: pointerOutsideOfPreview({ x: "16px", y: "8px" }),
            render: ({ container }) => {
                const root = ReactDOM.createRoot(container);
                root.render(<Preview item={item} />);
                return () => root.unmount();
            },
            nativeSetDragImage,
        });
    };
}

