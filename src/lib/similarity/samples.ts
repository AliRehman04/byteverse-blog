import type { SourceInput } from "./types";

export const COMPARISON_SAMPLE: { draft: string; sources: SourceInput[] } = {
  draft: "A community garden can turn an unused corner into a place to learn. Volunteers share seeds and tools with their neighbors every spring. Our team added a rain barrel and a small sign explaining the watering schedule.\n\nThe library opens its reading room to local groups on Saturday mornings. We used that space to plan the next planting day. These fictional passages demonstrate matching wording, not an accusation of plagiarism.",
  sources: [
    {
      id: "source-1",
      label: "Community garden notes (sample)",
      text: "Volunteers share seeds and tools with their neighbors every spring. Last year the group started a compost pile and planted herbs along the fence. Families can sign up for a short weekly watering shift.",
    },
    {
      id: "source-2",
      label: "Library newsletter (sample)",
      text: "The library opens its reading room to local groups on Saturday mornings. Please ask the front desk about booking the space. The notice board also lists free workshops for new gardeners.",
    },
  ],
};

export const REPETITION_SAMPLE = "The project team checks every reference before sharing the final report. Clear source notes make it easier for an editor to follow the argument.\n\nThe project team checks every reference before sharing the final report. This second copy is an intentional repetition in a fictional draft.\n\nClear source notes make it easier for an editor to follow the argument.";