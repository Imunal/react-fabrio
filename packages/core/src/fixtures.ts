import type { ProductConfig } from "./contracts.js";
const fonts = [
  {
    id: "sans",
    family: "Fabrio Sans",
    url: "/fonts/FabrioSans.ttf",
  },
];
const artwork = [
  {
    id: "heart",
    name: "Heart",
    path: "M10 18 C-8 6 0 -4 10 4 C20 -4 28 6 10 18 Z",
    color: "#000000",
  },
];
export const mugProduct: ProductConfig = {
  id: "mug",
  name: "Personalized mug",
  revision: "1",
  fonts,
  artwork,
  upload: {
    maxBytes: 10 * 1024 * 1024,
    mimeTypes: ["image/png", "image/jpeg", "image/webp", "image/svg+xml"],
  },
  sides: [
    {
      id: "outside",
      name: "Outside",
      areas: [
        {
          id: "wrap",
          name: "Mug wrap",
          width: 200,
          height: 80,
          production: "print",
          mode: "freeform",
          allowedElements: ["text", "image", "vector"],
        },
      ],
    },
  ],
  mug: { radius: 40, height: 95, color: "#ffffff", areaId: "wrap", wrapAngle: 286 },
};
export const tshirtProduct: ProductConfig = {
  id: "tshirt",
  name: "Front and back T-shirt",
  revision: "1",
  fonts,
  artwork,
  upload: {
    maxBytes: 10 * 1024 * 1024,
    mimeTypes: ["image/png", "image/jpeg", "image/webp", "image/svg+xml"],
  },
  sides: ["front", "back"].map((id) => ({
    id,
    name: id === "front" ? "Front" : "Back",
    areas: [
      {
        id,
        name: id === "front" ? "Chest" : "Back print",
        width: 250,
        height: 300,
        production: "print",
        mode: "freeform",
        allowedElements: ["text", "image", "vector"],
      },
    ],
  })),
};
export const shirtProduct = tshirtProduct;
export const tagProduct: ProductConfig = {
  id: "tag",
  name: "Engraved tag",
  revision: "1",
  fonts,
  artwork,
  upload: { maxBytes: 10 * 1024 * 1024, mimeTypes: ["image/svg+xml"] },
  sides: [
    {
      id: "front",
      name: "Front",
      areas: [
        {
          id: "front",
          name: "Engraving",
          width: 50,
          height: 25,
          production: "engraving",
          mode: "guided",
          allowedElements: ["text", "vector"],
          templates: [
            {
              id: "name",
              name: "Name tag",
              elements: [
                {
                  id: "name",
                  type: "text",
                  x: 5,
                  y: 8,
                  width: 40,
                  height: 9,
                  rotation: 0,
                  text: "",
                  fontId: "sans",
                  fontSize: 5,
                  color: "#000000",
                  slotId: "name",
                },
              ],
              slots: [{ id: "name", label: "Your name", elementId: "name", required: true }],
            },
          ],
        },
      ],
    },
  ],
};
