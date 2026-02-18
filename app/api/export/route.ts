import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import { prisma } from "@/app/lib/db";
import archiver from "archiver";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function launchBrowser() {
  try {
    const { chromium } = await import("playwright");
    return await chromium.launch({ headless: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const needsInstall =
      msg.includes("Executable doesn't exist") ||
      msg.includes("chromium") ||
      msg.includes("Could not find browser");
    if (needsInstall) {
      try {
        const projectRoot = process.cwd();
        execSync("npx playwright install chromium", {
          cwd: projectRoot,
          stdio: "pipe",
          timeout: 120000,
        });
        const { chromium } = await import("playwright");
        return await chromium.launch({ headless: true });
      } catch (installErr) {
        console.error("Playwright install failed:", installErr);
        throw new Error(
          "Export requires Playwright Chromium. Run in terminal: npx playwright install chromium"
        );
      }
    }
    throw err;
  }
}

type ExportItem = {
  id: string;
  type: "journeyMap" | "blueprint" | "persona";
  name: string;
};

type ExportRequest = {
  projectId: string;
  items: ExportItem[];
  format: "pdf" | "png" | "jpg";
  mode: "combined" | "separate";
};

export async function POST(request: NextRequest) {
  try {
    const body: ExportRequest = await request.json();
    const { projectId, items, format, mode } = body;

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "No items selected for export" },
        { status: 400 }
      );
    }

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const browser = await launchBrowser();
    const context = await browser.newContext({
      viewport: { width: 3840, height: 2160 }, // Larger viewport for wide content
      deviceScaleFactor: 2, // High DPI for quality
    });

    const exports: Array<{ name: string; buffer: Buffer }> = [];

    // Get the base URL from the request
    const protocol = request.headers.get("x-forwarded-proto") || "http";
    const host = request.headers.get("host") || "localhost:3000";
    const baseUrl = `${protocol}://${host}`;

    for (const item of items) {
      const page = await context.newPage();

      // Construct the URL for this item
      let url = `${baseUrl}/projects/${projectId}`;
      if (item.type === "journeyMap") {
        url += `/journey-maps/${item.id}`;
      } else if (item.type === "blueprint") {
        url += `/blueprints/${item.id}`;
      }
      // For personas, we'll just use project page for now

      console.log(`Exporting ${item.type}: ${item.name} from ${url}`);

      try {
        // Navigate to the page
        await page.goto(url, {
          waitUntil: "networkidle",
          timeout: 30000,
        });

        // Wait for content to be rendered
        await sleep(2000);

        // Hide sidebars and unnecessary UI elements for export
        await page.evaluate(() => {
          // Hide all buttons in headers
          const headers = document.querySelectorAll('header');
          headers.forEach((header) => {
            const buttons = header.querySelectorAll('button');
            buttons.forEach((btn) => {
              if (btn instanceof HTMLElement) {
                btn.style.display = "none";
              }
            });
          });

          // Hide all fixed/absolute positioned elements (AI button, floating controls)
          const allElements = document.querySelectorAll('*');
          allElements.forEach((el) => {
            if (el instanceof HTMLElement) {
              const style = window.getComputedStyle(el);
              if (style.position === 'fixed' || style.position === 'absolute') {
                // Check if it's a button or has certain characteristics of UI chrome
                const isButton = el.tagName === 'BUTTON';
                const hasZIndex = parseInt(style.zIndex || '0') > 10;
                const isFab = el.classList.contains('fab') || 
                             el.classList.contains('floating') ||
                             style.bottom !== 'auto' && style.right !== 'auto';
                
                if (isButton || (hasZIndex && isFab)) {
                  el.style.display = "none";
                }
              }
            }
          });

          // Hide any element specifically marked for export hiding
          const markedElements = document.querySelectorAll('[data-export-hide="true"]');
          markedElements.forEach((el) => {
            if (el instanceof HTMLElement) {
              el.style.display = "none";
            }
          });

          // Hide sidebars and navigation
          const sidebars = document.querySelectorAll('aside, nav, .ai-sidebar, .project-sidebar');
          sidebars.forEach((el) => {
            if (el instanceof HTMLElement) {
              el.style.display = "none";
            }
          });

          // Adjust main content to full width and remove overflow constraints
          const main = document.querySelector("main");
          if (main instanceof HTMLElement) {
            main.style.marginLeft = "0";
            main.style.marginRight = "0";
            main.style.width = "100%";
            main.style.maxWidth = "none";
            main.style.overflow = "visible";
          }

          // Ensure body allows full width
          document.body.style.minWidth = "max-content";
          document.body.style.overflow = "visible";
        });

        // Wait a bit for layout adjustments
        await sleep(1000);

        let buffer: Buffer;

        if (format === "pdf") {
          // For PDF, use A2 format for larger blueprints/maps
          buffer = await page.pdf({
            format: "A2",
            landscape: true,
            printBackground: true,
            margin: {
              top: "20px",
              right: "20px",
              bottom: "20px",
              left: "20px",
            },
          });
        } else {
          // PNG or JPG
          const screenshot = await page.screenshot({
            fullPage: true,
            type: format === "jpg" ? "jpeg" : "png",
            quality: format === "jpg" ? 90 : undefined, // JPG quality (0-100)
          });
          buffer = Buffer.from(screenshot);
        }

        const sanitizedName = item.name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
        const extension = format === "pdf" ? "pdf" : format === "jpg" ? "jpg" : "png";
        exports.push({
          name: `${sanitizedName}.${extension}`,
          buffer,
        });

        await page.close();
      } catch (error) {
        console.error(`Error exporting ${item.name}:`, error);
        await page.close();
        throw error;
      }
    }

    await browser.close();

    // If only one item, return single file
    if (exports.length === 1) {
      const firstExport = exports[0];
      const contentType = 
        format === "pdf" ? "application/pdf" : 
        format === "jpg" ? "image/jpeg" : 
        "image/png";
      return new NextResponse(new Uint8Array(firstExport.buffer), {
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `attachment; filename="${firstExport.name}"`,
        },
      });
    }

    // If combined mode for PDF, merge PDFs (for now, just return first - TODO: implement pdf-lib merge)
    if (mode === "combined" && format === "pdf" && exports.length > 1) {
      // TODO: Use pdf-lib to properly merge multiple PDFs
      const firstExport = exports[0];
      return new NextResponse(new Uint8Array(firstExport.buffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="combined-export-${Date.now()}.pdf"`,
        },
      });
    }

    // Multiple items in separate mode - create a ZIP
    const archive = archiver("zip", { zlib: { level: 9 } });
    const chunks: Buffer[] = [];

    // Set up all event listeners BEFORE adding files or finalizing
    const zipPromise = new Promise<Buffer>((resolve, reject) => {
      archive.on("data", (chunk) => chunks.push(chunk));
      archive.on("end", () => {
        console.log("Archive finished");
        resolve(Buffer.concat(chunks));
      });
      archive.on("error", (err) => {
        console.error("Archive error:", err);
        reject(err);
      });
    });

    // Add all files to the archive
    for (const exp of exports) {
      archive.append(exp.buffer, { name: exp.name });
    }

    // Finalize the archive
    await archive.finalize();

    // Wait for all chunks to be collected
    const zipBuffer = await zipPromise;

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="export-${Date.now()}.zip"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    const message = error instanceof Error ? error.message : "Export failed. Please try again.";
    const isPlaywrightError =
      message.includes("Executable doesn't exist") ||
      message.includes("chromium") ||
      message.includes("Playwright");
    const userMessage = isPlaywrightError
      ? "Export requires Playwright Chromium. Run in terminal: npx playwright install chromium"
      : message;
    return NextResponse.json({ error: userMessage }, { status: 500 });
  }
}
