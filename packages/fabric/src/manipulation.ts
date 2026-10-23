import { controlsUtils } from "fabric";
import type { Control, FabricObject } from "fabric";
import type { DesignElement } from "@react-fabrio/core";

export const nearestGuide = (edges: number[], guides: number[], distance: number) => {
  let match: { offset: number; value: number } | null = null;
  for (const edge of edges)
    for (const value of guides) {
      const offset = value - edge;
      if (Math.abs(offset) <= distance && (!match || Math.abs(offset) < Math.abs(match.offset)))
        match = { offset, value };
    }
  return match;
};

const renderGrip =
  (vertical: boolean): Control["render"] =>
  (context, left, top, _style, object) => {
    context.save();
    context.translate(left, top);
    context.rotate((object.angle * Math.PI) / 180);
    context.fillStyle = "#ffffff";
    context.strokeStyle = "#a8b5ac";
    context.lineWidth = 1;
    context.beginPath();
    context.roundRect(
      vertical ? -4 : -10,
      vertical ? -10 : -4,
      vertical ? 8 : 20,
      vertical ? 20 : 8,
      4,
    );
    context.fill();
    context.stroke();
    context.restore();
  };
const renderCorner: Control["render"] = (context, left, top) => {
  context.save();
  context.fillStyle = "#ffffff";
  context.strokeStyle = "#a8b5ac";
  context.lineWidth = 1;
  context.beginPath();
  context.arc(left, top, 5, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.restore();
};
const renderRotation: Control["render"] = (context, left, top) => {
  context.save();
  context.translate(left, top);
  context.shadowColor = "#263c3226";
  context.shadowBlur = 8;
  context.shadowOffsetY = 2;
  context.fillStyle = "#ffffff";
  context.beginPath();
  context.arc(0, 0, 16, 0, Math.PI * 2);
  context.fill();
  context.shadowColor = "transparent";
  context.strokeStyle = "#257454";
  context.lineWidth = 1.6;
  context.lineCap = "round";
  context.beginPath();
  context.arc(0, 0, 7, -0.75 * Math.PI, 0.8 * Math.PI);
  context.stroke();
  context.beginPath();
  context.moveTo(-7, 1);
  context.lineTo(-6, 5);
  context.lineTo(-2, 4);
  context.stroke();
  context.restore();
};

export const styleControls = (object: FabricObject, element: DesignElement) => {
  object.controls = controlsUtils.createObjectDefaultControls();
  object.set({
    borderColor: "#257454",
    borderScaleFactor: 1,
    cornerSize: 12,
    touchCornerSize: 32,
    padding: 0,
    transparentCorners: false,
    hasControls: !element.locked,
  });
  for (const [name, control] of Object.entries(object.controls)) {
    control.render =
      name === "mtr"
        ? renderRotation
        : ["ml", "mr"].includes(name)
          ? renderGrip(true)
          : ["mt", "mb"].includes(name)
            ? renderGrip(false)
            : renderCorner;
    control.visible =
      !element.locked && element.permissions?.[name === "mtr" ? "rotate" : "resize"] !== false;
    // Keep resize gestures independent from skewing, including when Alt is held.
    if (name === "ml" || name === "mr") {
      control.actionHandler = controlsUtils.scalingX;
      control.cursorStyleHandler = controlsUtils.scaleCursorStyleHandler;
      control.getActionName = () => "scaleX";
    } else if (name === "mt" || name === "mb") {
      control.actionHandler = controlsUtils.scalingY;
      control.cursorStyleHandler = controlsUtils.scaleCursorStyleHandler;
      control.getActionName = () => "scaleY";
    }
  }
  const rotation = object.controls.mtr!;
  rotation.offsetY = -36;
  rotation.sizeX = rotation.sizeY = 32;
  rotation.touchSizeX = rotation.touchSizeY = 40;
  rotation.withConnection = true;
};
