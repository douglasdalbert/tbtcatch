export const characterIds = [
  "trainer-01", "trainer-02", "trainer-03", "trainer-04",
  "trainer-05", "trainer-06", "trainer-07", "trainer-08",
  "trainer-09", "trainer-10", "trainer-11", "trainer-12",
] as const;

export type CharacterId = typeof characterIds[number];

const portraits = [
  { x: 0, y: 24 },
  { x: 120, y: 0 },
  { x: 216, y: 0 },
  { x: 312, y: 0 },
  { x: 408, y: 0 },
  { x: 504, y: 0 },
  { x: 552, y: 24 },
  { x: 672, y: 0 },
  { x: 48, y: 120 },
  { x: 144, y: 120 },
  { x: 432, y: 144 },
  { x: 528, y: 120 },
];

export const characters = characterIds.map((id, index) => ({
  id,
  name: `Personagem ${index + 1}`,
  ...portraits[index],
  width: 24,
  height: 24,
}));
