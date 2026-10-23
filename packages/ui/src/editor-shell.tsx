import { useFabrioTranslation } from "./i18n.js";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { Button } from "react-aria-components";

export type Tool = "images" | "text" | "artwork" | "templates" | "elements" | "settings";
const paths: Record<string, string> = {
  fit: "M8 3H3v5 M16 3h5v5 M3 16v5h5 M21 16v5h-5 M8 8h8v8H8z",
  pan: "M12 3v18 M3 12h18 M9 6l3-3 3 3 M9 18l3 3 3-3 M6 9l-3 3 3 3 M18 9l3 3-3 3",
  "text-left": "M4 5h16 M4 10h10 M4 15h16 M4 20h10",
  "text-center": "M4 5h16 M7 10h10 M4 15h16 M7 20h10",
  "text-right": "M4 5h16 M10 10h10 M4 15h16 M10 20h10",
  "text-justify": "M4 5h16 M4 10h16 M4 15h16 M4 20h16",
  "move-up": "M12 19V5 M6 11l6-6 6 6",
  "move-down": "M12 5v14 M6 13l6 6 6-6",
  "move-left": "M19 12H5 M11 6l-6 6 6 6",
  "move-right": "M5 12h14 M13 6l6 6-6 6",
  "align-left": "M4 3v18 M8 6h12v4H8z M8 14h8v4H8z",
  "align-center": "M12 3v18 M4 6h16v4H4z M7 14h10v4H7z",
  "align-right": "M20 3v18 M4 6h12v4H4z M8 14h8v4H8z",
  "align-top": "M3 4h18 M6 8h4v12H6z M14 8h4v8h-4z",
  "align-middle": "M3 12h18 M6 4h4v16H6z M14 7h4v10h-4z",
  "align-bottom": "M3 20h18 M6 4h4v12H6z M14 8h4v8h-4z",
  "layer-up": "m3 13 7 4 7-4 M3 18l7 4 7-4 M3 8l7-4 7 4-7 4z M20 11V2 m-3 3 3-3 3 3",
  "layer-down": "m3 13 7 4 7-4 M3 18l7 4 7-4 M3 8l7-4 7 4-7 4z M20 2v9 m-3-3 3 3 3-3",
  crop: "M6 3v15h15 M3 6h15v15 M10 3v3 M3 10h3 M18 14h3 M14 18v3",
  drag: "M8 5h.01 M16 5h.01 M8 12h.01 M16 12h.01 M8 19h.01 M16 19h.01",
  up: "m6 15 6-6 6 6",
  down: "m6 9 6 6 6-6",
  check: "m5 12 4 4 10-10",
  images: "M4 4h16v16H4z M4 16l5-5 4 4 3-3 4 4 M8 8h.01",
  text: "M4 5h16 M12 5v15 M8 20h8",
  artwork: "m12 3 3 6 6 3-6 3-3 6-3-6-6-3 6-3z",
  templates: "M3 4h18v16H3z M10 4v16 M10 12h11",
  elements: "m12 3 10 5-10 5L2 8z M2 12l10 5 10-5 M2 16l10 5 10-5",
  settings: "M4 7h16 M4 17h16 M8 4v6 M16 14v6",
  close: "m6 6 12 12 M6 18 18 6",
  undo: "M9 5 4 10l5 5 M4 10h9a6 6 0 0 1 6 6",
  redo: "m15 5 5 5-5 5 M20 10h-9a6 6 0 0 0-6 6",
  rotate: "M20 7V3l-4 4 M20 7a9 9 0 1 0 1 8",
  duplicate: "M8 8h12v12H8z M16 8V4H4v12h4",
  flip: "M12 3v18 M3 7l6 5-6 5z M21 7l-6 5 6 5z",
  remove: "M4 6h16 M9 6V3h6v3 M6 6l1 15h10l1-15 M10 10v7 M14 10v7",
};
export const EditorIcon = ({ name }: { name: string }) => (
  <svg
    aria-hidden="true"
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d={paths[name] ?? paths.settings} />
  </svg>
);

export const EditorHeader = ({
  start,
  actions,
  children,
}: {
  start?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) => {
  const { t } = useFabrioTranslation();
  return (
    <header className="rf-header">
      <span className="rf-brand">
        fabrio<span aria-hidden="true">.</span>
      </span>
      <div className="rf-header-start">{start}</div>
      <details className="rf-project-menu">
        <summary>{t("project")}</summary>
        <div className="rf-project-actions">{actions}</div>
      </details>
      {children}
    </header>
  );
};

export const ToolNavigation = ({
  id,
  tools,
  active,
  open,
  onChange,
}: {
  id: string;
  tools: Tool[];
  active: string;
  open: boolean;
  onChange: (tool: Tool) => void;
}) => {
  const { t } = useFabrioTranslation();
  return (
    <nav className="rf-tools" aria-label={t("controls")}>
      {tools.map((tool) => (
        <Button
          key={tool}
          id={`${id}-tool-${tool}`}
          className="rf-tool"
          aria-label={t(tool)}
          aria-expanded={open && active === tool}
          aria-controls={`${id}-panel`}
          aria-pressed={open && active === tool}
          onPress={() => onChange(tool)}
        >
          <EditorIcon name={tool} />
          <span>{t(tool)}</span>
        </Button>
      ))}
    </nav>
  );
};

export const ResourcePanel = ({
  id,
  title,
  focusKey,
  open,
  onClose,
  children,
}: {
  id: string;
  title: string;
  focusKey: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) => {
  const { t } = useFabrioTranslation();
  const panel = useRef<HTMLElement>(null);
  const previous = useRef({ open, focusKey });
  useEffect(() => {
    if (previous.current.open === open && previous.current.focusKey === focusKey) return;
    previous.current = { open, focusKey };
    if (open) panel.current?.querySelector<HTMLElement>("h2")?.focus();
  }, [open, focusKey]);
  useEffect(() => {
    const element = panel.current;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (
        event.key === "Escape" &&
        !event.defaultPrevented &&
        !element?.querySelector("[data-dragging]")
      ) {
        event.stopPropagation();
        onClose();
      }
    };
    element?.addEventListener("keydown", closeOnEscape);
    return () => element?.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);
  return (
    <aside
      ref={panel}
      id={`${id}-panel`}
      className="rf-controls"
      aria-label={t("controls")}
      hidden={!open}
    >
      <div className="rf-panel-heading">
        <h2 tabIndex={-1}>{title}</h2>
        <Button className="rf-icon-button" aria-label={t("closePanel")} onPress={onClose}>
          <EditorIcon name="close" />
        </Button>
      </div>
      <div className="rf-panel-content">{children}</div>
    </aside>
  );
};

export const AreaThumbnail = ({
  area,
  elements,
  assets,
}: {
  area: import("@react-fabrio/core").DecorationArea;
  elements: import("@react-fabrio/core").DesignElement[];
  assets: import("@react-fabrio/core").DesignDocument["assets"];
}) => (
  <svg
    className="rf-area-thumbnail"
    aria-hidden="true"
    viewBox={`0 0 ${area.width} ${area.height}`}
  >
    {elements.map((element) => (
      <g
        key={element.id}
        transform={`translate(${element.x + element.width / 2} ${element.y + element.height / 2}) rotate(${element.rotation}) translate(${-element.width / 2} ${-element.height / 2})`}
      >
        {element.type === "image" ? (
          <g
            transform={`translate(${element.flipX ? element.width : 0} ${element.flipY ? element.height : 0}) scale(${element.flipX ? -1 : 1} ${element.flipY ? -1 : 1})`}
          >
            <svg
              width={element.width}
              height={element.height}
              viewBox={`${element.crop?.x ?? 0} ${element.crop?.y ?? 0} ${element.crop?.width ?? 1} ${element.crop?.height ?? 1}`}
              preserveAspectRatio="none"
              overflow="hidden"
            >
              <image
                href={assets[element.assetId]?.url}
                width="1"
                height="1"
                preserveAspectRatio="none"
              />
            </svg>
          </g>
        ) : element.type === "text" ? (
          <text x={0} y={element.fontSize} fontSize={element.fontSize} fill={element.color}>
            {element.text}
          </text>
        ) : (
          <rect width={element.width} height={element.height} fill={element.color} />
        )}
      </g>
    ))}
  </svg>
);
