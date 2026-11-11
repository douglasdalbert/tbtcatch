import { expect, test } from "@playwright/test";

test("notebook, mapa e dois celulares sincronizam, reconectam e respeitam a pausa", async ({ browser }) => {
  const hostContext = await browser.newContext();
  const mapContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const anaContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const biaContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  try {
    const host = await hostContext.newPage();
    const map = await mapContext.newPage();
    const ana = await anaContext.newPage();
    const bia = await biaContext.newPage();
    await host.goto("/host");
    await ana.goto("/player");
    await expect(ana.getByRole("heading", { name: "Aguardando o notebook" })).toBeVisible();
    await host.getByRole("button", { name: "Preparar partida" }).click();
    await expect(host.getByText("Aguardando início", { exact: true })).toBeVisible();
    const mapLink = await host.getByRole("link").filter({ hasText: "/map" }).getAttribute("href");
    if (!mapLink) throw new Error("Endereço do mapa ausente");
    expect(new URL(mapLink).search).toBe("");
    await expect(host.getByRole("img", { name: "QR code: Celular · entrar como jogador" })).toBeVisible();

    await map.goto("/map");
    await expect(map.getByLabel("Código da sala")).toHaveCount(0);
    await expect(host.getByText("Tablet: aguardando fullscreen")).toBeVisible();
    await expect(host.getByRole("button", { name: "Iniciar teste de conexão" })).toBeDisabled();
    await map.getByRole("button", { name: "Ativar fullscreen" }).click();
    await expect(host.getByText("Tablet: em fullscreen")).toBeVisible();

    await bia.goto("/player");
    for (const [page, initialName, name] of [[ana, "Jogador A", "Ana"], [bia, "Jogador B", "Bia"]] as const) {
      await expect(page.getByLabel("Código da sala")).toHaveCount(0);
      await page.getByRole("button", { name: `Editar nome: ${initialName}`, exact: true }).click();
      await page.getByLabel("Seu nome").fill(name);
      await page.getByRole("button", { name: "Salvar nome" }).click();
      await expect(page.getByRole("button", { name: `Editar nome: ${name}`, exact: true })).toBeVisible();
      await expect(page.locator(".players")).toHaveCount(0);
    }
    const anaCharacter = await ana.getByRole("button", { name: "Trocar personagem" }).getByRole("img").getAttribute("aria-label");
    const biaCharacter = await bia.getByRole("button", { name: "Trocar personagem" }).getByRole("img").getAttribute("aria-label");
    expect(anaCharacter).not.toBe(biaCharacter);
    await ana.getByRole("button", { name: "Trocar personagem" }).click();
    await expect(ana.getByRole("button", { name: `${biaCharacter} · em uso por Bia`, exact: true })).toBeDisabled();
    const availableCharacter = ana.locator(".character-options button:enabled[aria-pressed=false]").first();
    const chosenCharacter = await availableCharacter.getAttribute("aria-label");
    await availableCharacter.click();
    await expect(ana.getByRole("button", { name: "Trocar personagem" }).getByRole("img")).toHaveAttribute("aria-label", chosenCharacter!);
    await expect(host.locator(".players li").filter({ hasText: "Ana" }).getByRole("img")).toHaveAttribute("aria-label", chosenCharacter!);
    await ana.getByRole("button", { name: "Editar nome: Ana", exact: true }).click();
    await ana.getByLabel("Seu nome").fill("Bia");
    await ana.getByRole("button", { name: "Salvar nome" }).click();
    await expect(ana.getByRole("dialog").getByRole("alert")).toContainText("Esse nome já está em uso");
    await ana.getByRole("button", { name: "Fechar", exact: true }).click();
    await expect(host.locator(".players li")).toHaveCount(2);
    await expect(map.locator(".players li")).toHaveCount(2);
    await host.getByRole("button", { name: "Iniciar teste de conexão" }).click();
    await expect(ana.locator(".status")).toContainText("Conectado");

    await biaContext.setOffline(true);
    await expect(host.locator(".players li").filter({ hasText: "Bia" })).toContainText("Reconectando", { timeout: 35_000 });
    await biaContext.setOffline(false);
    await expect(host.locator(".players li").filter({ hasText: "Bia" })).toContainText("Conectado", { timeout: 15_000 });
    await ana.reload();
    await expect(ana.getByRole("button", { name: "Editar nome: Ana", exact: true })).toBeVisible();
    await expect(ana.getByRole("button", { name: "Trocar personagem" }).getByRole("img")).toHaveAttribute("aria-label", chosenCharacter!);
    await expect(host.locator(".players li")).toHaveCount(2);
    await expect(host.locator(".players li").filter({ hasText: "Ana" })).toContainText("Conectado");

    await map.evaluate(() => document.exitFullscreen());
    await expect(host.locator(".status")).toContainText("Sessão pausada");
    await expect(ana.locator(".status")).toContainText("Jogo pausado");
    await expect(host.getByRole("button", { name: "Retomar sessão" })).toBeDisabled();
    await map.getByRole("button", { name: "Ativar fullscreen" }).click();
    await expect(host.getByRole("button", { name: "Retomar sessão" })).toBeEnabled();
    await expect(bia.locator(".status")).toContainText("Jogo pausado");
    await host.getByRole("button", { name: "Retomar sessão" }).click();
    await expect(bia.locator(".status")).toContainText("Conectado");

    await map.reload();
    await expect(host.locator(".status")).toContainText("Sessão pausada");
    await expect(map.getByRole("heading", { name: "O tabuleiro começa aqui" })).toBeVisible();
    await map.getByRole("button", { name: "Ativar fullscreen" }).click();
    await host.reload();
    await expect(host.getByRole("button", { name: "Retomar sessão" })).toBeEnabled();

    await host.getByRole("button", { name: "Encerrar partida" }).click();
    await host.getByRole("button", { name: "Cancelar", exact: true }).click();
    await expect(host.locator(".status")).toContainText("Sessão pausada");
    await host.getByRole("button", { name: "Encerrar partida" }).click();
    await host.getByRole("button", { name: "Confirmar", exact: true }).click();
    await expect(host.getByRole("button", { name: "Preparar partida" })).toBeVisible();
    await expect(ana.getByRole("heading", { name: "Aguardando o notebook" })).toBeVisible();
    await expect(map.getByRole("heading", { name: "Aguardando o notebook" })).toBeVisible();
  } finally {
    await Promise.all([hostContext.close(), mapContext.close(), anaContext.close(), biaContext.close()]);
  }
});
