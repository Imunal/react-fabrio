import { useFabrioTranslation } from "./i18n.js";
import { useRef, useState } from "react";
import {
  Button,
  DropIndicator,
  GridList,
  GridListItem,
  useDragAndDrop,
} from "react-aria-components";
import type { DropTarget } from "react-aria-components";
import { canEditElement, canReorderElement } from "@react-fabrio/core";
import type { DesignElement } from "@react-fabrio/core";
import { useEditor } from "@react-fabrio/react";
import { useTouchReorder } from "./use-touch-reorder.js";
import { EditorIcon } from "./editor-shell.js";

/**
 * Renders selectable elements with accessible stacking controls and optional edit actions.
 *
 * @param props - Optional disabled state and supported panel callbacks.
 *
 * @remarks
 * Requires `FabrioI18nProvider`, `EditorProvider` and the UI stylesheet.
 */
export const ElementList = ({
  disabled,
  onEdit,
}: {
  disabled?: boolean;
  onEdit?: (element: DesignElement) => void;
}) => {
  const busy = disabled ?? false;
  const { t, locale } = useFabrioTranslation();
  const { editor, layers, selectedId, areaId } = useEditor();
  const list = useRef<HTMLDivElement>(null);
  const pointerScroll = useRef<number | null>(null);
  const fromHandle = useRef(false);
  const drag = useRef<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [announcement, setAnnouncement] = useState<{
    element: DesignElement;
    position: number;
    total: number;
  } | null>(null);
  const name = (element: DesignElement) =>
    element.type === "text"
      ? element.text || t("emptyText")
      : t(element.type === "image" ? "photoLabel" : "artworkLabel", { id: element.id.slice(0, 6) });
  const move = (id: string, index: number) => {
    if (busy || editor.getSnapshot().areaId !== areaId) return;
    if (editor.moveElement(id, index).status === "changed") {
      editor.select(id);
      requestAnimationFrame(() =>
        list.current?.querySelector<HTMLElement>(`[data-key="${CSS.escape(id)}"]`)?.focus(),
      );
      setAnnouncement({
        element: layers.find((e) => e.id === id)!,
        position: layers.length - index,
        total: layers.length,
      });
    }
  };
  const { touchId, touchDrop, ...touchEvents } = useTouchReorder(list, layers, busy, move);
  const targetIndex = (target: DropTarget, id: string) => {
    if (target.type !== "item" || target.dropPosition === "on") return -1;
    const from = layers.findIndex((e) => e.id === id);
    const to = layers.findIndex((e) => e.id === target.key);
    if (to < 0 || from < 0) return -1;
    // The display is reversed. Convert the insertion gap to a final document index.
    const gap = to + (target.dropPosition === "before" ? 1 : 0);
    return gap - (from < gap ? 1 : 0);
  };
  const { dragAndDropHooks } = useDragAndDrop<DesignElement>({
    isDisabled: busy,
    getItems(keys) {
      const id = String([...keys][0]);
      const element = layers.find((e) => e.id === id);
      if (keys.size !== 1 || !element || !canEditElement(element, "reorder")) return [];
      drag.current = id;
      return [{ "text/plain": name(element) }];
    },
    getAllowedDropOperations: () => ["move"],
    onDragStart() {
      pointerScroll.current = null;
      setDragging(true);
    },
    onDragEnd() {
      drag.current = null;
      setDragging(false);
    },
    getDropOperation(target) {
      const id = drag.current;
      return !busy && id && canReorderElement(layers, id, targetIndex(target, id))
        ? "move"
        : "cancel";
    },
    onReorder(event) {
      const id = String([...event.keys][0]);
      if (event.keys.size === 1 && id === drag.current) move(id, targetIndex(event.target, id));
    },
    renderDropIndicator: (target) => <DropIndicator target={target} className="rf-layer-drop" />,
  });
  return (
    // Delegated handlers manage the interactive GridList and its handles.
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <section
      className="rf-layers"
      aria-label={t("elements")}
      {...touchEvents}
      onPointerDownCapture={(event) => {
        pointerScroll.current = list.current?.scrollTop ?? null;
        fromHandle.current = !!(event.target as HTMLElement).closest(
          ".rf-layer-handle:not([disabled])",
        );
        touchEvents.onPointerDownCapture(event);
      }}
      onPointerUpCapture={() => {
        pointerScroll.current = null;
      }}
      onFocus={() => {
        // Keep a pointer target stationary when React Aria restores collection focus.
        if (pointerScroll.current !== null) list.current?.scrollTo(0, pointerScroll.current);
      }}
      onDragStartCapture={(event) => {
        if (!fromHandle.current || touchId) event.preventDefault();
      }}
    >
      <h3>
        {t("elements")} <span>{layers.length.toLocaleString(locale)}</span>
      </h3>
      <p className="rf-layer-hint">{t("layerHint")}</p>
      <GridList
        ref={list}
        aria-label={t("elements")}
        className="rf-layer-list"
        data-dragging={dragging || !!touchId || undefined}
        dependencies={[layers, selectedId, busy, touchId, touchDrop, t, locale, onEdit]}
        items={[...layers].reverse()}
        selectionMode="single"
        selectionBehavior="replace"
        selectedKeys={selectedId ? [selectedId] : []}
        onSelectionChange={(keys) => {
          if (keys !== "all") editor.select(keys.size ? String([...keys][0]) : null);
        }}
        dragAndDropHooks={dragAndDropHooks}
        renderEmptyState={() => t("empty")}
      >
        {(element) => {
          const index = layers.findIndex((e) => e.id === element.id);
          const protectedPosition = !canEditElement(element, "reorder");
          return (
            <GridListItem
              id={element.id}
              data-touch-dragging={touchId === element.id || undefined}
              data-touch-drop={touchDrop?.key === element.id ? touchDrop.position : undefined}
              textValue={name(element)}
              className="rf-layer-row"
            >
              <Button
                slot="drag"
                style={{ pointerEvents: "auto" }}
                className="rf-icon-button rf-layer-handle"
                aria-label={t("dragLayer")}
                isDisabled={busy || protectedPosition}
              >
                <EditorIcon name="drag" />
              </Button>
              <EditorIcon
                name={
                  element.type === "image"
                    ? "images"
                    : element.type === "vector"
                      ? "artwork"
                      : "text"
                }
              />
              <span className="rf-layer-name">
                {name(element)}
                {element.locked ? ` · ${t("locked")}` : ""}
              </span>
              <span className="rf-layer-selected" aria-hidden="true">
                {selectedId === element.id ? <EditorIcon name="check" /> : null}
              </span>
              <div className="rf-layer-actions">
                <Button
                  className="rf-button"
                  isDisabled={busy}
                  onClick={() => {
                    editor.select(element.id);
                    onEdit?.(element);
                  }}
                >
                  {t("editAction")}
                </Button>
                <Button
                  className="rf-icon-button"
                  aria-label={t("forward")}
                  isDisabled={busy || !canReorderElement(layers, element.id, index + 1)}
                  onPress={() => move(element.id, index + 1)}
                >
                  <EditorIcon name="up" />
                </Button>
                <Button
                  className="rf-icon-button"
                  aria-label={t("backward")}
                  isDisabled={busy || !canReorderElement(layers, element.id, index - 1)}
                  onPress={() => move(element.id, index - 1)}
                >
                  <EditorIcon name="down" />
                </Button>
              </div>
            </GridListItem>
          );
        }}
      </GridList>
      <span className="rf-sr-only" aria-live="polite" aria-atomic="true">
        {announcement &&
          t("layerMoved", {
            name: name(announcement.element),
            position: announcement.position,
            total: announcement.total,
          })}
      </span>
    </section>
  );
};
