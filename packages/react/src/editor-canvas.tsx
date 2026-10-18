import { createFabricEditor } from "@react-fabrio/fabric";
import { useEditorContext } from "./context.js";

export const EditorCanvas = ({ className }: { className?: string }) => {
  const {
    product: { id, name, width, height, unit },
    setEditor,
  } = useEditorContext();
  const mount = (host: HTMLDivElement | null) => {
    if (!host) return;
    const instance = createFabricEditor(host, { id, name, width, height, unit });
    setEditor(instance);
    return () => {
      setEditor(null);
      void instance.dispose().catch((error: unknown) => {
        console.error("Could not dispose editor canvas", error);
      });
    };
  };
  return <div className={className} ref={mount} />;
};
