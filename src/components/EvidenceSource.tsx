import type { Evidence } from "@/lib/scoring";

/** Where a piece of evidence can be checked: the uploaded file, the creator's link, or both. */
export function EvidenceSource({ evidence }: { evidence: Evidence }) {
  return (
    <>
      {evidence.file && (
        <a href={`/api/files/${evidence.file}`} target="_blank" rel="noopener noreferrer" className="link text-sm text-ink-soft">
          {evidence.file.endsWith(".pdf") ? "Download PDF" : "View image"}
        </a>
      )}
      {evidence.url && (
        <a href={evidence.url} target="_blank" rel="nofollow ugc noopener noreferrer" className="link break-all text-sm text-ink-soft">
          {evidence.url}
        </a>
      )}
    </>
  );
}
