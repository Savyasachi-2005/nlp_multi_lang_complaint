import { useState } from "react";
import ComplaintForm from "./components/ComplaintForm";
import OutputBox from "./components/OutputBox";
import { processComplaint, type ComplaintResponse } from "./api";

export default function App() {
  const [complaintText, setComplaintText] = useState("");
  const [targetLanguage, setTargetLanguage] = useState<"hi" | "kn" | "ta" | "te" | "mr">("hi");
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
    <main className="min-h-screen bg-gray-900 px-4 py-10 text-gray-100">
      <div className="mx-auto grid w-full max-w-5xl gap-6 md:grid-cols-2">
        <ComplaintForm
          complaintText={complaintText}
          targetLanguage={targetLanguage}
          loading={loading}
          onComplaintChange={setComplaintText}
          onLanguageChange={setTargetLanguage}
          onSubmit={handleSubmit}
        />
        <OutputBox output={output} error={error} />
      </div>
    </main>
  );
}
