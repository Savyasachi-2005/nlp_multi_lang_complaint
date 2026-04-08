import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import ComplaintForm from "./components/ComplaintForm";
import OutputBox from "./components/OutputBox";
import { ApiError, processComplaint, type ComplaintResponse } from "./api";

type LanguageCode = "hi" | "kn" | "ta" | "te" | "mr";

type HistoryItem = {
  id: string;
  text: string;
  language: LanguageCode;
  createdAt: number;
  output: ComplaintResponse | null;
};

const HISTORY_STORAGE_KEY = "complaint_history_v1";

const templates = [
  {
    id: "road",
    label: "Road Damage",
    text: "The road near Central Bus Stand has severe potholes causing traffic and safety issues for commuters.",
  },
  {
    id: "water",
    label: "Water Supply",
    text: "There has been no water supply in Ward 12 for the last three days and residents are facing hardship.",
  },
  {
    id: "lighting",
    label: "Street Lights",
    text: "Street lights in Sector 4 are not functioning at night and this area has become unsafe for residents.",
  },
];

function getInitialHistory(): HistoryItem[] {
  const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
  if (!stored) {
    return [];
  }

  try {
    const parsed = JSON.parse(stored) as HistoryItem[];
    return Array.isArray(parsed) ? parsed.slice(0, 8) : [];
  } catch {
    return [];
  }
}

function getFriendlyError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.type === "network") {
      return "Unable to connect to backend. Ensure backend is running and API URL is correct.";
    }
    if (error.type === "timeout") {
      return "Request timed out. Please retry or shorten your input.";
    }
    if (error.type === "auth") {
      return "Backend authentication failed. Please verify server API key configuration.";
    }
    if (error.type === "validation") {
      return error.message || "Please review your input and retry.";
    }
    if (error.type === "server") {
      return "Backend encountered an internal error. Please retry in a moment.";
    }
  }

  return error instanceof Error ? error.message : "Unexpected error";
}

export default function App() {
  const [complaintText, setComplaintText] = useState("");
  const [targetLanguage, setTargetLanguage] = useState<LanguageCode>("hi");
  const [output, setOutput] = useState<ComplaintResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>(() =>
    getInitialHistory(),
  );
  const [announcement, setAnnouncement] = useState<string>("Ready");

  const processMutation = useMutation({
    mutationFn: processComplaint,
  });
  const loading = processMutation.isPending;

  useEffect(() => {
    localStorage.setItem(
      HISTORY_STORAGE_KEY,
      JSON.stringify(history.slice(0, 8)),
    );
  }, [history]);

  const disableReason = useMemo(() => {
    if (loading) {
      return "A request is already in progress.";
    }

    if (!complaintText.trim()) {
      return "Enter complaint text to continue.";
    }

    if (complaintText.trim().length < 20) {
      return "Complaint text is too short. Add at least 20 characters.";
    }

    return null;
  }, [complaintText, loading]);

  const handleSubmit = async (useExistingText?: string) => {
    const nextComplaintText = useExistingText ?? complaintText;
    if (!nextComplaintText.trim() || nextComplaintText.trim().length < 20) {
      return;
    }

    setError(null);
    setAnnouncement("Generating complaint draft");

    try {
      const data = await processMutation.mutateAsync({
        complaint_text: nextComplaintText,
        target_language: targetLanguage,
      });
      setOutput(data);
      setAnnouncement("Complaint generated successfully");
      setHistory((prev) => {
        const entry: HistoryItem = {
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          text: nextComplaintText.trim(),
          language: targetLanguage,
          createdAt: Date.now(),
          output: data,
        };
        return [entry, ...prev].slice(0, 8);
      });
    } catch (err) {
      setOutput(null);
      setError(getFriendlyError(err));
      setAnnouncement("Error while generating complaint");
    }
  };

  const handleRegenerate = () => {
    void handleSubmit();
  };

  const handleRetry = () => {
    void handleSubmit();
  };

  const handleApplyTemplate = (value: string) => {
    setComplaintText(value);
    setOutput(null);
    setError(null);
  };

  const handleLoadHistory = (id: string) => {
    const item = history.find((entry) => entry.id === id);
    if (!item) {
      return;
    }

    setComplaintText(item.text);
    setTargetLanguage(item.language);
    setOutput(item.output);
    setError(null);
    setAnnouncement(
      item.output
        ? "Loaded complaint and previous output from history"
        : "Loaded complaint from history",
    );
  };

  return (
    <main className="min-h-screen px-4 py-8 text-slate-100 md:px-8 md:py-10">
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
      <div className="mx-auto w-full max-w-6xl">
        <header className="section-appear glass-card rounded-3xl p-6 md:p-8">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-teal-200/90">
            NLP Grievance Desk
          </p>
          <h1 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight text-[#ebfffa] md:text-4xl">
            Transform citizen complaints into formal multilingual reports in
            seconds.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#b2cfca] md:text-base">
            Paste any raw complaint text, choose your destination language, and
            receive a structured complaint draft ready for official submission
            and PDF export.
          </p>

          <div className="mt-6 flex flex-wrap gap-3 text-xs text-teal-100/90 md:text-sm">
            <span className="rounded-full border border-teal-200/30 bg-teal-400/10 px-3 py-1">
              Language Detection
            </span>
            <span className="rounded-full border border-teal-200/30 bg-teal-400/10 px-3 py-1">
              Formal Draft Generation
            </span>
            <span className="rounded-full border border-teal-200/30 bg-teal-400/10 px-3 py-1">
              Unicode PDF Download
            </span>
          </div>
        </header>

        <section className="mt-6 grid w-full gap-5 md:mt-7 md:grid-cols-2">
          <div className="section-appear">
            <ComplaintForm
              complaintText={complaintText}
              targetLanguage={targetLanguage}
              loading={loading}
              disableReason={disableReason}
              templates={templates}
              history={history}
              onComplaintChange={setComplaintText}
              onLanguageChange={setTargetLanguage}
              onApplyTemplate={handleApplyTemplate}
              onLoadHistory={handleLoadHistory}
              onSubmit={() => void handleSubmit()}
            />
          </div>

          <div className="section-appear-delay">
            <OutputBox
              output={output}
              error={error}
              loading={loading}
              onRetry={handleRetry}
              onRegenerate={handleRegenerate}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
