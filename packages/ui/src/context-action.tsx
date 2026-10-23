import { useState } from "react";
import { Button, Tooltip, TooltipTrigger } from "react-aria-components";
import { EditorIcon } from "./editor-shell.js";

export const ContextAction = ({
  icon,
  label,
  description,
  disabled,
  onPress,
}: {
  icon: string;
  label: string;
  description: string;
  disabled?: boolean;
  onPress?: () => void;
}) => {
  const [container, setContainer] = useState<HTMLSpanElement | null>(null);
  return (
    <span className="rf-context-action" ref={setContainer}>
      <TooltipTrigger delay={450} closeDelay={0}>
        <Button
          className="rf-caption-button"
          aria-label={label}
          isDisabled={disabled}
          onPress={onPress}
        >
          <EditorIcon name={icon} />
          <span>{label}</span>
        </Button>
        <Tooltip
          className="rf-tooltip"
          placement="top"
          offset={8}
          UNSTABLE_portalContainer={container?.closest(".rf-editor") ?? undefined}
        >
          {description}
        </Tooltip>
      </TooltipTrigger>
    </span>
  );
};
