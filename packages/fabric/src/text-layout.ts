/** Soft-wrap at ordinary spaces; explicit newlines end paragraphs. */
export const layoutTextLines = (
  text: string,
  width: number,
  measure: (text: string) => number,
): { text: string; justify: boolean }[] => {
  const lines: { text: string; justify: boolean }[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const part of paragraph.match(/ +|[^ ]+/g) ?? []) {
      if (part.trim() && line.trim() && measure(line + part) > width) {
        lines.push({ text: line.trimEnd(), justify: true });
        line = part;
      } else {
        line += part;
      }
    }
    lines.push({ text: line, justify: false });
  }
  return lines;
};
