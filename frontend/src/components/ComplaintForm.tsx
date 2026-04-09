type ComplaintFormProps = {
  complaintText: string;
  targetLanguage: "hi" | "kn" | "ta" | "te" | "mr";
  loading: boolean;
  disableReason: string | null;
  templates: Array<{ id: string; label: string; text: string }>;
  history: Array<{
    id: string;
    text: string;
    language: "hi" | "kn" | "ta" | "te" | "mr";
    createdAt: number;
    output: {
      location: string;
    } | null;
  }>;
  onComplaintChange: (value: string) => void;
  onLanguageChange: (value: "hi" | "kn" | "ta" | "te" | "mr") => void;
  onApplyTemplate: (value: string) => void;
  onLoadHistory: (id: string) => void;
  onSubmit: () => void;
};

export default function ComplaintForm({
  complaintText,
  targetLanguage,
  loading,
  disableReason,
  templates,
  history,
  onComplaintChange,
  onLanguageChange,
  onApplyTemplate,
  onLoadHistory,
  onSubmit,
}: ComplaintFormProps) {
  const trimmedLength = complaintText.trim().length;
  const qualityHint =
    trimmedLength === 0
      ? "Describe the issue, what happened, and where it happened."
      : trimmedLength < 45
        ? "Add more detail for better extraction quality."
        : trimmedLength < 120
          ? "Good start. Include landmarks or dates to improve precision."
          : "Strong complaint detail level detected.";

  return (
    <div className="elevated-card rounded-3xl p-6 md:p-7">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-[#ebfffa]">
            Create Complaint Draft
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#abcac5]">
            Provide a rough complaint in any language. The system will detect
            intent, infer location, and generate a clean formal version.
          </p>
        </div>
        <span className="rounded-full border border-amber-200/35 bg-amber-200/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-amber-100">
          NLP Pipeline
        </span>
      </div>

      <div className="mt-5 h-px w-full bg-gradient-to-r from-transparent via-teal-100/20 to-transparent" />

      <p className="mt-4 text-xs uppercase tracking-[0.18em] text-teal-200/85">
        Input Panel
      </p>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8fb9b2]">
          Quick Templates
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {templates.map((template) => (
            <button
              key={template.id}
              type="button"
              className="rounded-full border border-teal-200/25 bg-teal-300/10 px-3 py-1 text-xs text-teal-50 transition hover:bg-teal-300/20"
              onClick={() => onApplyTemplate(template.text)}
            >
              {template.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 space-y-5">
        <div>
          <label className="mb-2 block text-sm font-medium text-teal-50">
            Complaint Text
          </label>
          <textarea
            className="h-40 w-full rounded-2xl border border-teal-200/20 bg-[#07171f] px-4 py-3 text-sm text-[#dcf8f4] outline-none transition placeholder:text-teal-100/40 focus:border-teal-300/60 focus:ring-2 focus:ring-teal-300/20"
            placeholder="Example: Street lights in Sector 4 have not worked for 2 weeks and residents feel unsafe at night..."
            value={complaintText}
            onChange={(e) => onComplaintChange(e.target.value)}
            aria-describedby="complaint-guidance"
          />
          <div className="mt-2 flex items-center justify-between gap-2 text-xs">
            <p id="complaint-guidance" className="text-[#89b4ad]">
              {qualityHint}
            </p>
            <span className="rounded-full border border-teal-100/20 px-2 py-0.5 text-[#9bc0bb]">
              {trimmedLength} chars
            </span>
          </div>
        </div>

        {history.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium text-teal-50">
              Recent Complaints
            </p>
            <div className="space-y-2">
              {history.slice(0, 3).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onLoadHistory(item.id)}
                  className="w-full rounded-xl border border-teal-100/20 bg-[#07171f]/75 px-3 py-2 text-left text-xs text-[#b7d7d2] transition hover:border-teal-200/35"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-teal-50/95">
                      {new Date(item.createdAt).toLocaleString()}
                    </span>
                    <span className="uppercase text-[#8eb9b2]">
                      {item.language}
                    </span>
                  </div>
                  {item.output?.location && (
                    <p className="mt-1 text-[11px] uppercase tracking-wide text-[#8ab5ae]">
                      Location: {item.output.location}
                    </p>
                  )}
                  <p className="mt-1 line-clamp-2">{item.text}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="mb-2 block text-sm font-medium text-teal-50">
            Target Language
          </label>
          <select
            className="w-full rounded-2xl border border-teal-200/20 bg-[#07171f] p-3 text-sm text-[#dcf8f4] outline-none transition focus:border-teal-300/60 focus:ring-2 focus:ring-teal-300/20"
            value={targetLanguage}
            onChange={(e) =>
              onLanguageChange(
                e.target.value as "hi" | "kn" | "ta" | "te" | "mr",
              )
            }
          >
            <option value="hi">Hindi - हिन्दी (hi)</option>
            <option value="kn">Kannada - ಕನ್ನಡ (kn)</option>
            <option value="ta">Tamil - தமிழ் (ta)</option>
            <option value="te">Telugu - తెలుగు (te)</option>
            <option value="mr">Marathi - मराठी (mr)</option>
          </select>
        </div>

        <button
          type="button"
          onClick={onSubmit}
          disabled={Boolean(disableReason)}
          aria-disabled={Boolean(disableReason)}
          className="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:from-teal-400 hover:to-emerald-400 disabled:cursor-not-allowed disabled:opacity-55"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Building Formal Draft...
            </span>
          ) : (
            "Generate Complaint"
          )}
        </button>

        {disableReason && (
          <p
            className="text-center text-xs text-amber-200"
            role="status"
            aria-live="polite"
          >
            {disableReason}
          </p>
        )}

        <p className="text-center text-xs text-[#84aca6]">
          Supports Hindi, Kannada, Tamil, Telugu, and Marathi output.
        </p>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-teal-100/20 bg-[#05141b]/95 p-3 backdrop-blur md:hidden">
        <button
          type="button"
          onClick={onSubmit}
          disabled={Boolean(disableReason)}
          className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-55"
        >
          {loading ? "Building Draft..." : "Generate Complaint"}
        </button>
      </div>

      <p className="mt-4 text-[11px] text-[#759892]">
        This tool assists drafting and should be reviewed before final
        submission.
      </p>
    </div>
  );
}
