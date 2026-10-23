import { useFabrioTranslation } from "./i18n.js";
import { useLayoutEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { useEditor } from "@react-fabrio/react";
import type { SelectionBounds } from "@react-fabrio/react";
import { ContextAction } from "./context-action.js";

export const ContextToolbar = ({
  bounds,
  workspace,
  host,
  busy,
  onEdit,
  onCrop,
}: {
  bounds: SelectionBounds;
  workspace: RefObject<HTMLDivElement | null>;
  host: RefObject<HTMLDivElement | null>;
  busy: boolean;
  onEdit: () => void;
  onCrop: () => void;
}) => {
  const { t } = useFabrioTranslation();
  const { selected, editor, area } = useEditor();
  const toolbar = useRef<HTMLDivElement>(null);
  const [rotationOpen, setRotationOpen] = useState(false);
  const [position, setPosition] = useState({ left: 8, top: 8 });
  useLayoutEffect(() => {
    const container = workspace.current;
    const canvas = host.current;
    const bar = toolbar.current;
    if (!container || !canvas || !bar) return;
    const place = () => {
      const frame = container.getBoundingClientRect();
      const surface = canvas.getBoundingClientRect();
      const clamp = (value: number, max: number) => Math.max(8, Math.min(max - 8, value));
      const above = surface.top - frame.top + bounds.y - bar.offsetHeight - 60;
      const below = surface.top - frame.top + bounds.y + bounds.height + 20;
      setPosition({
        left: clamp(
          surface.left - frame.left + bounds.x + bounds.width / 2 - bar.offsetWidth / 2,
          frame.width - bar.offsetWidth,
        ),
        top: clamp(
          below + bar.offsetHeight <= frame.height - 8 || above < 8 ? below : above,
          frame.height - bar.offsetHeight,
        ),
      });
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(container);
    observer.observe(bar);
    container.addEventListener("scroll", place, true);
    return () => {
      observer.disconnect();
      container.removeEventListener("scroll", place, true);
    };
  }, [bounds, workspace, host, rotationOpen]);
  if (!selected) return null;
  const canEdit = !busy && !selected.locked && selected.permissions?.edit !== false;
  return (
    <div
      ref={toolbar}
      className="rf-context-toolbar"
      data-rotation-open={rotationOpen}
      role="toolbar"
      aria-label={t("panel")}
      style={position}
    >
      <ContextAction
        icon={selected.type === "text" ? "text" : selected.type === "image" ? "images" : "artwork"}
        label={t("editAction")}
        description={t("editHint")}
        disabled={busy}
        onPress={onEdit}
      />
      {selected.type === "image" && (
        <ContextAction
          icon="crop"
          label={t("crop")}
          description={t("cropHint")}
          disabled={!canEdit}
          onPress={onCrop}
        />
      )}
      {selected.type === "image" ? (
        <ContextAction
          icon="flip"
          label={t("flipX")}
          description={t("flipHint")}
          disabled={!canEdit}
          onPress={() => editor.update({ kind: "image", changes: { flipX: !selected.flipX } })}
        />
      ) : (
        <label className="rf-context-color">
          <span>{t("color")}</span>
          {area.colors?.length ? (
            <select
              aria-label={t("color")}
              value={selected.color}
              disabled={!canEdit}
              onChange={(event) =>
                editor.update({
                  kind: selected.type === "text" ? "text" : "vector",
                  changes: { color: event.currentTarget.value },
                })
              }
            >
              {area.colors.map((color) => (
                <option key={color}>{color}</option>
              ))}
            </select>
          ) : (
            <input
              aria-label={t("color")}
              type="color"
              value={selected.color}
              disabled={!canEdit}
              onChange={(event) =>
                editor.update({
                  kind: selected.type === "text" ? "text" : "vector",
                  changes: { color: event.currentTarget.value },
                })
              }
            />
          )}
        </label>
      )}
      <ContextAction
        icon="rotate"
        label={t("rotateAction")}
        description={t("rotateHint")}
        disabled={busy || selected.locked || selected.permissions?.rotate === false}
        onPress={() => setRotationOpen(!rotationOpen)}
      />
      <ContextAction
        icon="duplicate"
        label={t("duplicate")}
        description={t("duplicateHint")}
        disabled={busy || selected.locked || area.mode === "guided"}
        onPress={() => editor.duplicate()}
      />
      <ContextAction
        icon="remove"
        label={t("remove")}
        description={t("removeHint")}
        disabled={
          busy ||
          selected.locked ||
          selected.permissions?.delete === false ||
          area.mode === "guided"
        }
        onPress={() => editor.remove()}
      />
      {rotationOpen && (
        <label className="rf-rotation-field">
          {t("rotate")}
          <input
            className="rf-input"
            aria-label={t("rotate")}
            type="number"
            step="1"
            value={Number(selected.rotation.toFixed(1))}
            disabled={busy || selected.locked || selected.permissions?.rotate === false}
            onChange={(event) => {
              const value = event.currentTarget.valueAsNumber;
              if (Number.isFinite(value))
                editor.update({ kind: "geometry", changes: { rotation: value } });
            }}
          />
        </label>
      )}
    </div>
  );
};
