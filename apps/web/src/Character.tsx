import { characters, type CharacterId } from "@catch/shared";

export function Character({ id }: { id: CharacterId }) {
  const character = characters.find((entry) => entry.id === id)!;
  return <svg className="character" viewBox="0 0 64 64"
    role="img" aria-label={character.name}>
    <circle cx="32" cy="32" r="30" fill={character.color} />
    <path d="M32 13c-10 8-14 17-11 25 2 6 7 9 11 11 4-2 9-5 11-11 3-8-1-17-11-25Z" fill={character.accent} />
    <path d="M32 44V23m0 12c-5-5-8-7-11-8m11 14c5-5 8-7 11-8" fill="none" stroke="#10232b" strokeLinecap="round" strokeWidth="3" />
  </svg>;
}
