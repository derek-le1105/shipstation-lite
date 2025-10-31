import { clsx, type ClassValue } from "clsx";
import { PDFDocument } from "pdf-lib";
import { twMerge } from "tailwind-merge";
import Papa from "papaparse";
import * as XLSX from "xlsx";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// This check can be removed, it is just for tutorial purposes
export const hasEnvVars =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const printLabels = async (pdfValues: string[]) => {
  try {
    const pdfDocs = await Promise.all(
      pdfValues.map(async (pdfBase64) => {
        const byteCharacters = atob(pdfBase64);
        const byteNumbers = new Array(byteCharacters.length)
          .fill(0)
          .map((_, i) => byteCharacters.charCodeAt(i));
        const byteArray = new Uint8Array(byteNumbers);
        return PDFDocument.load(byteArray);
      })
    );

    const mergedPdf = await PDFDocument.create();
    for (const pdfDoc of pdfDocs) {
      const copiedPages = await mergedPdf.copyPages(
        pdfDoc,
        pdfDoc.getPageIndices()
      );
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    }

    const mergedPdfBytes = await mergedPdf.save();
    const blob = new Blob([new Uint8Array(mergedPdfBytes)], {
      type: "application/pdf",
    });
    const blobUrl = URL.createObjectURL(blob);
    const printWindow = window.open(blobUrl);
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  } catch (error) {
    console.error("Error printing labels:", error);
  }
};

export function formatDollarPercent(
  value: number,
  unit: "dollars" | "percent"
) {
  return unit === "dollars"
    ? Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(value)
    : `${value?.toFixed(2)}%`;
}

export function isDeploymentDevelopment() {
  return process.env.NEXT_PUBLIC_DEPLOYMENT === "development";
}

export function formatPhoneNumber(phoneNumber: string) {
  // Remove all non-digit characters
  const cleaned = ("" + phoneNumber).replace(/\D/g, "");
  const match = cleaned.match(/^1?(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  return phoneNumber;
}

export function exportToCSV<T>(dataToExport: T[]) {
  const csv = Papa.unparse(dataToExport, {
    header: true,
  });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `labels-export-${new Date().toISOString().split("T")[0]}.csv`
  );
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToExcel<T>(dataToExport: T[]) {
  const worksheet = XLSX.utils.json_to_sheet(dataToExport);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "Payments");

  const cols = [
    { wch: 10 },
    { wch: 20 },
    { wch: 15 },
    { wch: 25 },
    { wch: 15 },
  ];

  worksheet["!cols"] = cols;

  XLSX.writeFile(
    workbook,
    `labels-export-${new Date().toISOString().split("T")[0]}.xlsx`
  );
}

export function exportToJson<T>(dataToExport: T[]) {
  const json = JSON.stringify(dataToExport, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `labels-export-${new Date().toISOString().split("T")[0]}.json`
  );
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
