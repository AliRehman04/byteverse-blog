import type { CsvDiffSample } from "./types";

export const CSV_DIFF_SAMPLES: CsvDiffSample[] = [
  {
    id: "inventory",
    label: "Reordered inventory",
    description: "Rows and columns move: one added, one removed, one changed, and one unchanged SKU.",
    original: "sku,name,stock\n001,Notebook,12\n002,Pen,30\n003,Mug,8",
    updated: "stock,sku,name\n7,003,Mug\n12,001,Notebook\n4,004,Desk mat",
    keys: ["sku"],
  },
  {
    id: "composite",
    label: "SKU and warehouse",
    description: "A composite key distinguishes the same SKU stored in different warehouses.",
    original: "sku,warehouse,stock\n001,North,10\n001,South,20\n002,North,5",
    updated: "warehouse,stock,sku\nSouth,18,001\nNorth,10,001\nWest,6,002",
    keys: ["sku", "warehouse"],
  },
  {
    id: "duplicate-keys",
    label: "Duplicate-key error",
    description: "Two original records share a SKU. Comparison stops rather than choosing a row.",
    original: "sku,name,stock\n001,Notebook,12\n001,Notebook,13",
    updated: "sku,name,stock\n001,Notebook,14",
    keys: ["sku"],
  },
];