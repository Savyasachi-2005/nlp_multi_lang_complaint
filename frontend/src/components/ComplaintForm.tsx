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
          AI Assisted
        </span>
      </div>

      <div className="mt-5 h-px w-full bg-gradient-to-r from-transparent via-teal-100/20 to-transparent" />

      <p className="mt-4 text-xs uppercase tracking-[0.18em] text-teal-200/85">
        Input Panel
      </p>

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
          />
          <p className="mt-2 text-xs text-[#89b4ad]">
            Tip: include location details for better draft quality.
          </p>
        </div>

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

        <p className="text-center text-xs text-[#84aca6]">
          Supports Hindi, Kannada, Tamil, Telugu, and Marathi output.
        </p>
      </div>

      <p className="mt-4 text-[11px] text-[#759892]">
        This tool assists drafting and should be reviewed before final
        submission.
      </p>
    </div>
  );
}
