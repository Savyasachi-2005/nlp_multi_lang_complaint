type ComplaintFormProps = {
  complaintText: string;
  targetLanguage: "hi" | "kn" | "ta" | "te" | "mr";
  loading: boolean;
  onComplaintChange: (value: string) => void;
  onLanguageChange: (value: "hi" | "kn" | "ta" | "te" | "mr") => void;
  onSubmit: () => void;
};

export default function ComplaintForm({
  complaintText,
  targetLanguage,
  loading,
  onComplaintChange,
  onLanguageChange,
  onSubmit,
}: ComplaintFormProps) {
  return (
    <div className="rounded-2xl bg-gray-800/80 p-6 shadow-card ring-1 ring-gray-700">
      <h1 className="text-2xl font-semibold text-white">
        Multilingual Complaint Processor
      </h1>
      <p className="mt-2 text-sm text-gray-300">
        Enter complaint text in any language and generate a formal complaint in your target language.
      </p>

      <div className="mt-6 space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-200">
            Complaint Text
          </label>
          <textarea
            className="h-36 w-full rounded-xl border border-gray-600 bg-gray-900 p-3 text-sm text-gray-100 outline-none transition focus:border-blue-400"
            placeholder="Type your complaint here..."
            value={complaintText}
            onChange={(e) => onComplaintChange(e.target.value)}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-200">
            Target Language
          </label>
          <select
            className="w-full rounded-xl border border-gray-600 bg-gray-900 p-3 text-sm text-gray-100 outline-none transition focus:border-blue-400"
            value={targetLanguage}
            onChange={(e) => onLanguageChange(e.target.value as "hi" | "kn" | "ta" | "te" | "mr")}
          >
            <option value="hi">Hindi (hi)</option>
            <option value="kn">Kannada (kn)</option>
            <option value="ta">Tamil (ta)</option>
            <option value="te">Telugu (te)</option>
            <option value="mr">Marathi (mr)</option>
          </select>
        </div>

        <button
          type="button"
          onClick={onSubmit}
          disabled={loading || !complaintText.trim()}
          className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-800"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Processing...
            </span>
          ) : (
            "Submit"
          )}
        </button>
      </div>
    </div>
  );
}
