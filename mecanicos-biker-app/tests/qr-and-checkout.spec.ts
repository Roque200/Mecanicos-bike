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

test.describe("Reservas con código QR y check-in", () => {
  test("agenda una cita, genera un QR y el taller registra la llegada al escanearlo", async ({ page }) => {
    await interceptWindowOpen(page);

    await page.goto("/paquetes", { waitUntil: "networkidle" });
    await page.locator("#contacto").scrollIntoViewIfNeeded();

    const dayButtons = page.locator("#contacto .grid.grid-cols-7 button:not([disabled])");
    await dayButtons.first().click();

    const slotButtons = page.locator("#contacto button:not([disabled])").filter({ hasText: /:00$/ });
    const chosenHourText = await slotButtons.first().textContent();
    await slotButtons.first().click();

    await page.locator("#contacto").getByLabel("Nombre").fill("QR Tester");
    await page.locator("#contacto").getByLabel("Teléfono").fill("5512345678");
    await page.getByRole("button", { name: "Confirmar cita por WhatsApp" }).click();

    await expect(page.getByText(/¡Cita agendada, folio/)).toBeVisible();
    await expect(page.getByAltText("Código QR de tu cita")).toBeVisible();

    const urls = await openedUrls(page);
    expect(urls.some((u) => u.includes("wa.me"))).toBe(true);

    const citaLink = page.getByRole("link", { name: "Ver mi cita" });
    const href = await citaLink.getAttribute("href");
    expect(href).toBeTruthy();
    const token = new URL(href!).pathname.split("/").pop()!;

    // The slot we just took should now show as busy if we reselect the same day.
    await page.getByRole("button", { name: "Agendar otra cita" }).click();
    await dayButtons.first().click();
    const sameSlot = page.locator("#contacto button").filter({ hasText: chosenHourText!.trim() });
    await expect(sameSlot).toBeDisabled();

    // Public confirmation page works on its own.
    await page.goto(`/cita/${token}`, { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "QR Tester" })).toBeVisible();

    // Admin scans (manually enters) the code and checks the customer in.
    await loginAsAdmin(page);
    await page.goto("/admin/escanear", { waitUntil: "networkidle" });
    await page.getByPlaceholder("O pega/escribe el código de la cita").fill(token);
    await page.getByRole("button", { name: "Buscar" }).click();

    await expect(page.getByText("QR Tester")).toBeVisible();
    await page.getByRole("button", { name: "Marcar como recibido" }).click();
    await expect(page.getByText("Ya se registró la llegada.")).toBeVisible();

    await page.goto("/admin/citas", { waitUntil: "networkidle" });
    await page.getByPlaceholder("Buscar cliente…").fill("QR Tester");
    const row = page.locator("table tbody tr").filter({ hasText: "QR Tester" });
    await expect(row).toHaveCount(1);
    await expect(row.getByText("Sí, por QR")).toBeVisible();

    // La reserva ya creó al cliente en automático — todavía sin puntos porque
    // la cita no se ha marcado como completada.
    await page.goto("/admin/clientes", { waitUntil: "networkidle" });
    await page.getByPlaceholder("Buscar por nombre o teléfono…").fill("QR Tester");
    const customerRow = page.locator("table tbody tr").filter({ hasText: "QR Tester" });
    await expect(customerRow).toHaveCount(1);
    await expect(customerRow.locator("td").nth(5)).toHaveText("0");

    // Al completar el servicio se le asignan los puntos según el tipo elegido,
    // y el panel pide cuánto se cobró antes de dejarlo marcar como completada.
    await page.goto("/admin/citas", { waitUntil: "networkidle" });
    await page.getByPlaceholder("Buscar cliente…").fill("QR Tester");
    await page.locator("table tbody tr").filter({ hasText: "QR Tester" }).locator("select").selectOption("completada");
    await page.getByLabel("Monto cobrado (MXN)").fill("450");
    await page.getByRole("button", { name: "Confirmar" }).click();
    await expect(page.getByText("Completar cita")).toBeHidden();

    await page.goto("/admin/clientes", { waitUntil: "networkidle" });
    await page.getByPlaceholder("Buscar por nombre o teléfono…").fill("QR Tester");
    await expect(page.locator("table tbody tr").filter({ hasText: "QR Tester" }).locator("td").nth(5)).not.toHaveText("0");
  });
});

test.describe("Compra en línea y control de inventario", () => {
  test("un pedido por WhatsApp queda registrado y descuenta el inventario", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/productos", { waitUntil: "networkidle" });
    const productRow = page.locator("table tbody tr").filter({ hasText: "Casco MTB ProShield" });
    const stockBefore = Number((await productRow.locator("td").nth(3).innerText()).match(/\d+/)![0]);

    await interceptWindowOpen(page);
    await page.goto("/tienda", { waitUntil: "networkidle" });

    const cascoCard = page.getByTestId("product-PR-01");
    await expect(cascoCard).toContainText("Casco MTB ProShield");
    await cascoCard.getByRole("button", { name: "Agregar" }).click();

    await page.getByLabel("Ver carrito").click();
    const cartPanel = page.getByLabel("Carrito de productos");
    await expect(page.getByRole("heading", { name: "Tu carrito" })).toBeVisible();

    // Mercado Pago isn't configured in this environment, so only the WhatsApp checkout should show.
    await expect(cartPanel.getByRole("button", { name: "Pagar en línea" })).toHaveCount(0);

    await cartPanel.getByLabel("Nombre").fill("Comprador de prueba");
    await cartPanel.getByLabel("Teléfono").fill("5599887766");
    await cartPanel.getByRole("button", { name: "Pedir por WhatsApp" }).click();

    await expect(page.getByRole("heading", { name: "Tu carrito" })).toBeHidden();
    const urls = await openedUrls(page);
    const orderMessage = decodeURIComponent(urls.find((u) => u.includes("wa.me")) ?? "");
    expect(orderMessage).toContain("Casco MTB ProShield");
    const folioMatch = orderMessage.match(/Folio: (P-\d+)/);
    expect(folioMatch).toBeTruthy();
    const orderId = folioMatch![1];

    await page.goto("/admin/pedidos", { waitUntil: "networkidle" });
    const orderToggle = page.locator("button").filter({ hasText: orderId });
    await orderToggle.click();
    await expect(page.getByText("1 × Casco MTB ProShield")).toBeVisible();

    await page.goto("/admin/productos", { waitUntil: "networkidle" });
    const stockAfter = Number(
      (await page
        .locator("table tbody tr")
        .filter({ hasText: "Casco MTB ProShield" })
        .locator("td")
        .nth(3)
        .innerText()).match(/\d+/)![0],
    );
    expect(stockAfter).toBe(stockBefore - 1);
  });
});
