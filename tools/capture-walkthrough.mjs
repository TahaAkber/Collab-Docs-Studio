import path from "path";
import fs from "fs/promises";
import { pathToFileURL } from "url";

const projectRoot = process.cwd();
const outputDir = path.join(projectRoot, "walkthrough-assets");
await fs.mkdir(outputDir, { recursive: true });
const playwrightPath = process.env.PLAYWRIGHT_MODULE;
if (!playwrightPath) throw new Error("PLAYWRIGHT_MODULE is required");

const { chromium } = await import(pathToFileURL(playwrightPath).href);
const browser = await chromium.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await context.newPage();
const baseUrl = "https://web-production-c5c4e.up.railway.app";

async function shot(name) {
  await page.screenshot({ path: path.join(outputDir, name), fullPage: false });
}

await page.goto(baseUrl, { waitUntil: "networkidle" });
await shot("01-login.png");

await page.getByLabel("Email").fill("maya@acme.dev");
await page.getByLabel("Password").fill("DemoPass123");
await page.getByRole("button", { name: "Log in" }).click();
await page.getByText("Your documents").waitFor();
await shot("02-dashboard.png");

await page.getByRole("button", { name: /New document/ }).click();
await page.waitForTimeout(800);
await page.getByLabel("Document title").fill("Walkthrough product brief");
const editor = page.getByLabel("Document content");
await editor.click();
await page.keyboard.press("Control+A");
await page.keyboard.type("Reviewer-ready collaboration");
await page.getByTitle("Bold").click();
await page.keyboard.press("End");
await page.keyboard.type(" with secure sharing");
await page.getByTitle("Bold").click();
await page.getByRole("button", { name: "Save" }).click();
await page.getByText("Saved.").waitFor();
await shot("03-editing.png");

const alexOption = page.locator("select").filter({ has: page.locator('option[value=""]') }).first();
const alexValue = await alexOption.locator("option").filter({ hasText: "Alex" }).getAttribute("value");
await alexOption.selectOption(alexValue);
await page.getByRole("button", { name: "Grant access" }).click();
await page.getByText("Access granted.").waitFor();
await shot("04-sharing.png");

await page.locator('input[type="file"]').setInputFiles(path.join(projectRoot, "walkthrough-import.md"));
await page.getByRole("button", { name: "Import into document" }).click();
await page.getByText("File imported into the document.").waitFor();
await shot("05-import.png");

await page.getByRole("button", { name: "Log out" }).click();
await page.getByLabel("Email").fill("alex@acme.dev");
await page.getByLabel("Password").fill("DemoPass123");
await page.getByRole("button", { name: "Log in" }).click();
await page.getByText("Shared by Maya").first().click();
await shot("06-shared-user.png");

await page.setContent(`<!doctype html><style>body{margin:0;background:#eef3f9;font-family:Inter,Arial;color:#122033}.slide{padding:70px 90px}.tag{color:#2563eb;font-weight:700;text-transform:uppercase;letter-spacing:2px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:24px;margin:48px 0}.card{background:white;border-radius:18px;padding:26px;box-shadow:0 12px 30px #0f172a18}.arrow{text-align:center;font-size:28px;color:#2563eb}h1{font-size:52px;margin:12px 0}h2{font-size:24px}p,li{font-size:20px;line-height:1.5}.footer{background:#0f172a;color:white;border-radius:18px;padding:24px 30px}</style><div class="slide"><div class="tag">Architecture</div><h1>One coherent full-stack service</h1><div class="grid"><div class="card"><h2>React + Vite</h2><p>Auth, workspace, editor, upload and sharing UI</p></div><div class="card"><h2>Express API</h2><p>Validation, sessions and authorization</p></div><div class="card"><h2>Prisma + SQLite</h2><p>Users, documents, shares and imports</p></div><div class="card"><h2>Railway</h2><p>Node runtime plus persistent /data volume</p></div></div><div class="footer"><strong>Deprioritized:</strong> real-time cursors, conflict resolution, comments, history, email invitations, granular roles and DOCX.</div></div>`);
await shot("07-architecture.png");

await page.setContent(`<!doctype html><style>body{margin:0;background:#0f172a;font-family:Inter,Arial;color:white}.slide{padding:70px 90px}.tag{color:#60a5fa;font-weight:700;text-transform:uppercase;letter-spacing:2px}h1{font-size:52px;margin:12px 0 35px}.cols{display:grid;grid-template-columns:1fr 1fr;gap:28px}.card{background:#1e293b;border:1px solid #334155;border-radius:18px;padding:28px}h2{color:#93c5fd;font-size:26px}li{font-size:20px;line-height:1.65}</style><div class="slide"><div class="tag">AI-native workflow</div><h1>Accelerated by AI, verified by evidence</h1><div class="cols"><div class="card"><h2>AI materially accelerated</h2><ul><li>Cross-layer requirement audit</li><li>Auth, authorization and UX implementation</li><li>Test and deployment iteration</li></ul></div><div class="card"><h2>Reviewed and corrected</h2><ul><li>Session-derived identity</li><li>Owner-only sharing</li><li>Safe text import</li><li>Railway build-log diagnosis</li></ul></div><div class="card"><h2>Verification</h2><ul><li>Prisma schema validation</li><li>4 automated API tests</li><li>Production build</li><li>Live Railway smoke tests</li></ul></div><div class="card"><h2>Outcome</h2><ul><li>Usable end-to-end product</li><li>Persistent live deployment</li><li>Documented tradeoffs</li></ul></div></div></div>`);
await shot("08-ai-workflow.png");

await browser.close();
