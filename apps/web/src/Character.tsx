import { characters, type CharacterId } from "@catch/shared";

export function Character({ id }: { id: CharacterId }) {
  const character = characters.find((entry) => entry.id === id)!;
  return <svg className="character" viewBox={`${character.x} ${character.y} ${character.width} ${character.height}`}
    role="img" aria-label={character.name}>
    <image href="/sprite-players.png" width="768" height="4533" />
  </svg>;
}
