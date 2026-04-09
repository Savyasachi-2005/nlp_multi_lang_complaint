import { useState } from "react";
import type { jsPDF } from "jspdf";
import type { ComplaintResponse } from "../api";

type OutputBoxProps = {
  output: ComplaintResponse | null;
  error: string | null;
  loading: boolean;
  onRetry: () => void;
  onRegenerate: () => void;
};

type ParsedComplaint = {
  subject: string;
  body: string;
};

type LetterMeta = {
  complaintType?: string;
  location?: string;
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
    return "NotoSansDevanagari";
  }

  const base64 = await loadFontBase64(FONT_URLS.notoSans, "notoSans");
  doc.addFileToVFS("NotoSans-Regular.ttf", base64);
  doc.addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
  return "NotoSans";
}

function toSentenceCase(text: string): string {
  if (!text) {
    return "";
  }

  return text.charAt(0).toUpperCase() + text.slice(1);
}

function normalizeSubject(rawSubject: string, meta?: LetterMeta): string {
  const subjectWithoutPrefix = rawSubject
    .replace(/^subject\s*:\s*/i, "")
    .trim();
  if (subjectWithoutPrefix) {
    return subjectWithoutPrefix;
  }

  const typePart = meta?.complaintType
    ? `${toSentenceCase(meta.complaintType)} issue`
    : "Public grievance";
  const locationPart = meta?.location ? ` at ${meta.location}` : "";
  return `${typePart}${locationPart}`;
}

function splitBodyParagraphs(body: string): string[] {
  return body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);
}

function formatLetterDate(date: Date): string {
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
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
      if (
        dedupedLines.length === 0 ||
        dedupedLines[dedupedLines.length - 1] === ""
      ) {
        continue;
      }
      dedupedLines.push("");
      continue;
    }

    if (dedupedLines[dedupedLines.length - 1] !== line) {
      dedupedLines.push(line);
    }
  }

  return dedupedLines
    .join("\n")
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

  const blocks = raw.split(/\n{2,}/);
  if (blocks.length > 0 && /^subject\s*:/i.test(blocks[0])) {
    return {
      subject: blocks[0].trim(),
      body: blocks.slice(1).join("\n\n").trim(),
    };
  }

  // Fallback if no clear subject block
  return {
    subject: `Subject: ${toSentenceCase(output.complaint_type)} issue`,
    body: raw.trim(),
  };
}

function buildFormattedComplaint(parsed: ParsedComplaint): string {
  const body = parsed.body ? `\n\n${parsed.body}` : "";
  return `${parsed.subject}${body}`.trim();
}

async function downloadPDF(text: string, meta?: LetterMeta): Promise<void> {
  const cleaned = cleanComplaintText(text);
  if (!cleaned) {
    return;
  }

  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 36;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = pageWidth - margin * 2;
  const lineHeight = 17;
  let y = margin;

  const blocks = cleaned
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);
  let subject = "Subject: Complaint";
  let bodyParagraphs: string[] = [];

  if (blocks.length > 0) {
    if (/^subject\s*:/i.test(blocks[0])) {
      subject = blocks[0];
      bodyParagraphs = blocks.slice(1);
    } else if (blocks[0].length < 150) {
      subject = blocks[0];
      bodyParagraphs = blocks.slice(1);
    } else {
      bodyParagraphs = blocks;
    }
  }

  const normalizedSubject = normalizeSubject(subject, meta);
  const dateLabel = `Date: ${formatLetterDate(new Date())}`;
  const locationLabel = meta?.location?.trim() || "[Location]";
  const recipientBlock = [
    "To,",
    "The Respected Authority,",
    `${locationLabel} Administrative Office,`,
    locationLabel,
  ];

  const fontName = await registerUnicodeFont(doc, cleaned);

  const ensurePage = () => {
    if (y + lineHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const addWrappedLines = (wrappedLines: string[], extraGapAfter = 0) => {
    for (const line of wrappedLines) {
      ensurePage();
      doc.text(line, margin, y, { align: "left" });
      y += lineHeight;
    }
    y += extraGapAfter;
  };

  doc.setFont(fontName, "normal");
  doc.setFontSize(11);
  const dateWidth = doc.getTextWidth(dateLabel);
  doc.text(dateLabel, pageWidth - margin - dateWidth, y);
  y += lineHeight + 6;

  doc.setFontSize(12);
  addWrappedLines(recipientBlock, 6);

  doc.setFont(fontName, "bold");
  doc.setFontSize(12);
  const subjectLines = doc.splitTextToSize(
    `Subject: ${normalizedSubject}`,
    maxWidth,
  ) as string[];
  addWrappedLines(subjectLines, 8);

  doc.setFont(fontName, "normal");
  doc.setFontSize(12);
  addWrappedLines(["Respected Sir/Madam,"], 6);

  for (const paragraph of bodyParagraphs) {
    const wrapped = doc.splitTextToSize(paragraph, maxWidth) as string[];
    addWrappedLines(wrapped, 6);
  }

  addWrappedLines(
    [
      "I request you to kindly look into this matter and take appropriate action at the earliest.",
    ],
    12,
  );

  addWrappedLines(["Thank you."], 8);
  addWrappedLines(["Yours faithfully,"], 26);
  addWrappedLines(["__________________________"], 2);
  addWrappedLines(["Complainant Signature"], 0);

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  doc.save(`complaint_${timestamp}.pdf`);
}

function LoadingSkeleton() {
  return (
    <div className="mt-5 animate-pulse space-y-3" aria-hidden="true">
      <div className="h-4 w-36 rounded bg-teal-100/15" />
      <div className="h-4 w-24 rounded bg-teal-100/10" />
      <div className="rounded-2xl border border-teal-100/10 bg-[#06161d] p-5">
        <div className="h-4 w-2/3 rounded bg-teal-100/10" />
        <div className="mt-4 h-3 w-full rounded bg-teal-100/10" />
        <div className="mt-2 h-3 w-11/12 rounded bg-teal-100/10" />
        <div className="mt-2 h-3 w-9/12 rounded bg-teal-100/10" />
      </div>
    </div>
  );
}

export default function OutputBox({
  output,
  error,
  loading,
  onRetry,
  onRegenerate,
}: OutputBoxProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState("");
  const parsed = output ? parseComplaintText(output) : null;
  const formattedComplaint = parsed ? buildFormattedComplaint(parsed) : "";
  const hasDownloadContent =
    Boolean(formattedComplaint.trim().length > 0) && !isDownloading;

  const complaintForActions = isEditing ? editedText : formattedComplaint;

  const hasActionContent = Boolean(complaintForActions.trim().length > 0);

  const handleDownload = async () => {
    if (!hasActionContent || !hasDownloadContent) {
      return;
    }

    try {
      setIsDownloading(true);
      await downloadPDF(complaintForActions, {
        complaintType: output?.complaint_type,
        location: output?.location,
      });
    } catch (downloadError) {
      console.error("Failed to generate PDF", downloadError);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopy = async () => {
    if (!hasActionContent) {
      return;
    }

    try {
      await navigator.clipboard.writeText(complaintForActions);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch (copyError) {
      console.error("Failed to copy", copyError);
    }
  };

  const toggleEdit = () => {
    if (!isEditing) {
      setEditedText(formattedComplaint);
    }
    setIsEditing((prev) => !prev);
  };

  return (
    <div className="glass-card rounded-3xl p-6 md:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-[#ebfffa]">
            Processed Output
          </h2>
          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[#89b8b1]">
            Result Panel
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={toggleEdit}
            disabled={!output}
            className="rounded-xl border border-sky-200/30 bg-sky-200/10 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-sky-50 transition hover:bg-sky-200/20 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {isEditing ? "Lock Edit" : "Edit"}
          </button>
          <button
            type="button"
            onClick={handleCopy}
            disabled={!hasActionContent}
            className="rounded-xl border border-amber-200/30 bg-amber-300/10 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-amber-50 transition hover:bg-amber-300/20 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={!hasActionContent || !hasDownloadContent}
            className="rounded-xl border border-teal-200/30 bg-teal-300/10 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-teal-50 transition hover:bg-teal-300/20 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {isDownloading ? "Preparing PDF..." : "Download PDF"}
          </button>
        </div>
      </div>

      {loading && <LoadingSkeleton />}

      {!loading && !output && !error && (
        <p className="mt-5 rounded-2xl border border-dashed border-teal-100/25 bg-[#07171f]/80 p-4 text-sm leading-relaxed text-[#a8c7c2]">
          Submit a complaint to view detected language, complaint type,
          location, and final translated complaint.
        </p>
      )}

      {error && (
        <div
          className="mt-5 rounded-2xl border border-red-300/40 bg-red-500/10 p-4 text-sm text-red-200"
          role="status"
          aria-live="polite"
        >
          <p>{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 rounded-lg border border-red-200/35 bg-red-200/10 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-red-100 transition hover:bg-red-200/20"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && output && parsed && (
        <div className="mt-5 space-y-4 text-sm text-[#dbf3ef]">
          <details
            className="rounded-2xl border border-teal-100/20 bg-[#06161d] p-4"
            open
          >
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.16em] text-[#8bb8b1]">
              Metadata
            </summary>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
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
          </details>

          <div className="rounded-2xl border border-teal-100/20 bg-[#06161d] p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-[#7baaa3]">
              Formatted Complaint
            </p>

            {isEditing ? (
              <textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                className="mt-3 h-72 w-full rounded-xl border border-teal-100/20 bg-[#041019] p-3 text-sm leading-relaxed text-[#d8f3ef] outline-none focus:border-teal-300/50 focus:ring-2 focus:ring-teal-300/20"
                aria-label="Editable complaint output"
              />
            ) : (
              <>
                <p className="mt-3 text-base font-semibold leading-relaxed text-[#f0fffb]">
                  {parsed.subject}
                </p>
                <p className="mt-4 whitespace-pre-line leading-relaxed text-[#cbe4e0]">
                  {parsed.body}
                </p>
              </>
            )}

            <button
              type="button"
              onClick={onRegenerate}
              className="mt-4 rounded-xl border border-emerald-200/35 bg-emerald-300/10 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-50 transition hover:bg-emerald-300/20"
            >
              Regenerate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
