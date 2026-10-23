import { expect, test } from "vitest";
import { layoutTextLines } from "../packages/fabric/src/text-layout.js";
import { textElementSchema } from "../packages/core/src/schemas.js";

const measure = (text: string) => text.length;

test("wraps at word boundaries and marks only soft-wrapped lines for justification", () => {
  expect(layoutTextLines("one two three four\nfive six", 9, measure)).toEqual([
    { text: "one two", justify: true },
    { text: "three", justify: true },
    { text: "four", justify: false },
    { text: "five six", justify: false },
  ]);
});

test("preserves blank lines, nonbreaking spaces and overlong words", () => {
  expect(layoutTextLines("\nlongword\na\u00a0b c\n", 3, measure)).toEqual([
    { text: "", justify: false },
    { text: "longword", justify: false },
    { text: "a\u00a0b", justify: true },
    { text: "c", justify: false },
    { text: "", justify: false },
  ]);
});

test("accepts justified alignment in text documents", () => {
  expect(
    textElementSchema.safeParse({
      id: "text",
      type: "text",
      x: 0,
      y: 0,
      width: 20,
      height: 10,
      rotation: 0,
      text: "one two three",
      fontId: "sans",
      fontSize: 4,
      color: "#000000",
      align: "justify",
    }).success,
  ).toBe(true);
});
