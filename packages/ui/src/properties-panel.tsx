import { useFabrioTranslation } from "./i18n.js";
import { useState } from "react";
import { Button, Tooltip, TooltipTrigger } from "react-aria-components";
import { EditorIcon } from "./editor-shell.js";
import { useEditor } from "@react-fabrio/react";
import { Measurements } from "./measurements.js";
import { PositionControls } from "./position-controls.js";
import type { TextPatch } from "@react-fabrio/core";

/**
 * Renders editable text, color, geometry and positioning properties for the current selection.
 *
 * @param props - Optional panel filter and disabled state.
 *
 * @remarks
 * Requires `FabrioI18nProvider`, `EditorProvider` and the UI stylesheet.
 */
export const PropertiesPanel = ({ panel, disabled }: { panel?: string; disabled?: boolean }) => {
  const busy = disabled ?? false;
  const { t } = useFabrioTranslation();
  const { editor, area, product, selected } = useEditor();
  const [alignmentGroup, setAlignmentGroup] = useState<HTMLFieldSetElement | null>(null);
  const fontOptions = area.fonts ?? product.fonts ?? [];
  const can = (operation: "move" | "resize" | "rotate" | "edit" | "delete" | "reorder") =>
    !!selected && !selected.locked && selected.permissions?.[operation] !== false;
  const update = (changes: TextPatch) => editor.update({ kind: "text", changes });
  const numeric = (
    label: string,
    property: "fontSize" | "lineHeight" | "letterSpacing",
    value: number,
    operation: Parameters<typeof can>[0],
    step = 1,
  ) => (
    <label className="rf-field">
      {label}
      <input
        className="rf-input"
        type="number"
        step={step}
        value={Number(value.toFixed(3))}
        disabled={!can(operation) || busy}
        onChange={(event) => {
          const number = event.currentTarget.valueAsNumber;
          if (
            Number.isFinite(number) &&
            (!["width", "height", "fontSize", "lineHeight"].includes(property) || number > 0)
          )
            update({ [property]: number });
        }}
      />
    </label>
  );
  return (
    <>
      {selected?.type === "text" && (panel === undefined || panel === "text") && (
        <section className="rf-field">
          <h2>{t("text")}</h2>
          <label className="rf-field">
            {t("message")}
            <textarea
              className="rf-input"
              value={selected.text}
              onFocus={() => editor.beginAction()}
              onBlur={() => editor.endAction()}
              disabled={!can("edit") || busy}
              onChange={(event) => update({ text: event.currentTarget.value })}
            />
          </label>
          <fieldset ref={setAlignmentGroup} className="rf-text-alignment">
            <legend>{t("alignment")}</legend>
            <div>
              {(
                [
                  ["left", t("left")],
                  ["center", t("center")],
                  ["right", t("right")],
                  ["justify", t("justify")],
                ] as const
              ).map(([align, label]) => (
                <TooltipTrigger key={align} delay={450} closeDelay={0}>
                  <Button
                    className="rf-position-button"
                    aria-label={label}
                    aria-pressed={(selected.align ?? "left") === align}
                    isDisabled={!can("edit") || busy}
                    onPress={() => update({ align })}
                  >
                    <EditorIcon name={`text-${align}`} />
                  </Button>
                  <Tooltip
                    className="rf-tooltip"
                    placement="top"
                    offset={8}
                    UNSTABLE_portalContainer={alignmentGroup?.closest(".rf-editor") ?? undefined}
                  >
                    {label}
                  </Tooltip>
                </TooltipTrigger>
              ))}
            </div>
          </fieldset>
          <label className="rf-field">
            {t("font")}
            <select
              className="rf-input"
              value={selected.fontId}
              disabled={busy || !can("edit")}
              onChange={(event) => update({ fontId: event.currentTarget.value })}
            >
              {fontOptions.map((font) => (
                <option key={font.id} value={font.id}>
                  {font.family} {font.weight ?? 400}
                </option>
              ))}
            </select>
          </label>
          {numeric(t("size"), "fontSize", selected.fontSize, "edit", 0.5)}
        </section>
      )}
      {selected && (
        <details className="rf-advanced">
          <summary>{t("advanced")}</summary>
          <section className="rf-field">
            {selected.type === "text" && (
              <>
                {numeric(t("lineHeight"), "lineHeight", selected.lineHeight ?? 1.16, "edit", 0.1)}
                {numeric(
                  t("letterSpacing"),
                  "letterSpacing",
                  selected.letterSpacing ?? 0,
                  "edit",
                  0.1,
                )}
              </>
            )}
            {selected.type !== "image" && (
              <label className="rf-field">
                {t("color")}
                {area.colors?.length ? (
                  <select
                    className="rf-input"
                    value={selected.color}
                    disabled={busy || !can("edit")}
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
                    type="color"
                    value={selected.color}
                    disabled={busy || !can("edit")}
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
            <Measurements busy={busy} />
            <PositionControls disabled={busy} />
          </section>
        </details>
      )}
    </>
  );
};
