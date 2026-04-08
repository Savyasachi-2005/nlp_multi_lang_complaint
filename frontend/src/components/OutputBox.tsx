import { useState } from "react";
import { jsPDF } from "jspdf";
import type { ClassifierMetrics, ComplaintResponse } from "../api";

type OutputBoxProps = {
  output: ComplaintResponse | null;
  error: string | null;
  metrics: ClassifierMetrics | null;
};

type ParsedComplaint = {
  subject: string;
  body: string;
};

const FONT_URLS = {
  notoSans:
    "https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSans/NotoSans-Regular.ttf",
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

async function loadFontBase64(
  url: string,
  key: keyof typeof FONT_CACHE,
): Promise<string> {
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
    const base64 = await loadFontBase64(
      FONT_URLS.notoSansKannada,
      "notoSansKannada",
    );
    doc.addFileToVFS("NotoSansKannada-Regular.ttf", base64);
    doc.addFont("NotoSansKannada-Regular.ttf", "NotoSansKannada", "normal");
    doc.addFont("NotoSansKannada-Regular.ttf", "NotoSansKannada", "bold");
    return "NotoSansKannada";
  }

  if (hasDevanagari(text)) {
    const base64 = await loadFontBase64(
      FONT_URLS.notoSansDevanagari,
      "notoSansDevanagari",
    );
    doc.addFileToVFS("NotoSansDevanagari-Regular.ttf", base64);
    doc.addFont(
      "NotoSansDevanagari-Regular.ttf",
      "NotoSansDevanagari",
      "normal",
    );
    doc.addFont(
      "NotoSansDevanagari-Regular.ttf",
      "NotoSansDevanagari",
      "bold",
    );
    return "NotoSansDevanagari";
  }

  const base64 = await loadFontBase64(FONT_URLS.notoSans, "notoSans");
  doc.addFileToVFS("NotoSans-Regular.ttf", base64);
  doc.addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
  doc.addFont("NotoSans-Regular.ttf", "NotoSans", "bold");
  return "NotoSans";
}

function parseSectionParagraph(
  paragraph: string,
): { heading: string; content: string } | null {
  const trimmed = paragraph.trim();
  if (!trimmed) {
    return null;
  }

  const match = trimmed.match(/^([^:\n]{1,28}:)\s*(.*)$/u);
  if (!match) {
    return null;
  }

  const heading = match[1].trim();
  const content = (match[2] || "").trim();
  return { heading, content };
}

function cleanComplaintText(rawText: string): string {
  return rawText
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitLongBlockToParagraphs(text: string): string {
  return text
    .replace(/([.!?\u0964])\s+/g, "$1\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseComplaintText(output: ComplaintResponse): ParsedComplaint {
  const raw = cleanComplaintText(output.final_output || "");
  if (!raw) {
    return {
      subject: "Subject: Complaint",
      body: "",
    };
  }

  const lines = raw.split("\n");
  const firstContentIndex = lines.findIndex((line) => line.trim().length > 0);

  if (firstContentIndex === -1) {
    return {
      subject: `Subject: ${output.complaint_type} issue`,
      body: "",
    };
  }

  let subject = lines[firstContentIndex].trim();
  let body = lines.slice(firstContentIndex + 1).join("\n").trim();

  // Fallback for providers that return a single long translated paragraph.
  if (!body && subject.length > 120) {
    body = splitLongBlockToParagraphs(subject);
    subject = `Subject: ${output.complaint_type} complaint`;
  }

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

  const lines = cleaned.split("\n");
  const firstContentIndex = lines.findIndex((line) => line.trim().length > 0);
  const subject =
    firstContentIndex >= 0 ? lines[firstContentIndex].trim() : "Subject: Complaint";

  const bodyText =
    firstContentIndex >= 0
      ? lines.slice(firstContentIndex + 1).join("\n").trim()
      : "";

  const paragraphs = bodyText
    .split(/\n\s*\n/g)
    .map((para) => para.trim())
    .filter(Boolean);

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

  if (paragraphs.length > 0) {
    y += 12;
    doc.setFont(fontName, "normal");
    doc.setFontSize(12);
    for (const paragraph of paragraphs) {
      const section = parseSectionParagraph(paragraph);

      if (section) {
        doc.setFont(fontName, "bold");
        const headingLines = doc.splitTextToSize(section.heading, maxWidth) as string[];
        addWrappedLines(headingLines);

        if (section.content) {
          y += 2;
          doc.setFont(fontName, "normal");
          const contentLines = doc.splitTextToSize(
            section.content,
            maxWidth - 10,
          ) as string[];

          for (const line of contentLines) {
            if (y + lineHeight > pageHeight - margin) {
              doc.addPage();
              y = margin + 8;
            }
            doc.text(line, margin + 10, y, { align: "left" });
            y += lineHeight;
          }
        }
      } else {
        doc.setFont(fontName, "normal");
        const wrapped = doc.splitTextToSize(paragraph, maxWidth) as string[];
        addWrappedLines(wrapped);
      }

      y += 10;
    }
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  doc.save(`complaint_${timestamp}.pdf`);
}

export default function OutputBox({ output, error, metrics }: OutputBoxProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const parsed = output ? parseComplaintText(output) : null;
  const formattedComplaint = parsed ? buildFormattedComplaint(parsed) : "";
  const hasDownloadContent =
    Boolean(formattedComplaint.trim().length > 0) && !isDownloading;

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
    <div className="glass-card rounded-3xl p-6 md:p-7">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-[#ebfffa]">
            Processed Output
          </h2>
          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[#89b8b1]">
            Result Panel
          </p>
        </div>
        <button
          type="button"
          onClick={handleDownload}
          disabled={!hasDownloadContent}
          className="rounded-xl border border-teal-200/30 bg-teal-300/10 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-teal-50 transition hover:bg-teal-300/20 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {isDownloading ? "Preparing PDF..." : "Download PDF"}
        </button>
      </div>

      {!output && !error && (
        <p className="mt-5 rounded-2xl border border-dashed border-teal-100/25 bg-[#07171f]/80 p-4 text-sm leading-relaxed text-[#a8c7c2]">
          Submit a complaint to view detected language, complaint category,
          extracted location, and final translated complaint.
        </p>
      )}

      {metrics && (
        <div className="mt-5 rounded-2xl border border-teal-100/20 bg-[#06161d] p-4 text-xs text-[#b5d9d3]">
          <p className="uppercase tracking-[0.16em] text-[#7baaa3]">
            Classifier Metrics
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full border border-emerald-200/35 bg-emerald-300/10 px-3 py-1 text-emerald-100">
              Accuracy: {metrics.accuracy.toFixed(2)}
            </span>
            <span className="rounded-full border border-cyan-200/35 bg-cyan-300/10 px-3 py-1 text-cyan-100">
              Precision: {metrics.precision.toFixed(2)}
            </span>
            <span className="rounded-full border border-amber-200/35 bg-amber-300/10 px-3 py-1 text-amber-100">
              Recall: {metrics.recall.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-5 rounded-2xl border border-red-300/40 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {output && parsed && (
        <div className="mt-5 space-y-4 text-sm text-[#dbf3ef]">
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-teal-200/35 bg-teal-300/15 px-3 py-1">
              Language: {output.detected_language}
            </span>
            <span className="rounded-full border border-amber-200/35 bg-amber-200/10 px-3 py-1 text-amber-50">
              Type: {output.complaint_type}
            </span>
            <span className="rounded-full border border-sky-200/35 bg-sky-200/10 px-3 py-1 text-sky-50">
              Location: {output.location}
            </span>
          </div>

          <div className="rounded-2xl border border-teal-100/20 bg-[#06161d] p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-[#7baaa3]">
              Formatted Complaint
            </p>
            <p className="mt-3 text-base font-semibold leading-relaxed text-[#f0fffb]">
              {parsed.subject}
            </p>
            <p className="mt-4 whitespace-pre-line leading-relaxed text-[#cbe4e0]">
              {parsed.body}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
