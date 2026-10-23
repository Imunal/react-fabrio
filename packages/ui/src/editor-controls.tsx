import { ElementList } from "./element-list.js";
/**
 * Renders the element list inside a composable controls sidebar.
 *
 * @param props - Optional disabled state, supported panel callbacks.
 *
 * @remarks
 * Requires `FabrioI18nProvider`, `EditorProvider` and the UI stylesheet.
 */
export const EditorControls = (props: Parameters<typeof ElementList>[0]) => (
  <aside className="rf-controls">
    <ElementList {...props} />
  </aside>
);
