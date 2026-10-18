import {
  Button,
  Group,
  Input,
  Label,
  NumberField,
  Radio,
  RadioGroup,
  TextField,
} from "react-aria-components";
import { useEditor } from "@react-fabrio/react";

const colors = [
  { name: "Forest", value: "#263c32" },
  { name: "Ink", value: "#242424" },
  { name: "Terracotta", value: "#a34730" },
];

export const EditorControls = () => {
  const { editor, selected, layers } = useEditor();
  return (
    <aside className="rf-controls" aria-label="Design controls">
      <h2 className="rf-controls-heading">Text properties</h2>
      <TextField
        className="rf-field"
        value={selected?.text ?? ""}
        isDisabled={!selected}
        onChange={(value) => editor?.updateText(value)}
      >
        <Label>Your message</Label>
        <Input className="rf-input" placeholder="Add text first" maxLength={120} />
      </TextField>
      <NumberField
        className="rf-field"
        value={selected?.sizeMm ?? 4}
        minValue={1}
        maxValue={12}
        step={0.5}
        isDisabled={!selected}
        onChange={(value) => editor?.setSize(value)}
      >
        <Label>Text size (mm)</Label>
        <Group className="rf-stepper">
          <Button className="rf-button" slot="decrement" aria-label="Decrease text size">
            −
          </Button>
          <Input className="rf-input" />
          <Button className="rf-button" slot="increment" aria-label="Increase text size">
            +
          </Button>
        </Group>
      </NumberField>
      <RadioGroup
        className="rf-field"
        value={selected?.color ?? colors[0]!.value}
        isDisabled={!selected}
        onChange={(value) => editor?.setColor(value)}
      >
        <Label>Text color</Label>
        <div className="rf-colors">
          {colors.map((color) => (
            <Radio className="rf-color" value={color.value} key={color.value}>
              <span className="rf-swatch" style={{ backgroundColor: color.value }} />
              {color.name}
            </Radio>
          ))}
        </div>
      </RadioGroup>
      <div className="rf-field">
        <span>Move text · 1 mm</span>
        <Group className="rf-move" aria-label="Move text in one millimeter steps">
          {[
            { label: "Move left", icon: "←", x: -1, y: 0 },
            { label: "Move up", icon: "↑", x: 0, y: -1 },
            { label: "Move down", icon: "↓", x: 0, y: 1 },
            { label: "Move right", icon: "→", x: 1, y: 0 },
          ].map((direction) => (
            <Button
              className="rf-button"
              key={direction.label}
              aria-label={direction.label}
              isDisabled={!selected}
              onPress={() => editor?.move(direction.x, direction.y)}
            >
              {direction.icon}
            </Button>
          ))}
        </Group>
      </div>
      <section className="rf-layers" aria-label="Text elements">
        <h3>
          Text elements <span>{layers.length}</span>
        </h3>
        {layers.length === 0 ? (
          <p>No text elements.</p>
        ) : (
          <ul>
            {layers.map((layer, index) => (
              <li key={layer.id}>
                <Button
                  className="rf-layer"
                  aria-pressed={selected?.id === layer.id}
                  onPress={() => editor?.select(layer.id)}
                >
                  <span aria-hidden="true">T</span>
                  <span>{layer.text || `Empty text ${index + 1}`}</span>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <Button
        className="rf-button rf-delete"
        isDisabled={!selected}
        onPress={() => editor?.remove()}
      >
        Remove selected text
      </Button>
    </aside>
  );
};
