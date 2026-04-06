export type ComplaintRequest = {
  complaint_text: string;
  target_language: "hi" | "kn" | "ta" | "te" | "mr";
};

export type ComplaintResponse = {
  detected_language: string;
  complaint_type: string;
  location: string;
  final_output: string;
};

export async function processComplaint(
  data: ComplaintRequest
): Promise<ComplaintResponse> {
  const res = await fetch("http://localhost:8000/process-complaint", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(err.detail || "Failed to process complaint");
  }

  return res.json();
}
