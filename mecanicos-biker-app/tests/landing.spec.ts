import { test, expect } from "@playwright/test";

const VIEWPORTS = [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
];

for (const viewport of VIEWPORTS) {
  test.describe(`Mecánicos Bike (Next.js) — ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("carga sin errores, anima y valida las interacciones clave", async ({ page }, testInfo) => {
      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      });
      page.on("pageerror", (err) => pageErrors.push(err.message));

      await page.goto("/", { waitUntil: "load" });

      await expect(page.locator("h1")).toBeVisible();
      await expect(page.locator("h1")).toContainText("mejores manos");

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `Hay ${overflow}px de scroll horizontal en ${viewport.name}`).toBeLessThanOrEqual(1);

      // FAQ accordion
      const secondFaqButton = page.locator("button[aria-expanded]").filter({ hasText: "marcas de bicicleta" });
      await secondFaqButton.scrollIntoViewIfNeeded();
      await secondFaqButton.click();
      await expect(secondFaqButton).toHaveAttribute("aria-expanded", "true");

      // Tienda: filtro de productos + carrito (el carrito persiste entre páginas)
      await page.goto("/tienda", { waitUntil: "load" });
      await page.getByRole("button", { name: "Herramientas" }).click();
      await expect(page.getByText("Multiherramienta 16 en 1")).toBeVisible();
      await expect(page.getByText('Cámara MTB 29"')).toBeHidden();
      await page.getByRole("button", { name: "Todos" }).click();

      const addButtons = page.getByRole("button", { name: "Agregar" });
      await addButtons.first().scrollIntoViewIfNeeded();
      await addButtons.nth(0).click();
      await addButtons.nth(1).click();
      await expect(page.getByLabel("Ver carrito")).toContainText("2");

      await page.getByLabel("Ver carrito").click();
      await expect(page.getByRole("heading", { name: "Tu carrito" })).toBeVisible();
      await expect(page.getByLabel("Carrito de productos").locator("li")).toHaveCount(2);
      await page.getByLabel("Cerrar carrito").click();
      await expect(page.getByRole("heading", { name: "Tu carrito" })).toBeHidden();

      // Paquetes: calendario de citas
      await page.goto("/paquetes", { waitUntil: "load" });
      await page.locator("#contacto").scrollIntoViewIfNeeded();
      // Los días disponibles son botones habilitados dentro de la cuadrícula de 7 columnas.
      const dayButtons = page.locator("#contacto .grid.grid-cols-7 button:not([disabled])");
      await dayButtons.first().click();

      const slotButtons = page.locator("#contacto button:not([disabled])").filter({ hasText: /:00$/ });
      await slotButtons.first().click();

      const submit = page.getByRole("button", { name: "Agendar cita" });
      await expect(submit).toBeEnabled();

      await page.locator("#contacto").getByLabel("Nombre").fill("Rider de prueba");
      await page.locator("#contacto").getByLabel("Teléfono").fill("3312345678");

      await page.addStyleTag({ content: "header { position: absolute !important; }" });
      await page.screenshot({
        path: testInfo.outputPath(`mecanicos-biker-next-${viewport.name}.png`),
        fullPage: true,
      });

      expect(consoleErrors, `Errores de consola: ${consoleErrors.join(", ")}`).toEqual([]);
      expect(pageErrors, `Errores JS: ${pageErrors.join(", ")}`).toEqual([]);
    });
  });
}
