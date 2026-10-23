import { createDesignDocument } from "@react-fabrio/core";
import { mugProduct, shirtProduct, tagProduct } from "@react-fabrio/core/examples";
import type { ProductConfig, Template } from "@react-fabrio/core";

const heart = "M12 21 C-6 9 2 -1 12 7 C22 -1 30 9 12 21 Z";
const templates: Template[] = [
  {
    id: "moments",
    name: "Małe chwile",
    elements: [
      {
        id: "title",
        type: "text",
        text: "Małe chwile,\nwielkie wspomnienia",
        fontId: "sans",
        fontSize: 7,
        color: "#263c32",
        x: 80,
        y: 24,
        width: 110,
        height: 32,
        rotation: 0,
        align: "center",
      },
      {
        id: "heart",
        type: "vector",
        path: heart,
        color: "#b87960",
        x: 125,
        y: 61,
        width: 12,
        height: 10,
        rotation: 0,
      },
    ],
  },
  {
    id: "together",
    name: "Razem najlepiej",
    elements: [
      {
        id: "title",
        type: "text",
        text: "Razem\nnajlepiej",
        fontId: "sans",
        fontSize: 12,
        color: "#263c32",
        x: 35,
        y: 15,
        width: 130,
        height: 45,
        rotation: 0,
        align: "center",
      },
      {
        id: "heart",
        type: "vector",
        path: heart,
        color: "#b87960",
        x: 93,
        y: 62,
        width: 14,
        height: 12,
        rotation: 0,
      },
    ],
  },
  {
    id: "morning",
    name: "Dobry dzień",
    elements: [
      {
        id: "sun",
        type: "vector",
        path: "M12 2 A10 10 0 1 1 11.99 2 Z",
        color: "#d6aa58",
        x: 20,
        y: 20,
        width: 40,
        height: 40,
        rotation: 0,
      },
      {
        id: "title",
        type: "text",
        text: "To będzie\ndobry dzień",
        fontId: "sans",
        fontSize: 9,
        color: "#263c32",
        x: 75,
        y: 20,
        width: 110,
        height: 35,
        rotation: 0,
        align: "center",
      },
    ],
  },
];
const mug = structuredClone(mugProduct);
mug.name = "Kubek ze wspomnieniami";
mug.sides[0]!.name = "Kubek";
mug.sides[0]!.areas[0]!.name = "Nadruk";
mug.sides[0]!.areas[0]!.templates = templates;
const shirt = structuredClone(shirtProduct);
shirt.name = "Koszulka";
shirt.sides.forEach((side) => {
  side.name = side.id === "front" ? "Przód" : "Tył";
  side.areas[0]!.name = "Nadruk";
});
const tag = structuredClone(tagProduct);
tag.name = "Zawieszka z grawerem";
tag.sides[0]!.name = "Przód";
tag.sides[0]!.areas[0]!.name = "Grawer";
tag.sides[0]!.areas[0]!.templates![0]!.slots![0]!.label = "Twoje imię";
for (const product of [mug, shirt, tag])
  for (const side of product.sides)
    for (const area of side.areas) {
      area.safeMargin = 3;
      area.constrainToSafeArea = false;
      if (product === mug) area.bleed = 2;
    }
export const products: Record<string, ProductConfig> = { mug, shirt, tag };
export const createDemoDesign = () => {
  const design = createDesignDocument(mug);
  design.assets["little-moments"] = {
    id: "little-moments",
    url: "/images/little-moments.png",
    mimeType: "image/png",
    width: 1536,
    height: 1024,
    durable: true,
  };
  design.areas.wrap = [
    {
      id: "memory-photo",
      type: "image",
      assetId: "little-moments",
      x: 10,
      y: 12,
      width: 68,
      height: 45.333,
      rotation: 0,
    },
    ...structuredClone(templates[0]!.elements),
  ];
  return design;
};
