import { useFabrioTranslation } from "./i18n.js";
import { useEditor } from "@react-fabrio/react";

export const Measurements = ({ busy }: { busy: boolean }) => {
  const { t } = useFabrioTranslation();
  const { editor, selected } = useEditor();
  if (!selected) return null;
  const field = (
    property: "x" | "y" | "width" | "height" | "rotation",
    label: string,
    accessibleLabel: string,
    inline = false,
  ) => {
    const operation =
      property === "rotation"
        ? "rotate"
        : property === "width" || property === "height"
          ? "resize"
          : "move";
    const disabled = busy || !!selected.locked || selected.permissions?.[operation] === false;
    return (
      <label className={`rf-measurement-field ${inline ? "rf-measurement-inline" : ""}`}>
        <span className="rf-measurement-label" aria-hidden="true">
          {label}
        </span>
        <span className="rf-measurement-input" data-disabled={disabled || undefined}>
          {inline && (
            <span className="rf-measurement-prefix" aria-hidden="true">
              {label}
            </span>
          )}
          <input
            aria-label={accessibleLabel}
            type="number"
            inputMode="decimal"
            step={property === "rotation" ? 1 : 0.1}
            value={Number(selected[property].toFixed(3))}
            disabled={disabled}
            onChange={(event) => {
              const value = event.currentTarget.valueAsNumber;
              if (
                Number.isFinite(value) &&
                (!(property === "width" || property === "height") || value > 0)
              )
                editor.update({ kind: "geometry", changes: { [property]: value } });
            }}
          />
          <span className="rf-measurement-unit" aria-hidden="true">
            {property === "rotation" ? "°" : "mm"}
          </span>
        </span>
      </label>
    );
  };
  return (
    <div className="rf-measurements">
      <fieldset className="rf-measurement-group">
        <legend>{t("geometryPosition")}</legend>
        <div className="rf-measurement-pair">
          {field("x", "X", t("x"), true)}
          {field("y", "Y", t("y"), true)}
        </div>
      </fieldset>
      <fieldset className="rf-measurement-group">
        <legend>{t("geometrySize")}</legend>
        <div className="rf-measurement-pair">
          {field("width", t("geometryWidth"), t("width"))}
          {field("height", t("geometryHeight"), t("height"))}
        </div>
      </fieldset>
      <div className="rf-measurement-rotation">
        {field("rotation", t("geometryRotation"), t("rotate"))}
      </div>
    </div>
  );
};
