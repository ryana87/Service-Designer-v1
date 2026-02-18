#!/usr/bin/env node
// Skip Playwright install on Vercel (not needed for production, and the ~167MB download slows/fails builds)
if (!process.env.VERCEL) {
  require("child_process").execSync("npx playwright install chromium", { stdio: "inherit" });
}
