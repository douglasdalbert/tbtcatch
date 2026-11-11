import { describe, expect, it } from "vitest";
import { attackMultiplier, formatBonus, typeBonus } from "./elements";

const BONUS = 0.1;

describe("attackMultiplier", () => {
  it("soma o bônus para cada tipo fraco do defensor", () => {
    expect(attackMultiplier("eletrico", ["agua", "ar"], BONUS)).toBeCloseTo(1.2);
  });

  it("compensa vantagem e resistência em defensores de tipos combinados", () => {
    expect(attackMultiplier("eletrico", ["rocha", "agua"], BONUS)).toBeCloseTo(1.0);
  });

  it("reduz o dano quando o defensor resiste ao ataque", () => {
    expect(attackMultiplier("fogo", ["agua"], BONUS)).toBeCloseTo(0.9);
    expect(typeBonus("fogo", "agua", BONUS)).toBeCloseTo(-BONUS);
  });

  it("aplica vantagem simples", () => {
    expect(attackMultiplier("agua", ["fogo"], BONUS)).toBeCloseTo(1.1);
  });

  it("dá bônus ao atacante em pares mutuamente fortes, como manhã contra noite", () => {
    expect(attackMultiplier("manha", ["noite"], BONUS)).toBeCloseTo(1.1);
    expect(attackMultiplier("noite", ["manha"], BONUS)).toBeCloseTo(1.1);
    expect(attackMultiplier("ar", ["eletrico"], BONUS)).toBeCloseTo(1.1);
    expect(attackMultiplier("eletrico", ["ar"], BONUS)).toBeCloseTo(1.1);
  });

  it("é neutro sem relação de vantagem e reduz quando só o defensor tem vantagem", () => {
    expect(attackMultiplier("agua", ["planta"], BONUS)).toBeCloseTo(0.9);
    expect(attackMultiplier("fogo", ["eletrico"], BONUS)).toBeCloseTo(1.0);
    expect(attackMultiplier("agua", ["eletrico"], BONUS)).toBeCloseTo(0.9);
    expect(attackMultiplier("rocha", ["ar"], BONUS)).toBeCloseTo(1.0);
    expect(attackMultiplier("manha", ["agua"], BONUS)).toBeCloseTo(1.0);
    expect(attackMultiplier("fogo", ["noite"], BONUS)).toBeCloseTo(1.0);
  });
});

describe("formatBonus", () => {
  it("formata com sinal e dois dígitos", () => {
    expect(formatBonus(BONUS)).toBe("+10");
    expect(formatBonus(-BONUS)).toBe("-10");
    expect(formatBonus(0)).toBe("+00");
    expect(formatBonus(0.2)).toBe("+20");
  });
});
