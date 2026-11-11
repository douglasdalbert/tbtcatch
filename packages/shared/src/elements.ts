export const elementTypes = ["agua", "fogo", "planta", "eletrico", "ar", "rocha", "manha", "noite"] as const;

export type ElementType = typeof elementTypes[number];

export const elementNames: Record<ElementType, string> = {
  agua: "Água",
  fogo: "Fogo",
  planta: "Planta",
  eletrico: "Elétrico",
  ar: "Ar",
  rocha: "Rocha",
  manha: "Manhã",
  noite: "Noite",
};

export const strongAgainst: Record<ElementType, readonly ElementType[]> = {
  agua: ["fogo", "rocha"],
  fogo: ["planta", "ar"],
  planta: ["agua", "rocha"],
  eletrico: ["agua", "ar"],
  ar: ["planta", "eletrico"],
  rocha: ["eletrico", "fogo"],
  manha: ["noite"],
  noite: ["manha"],
};

/** Bônus aditivo de um ataque contra um único tipo defensor: positivo quando o
 * ataque é bom contra o tipo; senão, negativo quando o tipo resiste ao ataque.
 * A vantagem do atacante prevalece em pares mutuamente fortes, como Manhã↔Noite. */
export function typeBonus(attackType: ElementType, defenderType: ElementType, bonus: number): number {
  if (strongAgainst[attackType].includes(defenderType)) return bonus;
  if (strongAgainst[defenderType].includes(attackType)) return -bonus;
  return 0;
}

/** Multiplicador final do ataque: 1 mais a soma dos bônus de cada tipo do defensor. */
export function attackMultiplier(
  attackType: ElementType,
  defenderTypes: readonly ElementType[],
  bonus: number,
): number {
  return 1 + defenderTypes.reduce((total, defenderType) => total + typeBonus(attackType, defenderType, bonus), 0);
}

/** Representa um bônus como percentual com sinal e dois dígitos, por exemplo "+10", "-10" ou "+00". */
export function formatBonus(value: number): string {
  const percent = Math.round(Math.abs(value) * 100);
  return `${value < 0 ? "-" : "+"}${String(percent).padStart(2, "0")}`;
}
