import { useFabrioTranslation } from "./i18n.js";
import { useState } from "react";
import { Button, Tooltip, TooltipTrigger } from "react-aria-components";
import { canReorderElement } from "@react-fabrio/core";
import { useEditor } from "@react-fabrio/react";
import { EditorIcon } from "./editor-shell.js";

const PositionAction = ({
  icon,
  label,
  caption,
  disabled,
  onPress,
}: {
  icon: string;
  label: string;
  caption?: string;
  disabled: boolean;
  onPress: () => void;
}) => {
  const [container, setContainer] = useState<HTMLSpanElement | null>(null);
  return (
    <span ref={setContainer} className="rf-position-action">
      <TooltipTrigger delay={450} closeDelay={0}>
        <Button
          className="rf-position-button"
          aria-label={label}
          isDisabled={disabled}
          onPress={onPress}
        >
          <EditorIcon name={icon} />
          {caption && <span>{caption}</span>}
        </Button>
        <Tooltip
          className="rf-tooltip"
          placement="top"
          offset={8}
          UNSTABLE_portalContainer={container?.closest(".rf-editor") ?? undefined}
        >
          {label}
        </Tooltip>
      </TooltipTrigger>
    </span>
  );
};

/**
 * Renders movement, area-alignment and stacking controls for the selected element.
 *
 * @param props - Optional disabled state and supported panel callbacks.
 *
 * @remarks
 * Requires `FabrioI18nProvider`, `EditorProvider` and the UI stylesheet.
 */
export const PositionControls = ({ disabled }: { disabled?: boolean }) => {
  const busy = disabled ?? false;
  const { t } = useFabrioTranslation();
  const { editor, selected, layers, area } = useEditor();
  const [announcement, setAnnouncement] = useState<{ position: number; total: number } | null>(
    null,
  );
  if (!selected) return null;
  const canMove = !busy && !selected.locked && selected.permissions?.move !== false;
  const reorder = (delta: number) => {
    const index = layers.indexOf(selected) + delta;
    if (editor.moveElement(selected.id, index).status === "changed")
      setAnnouncement({ position: layers.length - index, total: layers.length });
  };
  return (
    <div className="rf-position-controls">
      <fieldset className="rf-position-group">
        <legend>
          {t("positionMove")} <span className="rf-position-hint">{t("positionStep")}</span>
        </legend>
        <div className="rf-position-pad">
          {(
            [
              ["move-up", t("moveUp"), 0, -1],
              ["move-left", t("moveLeft"), -1, 0],
              ["move-right", t("moveRight"), 1, 0],
              ["move-down", t("moveDown"), 0, 1],
            ] as const
          ).map(([icon, label, x, y]) => (
            <PositionAction
              key={icon}
              icon={icon}
              label={label}
              disabled={!canMove}
              onPress={() =>
                editor.update({
                  kind: "geometry",
                  changes: { x: selected.x + x, y: selected.y + y },
                })
              }
            />
          ))}
        </div>
      </fieldset>
      <fieldset className="rf-position-group">
        <legend>{t("positionAlign")}</legend>
        <div className="rf-position-align">
          {(
            [
              ["align-left", t("alignLeft"), "x", 0],
              ["align-center", t("alignCenter"), "x", (area.width - selected.width) / 2],
              ["align-right", t("alignRight"), "x", area.width - selected.width],
              ["align-top", t("alignTop"), "y", 0],
              ["align-middle", t("alignMiddle"), "y", (area.height - selected.height) / 2],
              ["align-bottom", t("alignBottom"), "y", area.height - selected.height],
            ] as const
          ).map(([icon, label, property, value]) => (
            <PositionAction
              key={icon}
              icon={icon}
              label={label}
              disabled={!canMove}
              onPress={() => editor.update({ kind: "geometry", changes: { [property]: value } })}
            />
          ))}
        </div>
      </fieldset>
      <fieldset className="rf-position-group">
        <legend>{t("positionLayers")}</legend>
        <div className="rf-position-order">
          <PositionAction
            icon="layer-up"
            label={t("forward")}
            caption={t("layerHigher")}
            disabled={busy || !canReorderElement(layers, selected.id, layers.indexOf(selected) + 1)}
            onPress={() => reorder(1)}
          />
          <PositionAction
            icon="layer-down"
            label={t("backward")}
            caption={t("layerLower")}
            disabled={busy || !canReorderElement(layers, selected.id, layers.indexOf(selected) - 1)}
            onPress={() => reorder(-1)}
          />
        </div>
      </fieldset>
      <span className="rf-sr-only" aria-live="polite" aria-atomic="true">
        {announcement && t("layerPositionAnnouncement", announcement)}
      </span>
    </div>
  );
};
