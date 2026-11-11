export const characterIds = [
  "explorer-01", "explorer-02", "explorer-03", "explorer-04",
  "explorer-05", "explorer-06", "explorer-07", "explorer-08",
  "explorer-09", "explorer-10", "explorer-11", "explorer-12",
] as const;

export type CharacterId = typeof characterIds[number];

const palettes = [
  ["#2f7658", "#a7e5cd"],
  ["#397a9b", "#9de2ed"],
  ["#9a6b32", "#f0c675"],
  ["#72528c", "#d4b8ef"],
  ["#387d74", "#a5e5bd"],
  ["#9b4f48", "#f1b1a1"],
  ["#54713d", "#d1e596"],
  ["#4c628d", "#b8c8f2"],
  ["#a15379", "#f3b4cf"],
  ["#527b7f", "#b8e4df"],
  ["#84723c", "#eadb9d"],
  ["#785844", "#e7c2a2"],
];

export const characters = characterIds.map((id, index) => ({
  id,
  name: `Personagem ${index + 1}`,
  color: palettes[index][0],
  accent: palettes[index][1],
}));
