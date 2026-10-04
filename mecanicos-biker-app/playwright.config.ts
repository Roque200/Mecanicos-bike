import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  // The app persists to a real Postgres database shared by every test,
  // instead of in-memory mock data reset per page load — run serially so
  // booking and admin-mutation tests can't race each other over the same rows.
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:4175",
    // Los clientes y el taller están en México; el servidor de pruebas, como
    // Vercel, corre en UTC — así se cubre el mismo desfase que en producción.
    timezoneId: "America/Mexico_City",
    trace: "off",
    screenshot: "off",
    launchOptions: {
      executablePath: "/opt/pw-browsers/chromium",
    },
  },
  webServer: {
    // Start from a freshly seeded database on every test run. Requires
    // DATABASE_URL to point at a disposable test/dev Postgres — never run
    // this against a production database.
    command: "node scripts/reset-test-db.mjs && npm run start -- -p 4175",
    url: "http://127.0.0.1:4175",
    reuseExistingServer: false,
    timeout: 60000,
  },
});
