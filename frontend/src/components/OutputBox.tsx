import { useState } from "react";
import { jsPDF } from "jspdf";
import type { ComplaintResponse } from "../api";

type OutputBoxProps = {
  output: ComplaintResponse | null;
  error: string | null;
};

type ParsedComplaint = {
  subject: string;
  body: string;
};

const FONT_URLS = {
  notoSans: "https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSans/NotoSans-Regular.ttf",
  notoSansKannada:
    "https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSansKannada/NotoSansKannada-Regular.ttf",
  notoSansDevanagari:
    "https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSansDevanagari/NotoSansDevanagari-Regular.ttf",
};

const FONT_CACHE: Record<string, string | null> = {
  notoSans: null,
  notoSansKannada: null,
  notoSansDevanagari: null,
};

function hasKannada(text: string): boolean {
  return /[\u0C80-\u0CFF]/.test(text);
}

function hasDevanagari(text: string): boolean {
  return /[\u0900-\u097F]/.test(text);
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

async function loadFontBase64(url: string, key: keyof typeof FONT_CACHE): Promise<string> {
  if (FONT_CACHE[key]) {
    return FONT_CACHE[key] as string;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load font from ${url}`);
  }

  const buffer = await response.arrayBuffer();
  const base64 = arrayBufferToBase64(buffer);
  FONT_CACHE[key] = base64;
  return base64;
}

async function registerUnicodeFont(doc: jsPDF, text: string): Promise<string> {
  if (hasKannada(text)) {
    const base64 = await loadFontBase64(FONT_URLS.notoSansKannada, "notoSansKannada");
    doc.addFileToVFS("NotoSansKannada-Regular.ttf", base64);
    doc.addFont("NotoSansKannada-Regular.ttf", "NotoSansKannada", "normal");
    return "NotoSansKannada";
  }

  if (hasDevanagari(text)) {
    const base64 = await loadFontBase64(FONT_URLS.notoSansDevanagari, "notoSansDevanagari");
    doc.addFileToVFS("NotoSansDevanagari-Regular.ttf", base64);
    doc.addFont("NotoSansDevanagari-Regular.ttf", "NotoSansDevanagari", "normal");
    return "NotoSansDevanagari";
  }

  const base64 = await loadFontBase64(FONT_URLS.notoSans, "notoSans");
  doc.addFileToVFS("NotoSans-Regular.ttf", base64);
  doc.addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
  return "NotoSans";
}

function cleanComplaintText(rawText: string): string {
  const normalized = rawText.replace(/\r\n/g, "\n");
  const compactedSpaces = normalized
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .join("\n");

  const dedupedLines: string[] = [];
  for (const line of compactedSpaces.split("\n")) {
    if (!line) {
      if (dedupedLines.length === 0 || dedupedLines[dedupedLines.length - 1] === "") {
        continue;
      }
      dedupedLines.push("");
      continue;
    }

    if (dedupedLines[dedupedLines.length - 1] !== line) {
      dedupedLines.push(line);
    }
  }

  return dedupedLines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function parseComplaintText(output: ComplaintResponse): ParsedComplaint {
  const raw = cleanComplaintText(output.final_output || "");
  if (!raw) {
    return {
      subject: "Subject: Complaint",
      body: "",
    };
  }

  const lines = raw.split("\n").filter((line) => line.trim().length > 0);
  const subject = lines[0] || `Subject: ${output.complaint_type} issue`;
  const body = lines.slice(1).join("\n").trim();
  return { subject, body };
}

function buildFormattedComplaint(parsed: ParsedComplaint): string {
  const body = parsed.body ? `\n\n${parsed.body}` : "";
  return `${parsed.subject}${body}`.trim();
}

async function downloadPDF(text: string): Promise<void> {
  const cleaned = cleanComplaintText(text);
  if (!cleaned) {
    return;
  }

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = pageWidth - margin * 2;
  const lineHeight = 18;
  let y = margin + 8;

  const lines = cleaned.split("\n").filter((line) => line.trim().length > 0);
  const subject = lines[0] || "Subject: Complaint";
  const bodyText = lines.slice(1).join("\n").trim();
  const fontName = await registerUnicodeFont(doc, cleaned);

  const addWrappedLines = (wrappedLines: string[]) => {
    for (const line of wrappedLines) {
      if (y + lineHeight > pageHeight - margin) {
        doc.addPage();
        y = margin + 8;
      }
      doc.text(line, margin, y, { align: "left" });
      y += lineHeight;
    }
  };

  doc.setFont(fontName, "normal");
  doc.setFontSize(14);
  const subjectLines = doc.splitTextToSize(subject, maxWidth) as string[];
  addWrappedLines(subjectLines);

  if (bodyText) {
    y += 8;
    doc.setFont(fontName, "normal");
    doc.setFontSize(12);
    const bodyLines = doc.splitTextToSize(bodyText, maxWidth) as string[];
    addWrappedLines(bodyLines);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  doc.save(`complaint_${timestamp}.pdf`);
}

export default function OutputBox({ output, error }: OutputBoxProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const parsed = output ? parseComplaintText(output) : null;
  const formattedComplaint = parsed ? buildFormattedComplaint(parsed) : "";
  const hasDownloadContent = Boolean(formattedComplaint.trim().length > 0) && !isDownloading;

  const handleDownload = async () => {
    if (!hasDownloadContent) {
      return;
    }

    try {
      setIsDownloading(true);
      await downloadPDF(formattedComplaint);
    } catch (downloadError) {
      console.error("Failed to generate PDF", downloadError);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="rounded-2xl bg-gray-800/80 p-6 shadow-card ring-1 ring-gray-700">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-white">Processed Output</h2>
        <button
          type="button"
          onClick={handleDownload}
          disabled={!hasDownloadContent}
          className="rounded-lg bg-gray-700 px-3 py-2 text-sm font-medium text-gray-100 transition hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isDownloading ? "Preparing PDF..." : "Download PDF"}
        </button>
      </div>

      {!output && !error && (
        <p className="mt-3 text-sm text-gray-400">
          Submit a complaint to view detected language, complaint type, location, and final translated complaint.
        </p>
      )}

      {error && (
        <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {output && parsed && (
        <div className="mt-4 space-y-3 text-sm text-gray-200">
          <p>
            <span className="font-semibold text-gray-100">Detected Language:</span>{" "}
            {output.detected_language}
          </p>
          <p>
            <span className="font-semibold text-gray-100">Complaint Type:</span>{" "}
            {output.complaint_type}
          </p>
          <p>
            <span className="font-semibold text-gray-100">Location:</span> {output.location}
          </p>

          <div className="rounded-xl p-5 bg-gray-800 text-gray-100 ring-1 ring-gray-700">
            <p className="text-base font-semibold leading-relaxed">{parsed.subject}</p>
            <p className="mt-4 whitespace-pre-line leading-relaxed">{parsed.body}</p>
          </div>
        </div>
      )}
    </div>
  );
}
