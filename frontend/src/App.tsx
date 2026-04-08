import { useState } from "react";
import ComplaintForm from "./components/ComplaintForm";
import OutputBox from "./components/OutputBox";
import { processComplaint, type ComplaintResponse } from "./api";

export default function App() {
  const [complaintText, setComplaintText] = useState("");
  const [targetLanguage, setTargetLanguage] = useState<
    "hi" | "kn" | "ta" | "te" | "mr"
  >("hi");
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<ComplaintResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!complaintText.trim()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await processComplaint({
        complaint_text: complaintText,
        target_language: targetLanguage,
      });
      setOutput(data);
    } catch (err) {
      setOutput(null);
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen px-4 py-8 text-slate-100 md:px-8 md:py-10">
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
              onComplaintChange={setComplaintText}
              onLanguageChange={setTargetLanguage}
              onSubmit={handleSubmit}
            />
          </div>

          <div className="section-appear-delay">
            <OutputBox output={output} error={error} />
          </div>
        </section>
      </div>
    </main>
  );
}
