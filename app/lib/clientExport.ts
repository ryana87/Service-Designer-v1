"use client";

import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

export type ExportFormat = "pdf" | "png" | "jpg";

export async function captureElement(
  element: HTMLElement,
  format: ExportFormat
): Promise<Blob> {
  const canvas = await html2canvas(element, {
    useCORS: true,
    allowTaint: true,
    scale: 2,
    logging: false,
    backgroundColor: "#ffffff",
  });

  if (format === "pdf") {
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a2",
    });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
    const imgX = (pdfWidth - imgWidth * ratio) / 2;
    const imgY = 0;
    pdf.addImage(imgData, "PNG", imgX, imgY, imgWidth * ratio, imgHeight * ratio);
    return pdf.output("blob");
  }

  const mimeType = format === "jpg" ? "image/jpeg" : "image/png";
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Failed to create blob"))),
      mimeType,
      format === "jpg" ? 0.9 : undefined
    );
  });
}

export async function captureFromUrl(
  url: string,
  format: ExportFormat
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:absolute;width:3840px;height:2160px;left:-9999px;top:0;visibility:hidden;";
    document.body.appendChild(iframe);

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Export timeout - page took too long to load"));
    }, 30000);

    const cleanup = () => {
      clearTimeout(timeout);
      document.body.removeChild(iframe);
    };

    iframe.onload = async () => {
      try {
        const doc = iframe.contentDocument;
        if (!doc || !doc.body) {
          cleanup();
          reject(new Error("Could not access iframe content"));
          return;
        }

        // Wait for content to render
        await new Promise((r) => setTimeout(r, 2000));

        // Find main content - try common selectors
        const main = doc.querySelector("main") || doc.querySelector("[role='main']") || doc.body;
        const blob = await captureElement(main as HTMLElement, format);
        cleanup();
        resolve(blob);
      } catch (err) {
        cleanup();
        reject(err);
      }
    };

    iframe.onerror = () => {
      cleanup();
      reject(new Error("Failed to load page for export"));
    };

    iframe.src = url;
  });
}
