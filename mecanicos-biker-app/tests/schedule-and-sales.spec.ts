import { test, expect, type Page } from "@playwright/test";

async function interceptWindowOpen(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __openedUrls: string[] }).__openedUrls = [];
    window.open = (url?: string | URL) => {
      (window as unknown as { __openedUrls: string[] }).__openedUrls.push(String(url ?? ""));
      return null;
    };
  });
}

async function openedUrls(page: Page): Promise<string[]> {
  return page.evaluate(() => (window as unknown as { __openedUrls: string[] }).__openedUrls);
}

async function loginAsAdmin(page: Page) {
  await page.goto("/admin/login", { waitUntil: "networkidle" });
  await page.getByLabel("Usuario").fill("admin");
  await page.getByLabel("Contraseña").fill("biker2026");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard/);
}

test.describe("Horario controlado por el administrador", () => {
  test("una excepción cerrada en el panel deja ese día sin cupo en el calendario público", async ({ page }) => {
    const now = new Date();
    const target = new Date(now.getFullYear(), now.getMonth() + 1, 15);
    const dateStr = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}-15`;

    await loginAsAdmin(page);
    await page.goto("/admin/horarios", { waitUntil: "networkidle" });
    await page.getByLabel("Fecha").fill(dateStr);
    await page.getByRole("button", { name: "Agregar excepción" }).click();
    await expect(page.getByText(dateStr)).toBeVisible();
    await expect(page.getByText("Cerrado todo el día")).toBeVisible();

    await page.goto("/", { waitUntil: "networkidle" });
    await page.locator("#contacto").scrollIntoViewIfNeeded();
    await page.getByRole("button", { name: "Mes siguiente" }).click();

    const day15 = page.locator("#contacto .grid.grid-cols-7 button").filter({ hasText: /^15$/ });
    await expect(day15).toBeDisabled();
  });
});

test.describe("Calendario de citas y reagendado", () => {
  test("reagendar una cita ofrece notificar al cliente por WhatsApp a su propio número", async ({ page }) => {
    await interceptWindowOpen(page);
    await page.goto("/", { waitUntil: "networkidle" });
    await page.locator("#contacto").scrollIntoViewIfNeeded();

    const dayButtons = page.locator("#contacto .grid.grid-cols-7 button:not([disabled])");
    const dayNumber = (await dayButtons.first().textContent())!.trim();
    await dayButtons.first().click();

    const slotButtons = page.locator("#contacto button:not([disabled])").filter({ hasText: /:00$/ });
    await slotButtons.first().click();

    await page.locator("#contacto").getByLabel("Nombre").fill("Reagenda Test");
    await page.locator("#contacto").getByLabel("Teléfono").fill("5544332211");
    await page.getByRole("button", { name: "Confirmar cita por WhatsApp" }).click();
    await expect(page.getByText(/¡Cita agendada, folio/)).toBeVisible();

    await loginAsAdmin(page);
    await page.goto("/admin/horarios", { waitUntil: "networkidle" });

    const dayCell = page.locator(".grid.grid-cols-7 button").filter({ hasText: new RegExp(`^${dayNumber}$`) });
    await dayCell.click();

    const row = page.getByTestId(/^appt-row-/).filter({ hasText: "Reagenda Test" });
    await row.getByRole("button", { name: "Reagendar" }).click();

    const hourSelect = row.locator("select");
    const options = await hourSelect.locator("option").allTextContents();
    const currentHour = (await row.locator("p").first().textContent())!.split("·")[0].trim();
    const otherHour = options.find((h) => h && h !== currentHour && h !== "Selecciona…");
    await hourSelect.selectOption(otherHour!);
    await row.getByRole("button", { name: "Guardar" }).click();

    await expect(page.getByText("La cita de Reagenda Test cambió. ¿Le avisamos por WhatsApp?")).toBeVisible();
    await page.getByRole("button", { name: "Enviar por WhatsApp" }).click();

    const urls = await openedUrls(page);
    const notifyUrl = urls.find((u) => u.includes("wa.me/525544332211"));
    expect(notifyUrl).toBeTruthy();
    expect(decodeURIComponent(notifyUrl!)).toContain("Reagenda Test");
  });
});

test.describe("Venta de mostrador", () => {
  test("una venta registrada en el panel queda pagada y aparece en pedidos", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/ventas", { waitUntil: "networkidle" });

    await page.getByLabel("Cliente").fill("Venta Mostrador Test");
    await page.getByLabel("Teléfono").fill("5511122233");
    await page.getByLabel("Producto del catálogo").selectOption("PR-01"); // Casco MTB ProShield
    await page.getByRole("button", { name: "Agregar", exact: true }).click();
    await page.getByRole("button", { name: "Registrar venta" }).click();

    await expect(page.getByText(/Venta P-\d+ registrada por/)).toBeVisible();

    await page.goto("/admin/pedidos", { waitUntil: "networkidle" });
    const saleRow = page.locator("button").filter({ hasText: "Venta Mostrador Test" });
    await expect(saleRow).toContainText("Mostrador");
    await expect(saleRow).toContainText("Pagado");
    await saleRow.click();
    await expect(page.getByText("1 × Casco MTB ProShield")).toBeVisible();
  });
});

test.describe("Cotizador de piezas (vista pública)", () => {
  test("el cliente arma una cotización desde Productos y la manda por WhatsApp sin guardarla", async ({ page }) => {
    await interceptWindowOpen(page);
    await page.goto("/", { waitUntil: "networkidle" });
    await page.locator("#productos").scrollIntoViewIfNeeded();

    const cascoCard = page.getByTestId("product-PR-01");
    await cascoCard.getByRole("button", { name: "Cotizar" }).click();

    // Agregar una pieza abre el cotizador solo — no hace falta el botón de la barra.
    const drawer = page.getByRole("complementary", { name: "Cotizador de piezas" });
    await expect(drawer.getByRole("heading", { name: "Cotizar piezas" })).toBeVisible();
    await expect(drawer.getByText("Casco MTB ProShield")).toBeVisible();

    await drawer.getByPlaceholder("Describe la pieza que buscas").fill("Amortiguador trasero marca X");
    await drawer.getByRole("button", { name: "Agregar", exact: true }).click();
    await expect(drawer.getByText("Amortiguador trasero marca X")).toBeVisible();

    await page.getByRole("button", { name: "Enviar cotización por WhatsApp" }).click();
    const urls = await openedUrls(page);
    const message = decodeURIComponent(urls.find((u) => u.includes("wa.me")) ?? "");
    expect(message).toContain("Casco MTB ProShield");
    expect(message).toContain("Amortiguador trasero marca X");

    await expect(page.getByRole("heading", { name: "Cotizar piezas" })).toBeHidden();
  });
});

test.describe("Exportación del corte", () => {
  test("el dashboard genera un CSV descargable para el rango elegido", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/dashboard", { waitUntil: "networkidle" });

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Exportar CSV" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^corte-mecanicos-biker_.*\.csv$/);
  });
});
