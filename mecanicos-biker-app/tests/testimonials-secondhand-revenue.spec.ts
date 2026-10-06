import path from "node:path";
import { test, expect, type Page } from "@playwright/test";

async function loginAsAdmin(page: Page) {
  await page.goto("/admin/login", { waitUntil: "networkidle" });
  await page.getByLabel("Usuario").fill("admin");
  await page.getByLabel("Contraseña").fill("biker2026");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard/);
}

test.describe("Testimonios", () => {
  test("un testimonio nuevo queda pendiente hasta que el admin lo aprueba", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: "Deja tu testimonio" }).scrollIntoViewIfNeeded();
    await page.getByLabel("Tu nombre").fill("Testimonio Playwright");
    await page.getByLabel("Tu testimonio").fill("Quedé muy contento con el servicio, todo excelente.");
    await page.getByRole("button", { name: "Enviar testimonio" }).click();
    await expect(page.getByText("¡Gracias por tu testimonio!")).toBeVisible();

    // Todavía no debe aparecer públicamente — sigue pendiente de aprobación.
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByText("Testimonio Playwright")).toHaveCount(0);

    await loginAsAdmin(page);
    await page.goto("/admin/testimonios", { waitUntil: "networkidle" });
    const row = page.getByTestId(/^testimonial-row-/).filter({ hasText: "Testimonio Playwright" });
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "Aprobar" }).click();

    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.getByText("Testimonio Playwright")).toBeVisible();
  });
});

test.describe("Segunda mano", () => {
  test("un artículo publicado por el admin aparece en la tienda pública con foto y WhatsApp", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/segunda-mano", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Nuevo artículo" }).click();
    await page.getByLabel("Nombre de la pieza").fill("Suspensión RockShox Recon");
    await page.getByLabel("Descripción").fill("Usada 6 meses, sin fugas, sello nuevo.");
    await page.getByLabel("Estado de la pieza").fill("Usado, buen estado");
    await page.getByLabel("Precio (MXN)").fill("1800");
    await page.locator('input[type="file"]').setInputFiles(path.join(__dirname, "fixtures", "tiny.png"));
    await page.getByRole("button", { name: "Publicar" }).click();
    await expect(page.getByText("Suspensión RockShox Recon")).toBeVisible();

    await page.goto("/tienda", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Segunda mano" }).click();

    const card = page.getByTestId(/^secondhand-/).filter({ hasText: "Suspensión RockShox Recon" });
    await expect(card).toBeVisible();
    await expect(card.locator("img")).toBeVisible();

    const link = card.getByRole("link", { name: "Preguntar" });
    const href = await link.getAttribute("href");
    expect(href).toContain("wa.me");
    expect(decodeURIComponent(href!)).toContain("Suspensión RockShox Recon");
  });
});

test.describe("Ingresos por citas completadas", () => {
  test("completar una cita con un monto lo suma al corte de ese día", async ({ page }) => {
    await page.goto("/paquetes", { waitUntil: "networkidle" });
    await page.locator("#contacto").scrollIntoViewIfNeeded();
    const dayButtons = page.locator("#contacto .grid.grid-cols-7 button:not([disabled])");
    await dayButtons.first().click();
    const slotButtons = page.locator("#contacto button:not([disabled])").filter({ hasText: /:00$/ });
    await slotButtons.first().click();
    await page.locator("#contacto").getByLabel("Nombre").fill("Ingreso Cita Test");
    await page.locator("#contacto").getByLabel("Teléfono").fill("4610001122");
    await page.getByRole("button", { name: "Agendar cita" }).click();
    await expect(page.getByText(/¡Cita agendada, folio/)).toBeVisible();

    await loginAsAdmin(page);
    await page.goto("/admin/citas", { waitUntil: "networkidle" });
    await page.getByPlaceholder("Buscar cliente…").fill("Ingreso Cita Test");
    const row = page.locator("table tbody tr").filter({ hasText: "Ingreso Cita Test" });
    // El dinero cuenta el día en que se cobra (hoy, hora del taller), aunque
    // la cita haya quedado agendada para otro día por falta de cupo.
    const chargedDate = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(new Date());

    await row.locator("select").selectOption("completada");
    await page.getByLabel("Monto cobrado (MXN)").fill("777");
    await page.getByRole("button", { name: "Confirmar" }).click();
    await expect(page.getByText("Completar cita")).toBeHidden();
    await expect(row.locator("td").nth(6)).toHaveText("$777");

    await page.goto("/admin/dashboard", { waitUntil: "networkidle" });
    await page.getByLabel("Desde").fill(chargedDate);
    await page.getByLabel("Hasta").fill(chargedDate);
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Exportar CSV" }).click();
    const download = await downloadPromise;
    const csvPath = await download.path();
    const fs = await import("node:fs/promises");
    const csv = await fs.readFile(csvPath!, "utf-8");
    expect(csv).toContain("Citas completadas");
    expect(csv).toContain("Ingreso Cita Test");
    expect(csv).toContain("777");
  });
});

test.describe("Calendario público — color de sin cupo", () => {
  test("la leyenda de 'Sin cupo' usa el rojo de la paleta, no un gris genérico", async ({ page }) => {
    await page.goto("/paquetes", { waitUntil: "networkidle" });
    await page.locator("#contacto").scrollIntoViewIfNeeded();
    const dot = page.locator("#contacto span").filter({ hasText: "Sin cupo" }).locator("span").first();
    const color = await dot.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(color).toBe("rgb(226, 63, 54)");
  });
});

test.describe("Edición de productos", () => {
  test("editar el stock y la alerta de bajo stock persiste tras recargar", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/productos", { waitUntil: "networkidle" });
    const row = page.locator("table tbody tr").filter({ hasText: "Guantes ReinforceGrip" });
    await row.getByLabel(/Editar/).click();
    await page.getByLabel("Stock", { exact: true }).fill("9");
    await page.getByLabel(/Alertar cuando/).fill("12");
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(row.locator("td").nth(3)).toHaveText("9 pzas");

    await page.reload({ waitUntil: "networkidle" });
    const reloadedRow = page.locator("table tbody tr").filter({ hasText: "Guantes ReinforceGrip" });
    await expect(reloadedRow.locator("td").nth(3)).toHaveText("9 pzas");
    // 9 <= 12 debe mostrar el badge de bajo stock.
    await expect(reloadedRow.locator("td").nth(3).locator("span")).toHaveClass(/text-red-600/);
  });
});
