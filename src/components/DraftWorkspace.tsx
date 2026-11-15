"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { openWorkDraft, saveWorkDraft } from "@/app/actions/drafts";
import { draftFormData, draftPayload, matchesDraft, type DraftKind, type DraftPayload, type WorkDraft } from "@/lib/drafts";

type Recovery = { payload: DraftPayload; version: number; savedAt: string };
async function recovery(key: string, value?: Recovery | null): Promise<Recovery | undefined> {
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("unprompters-drafts", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("recovery");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction("recovery", value === undefined ? "readonly" : "readwrite");
      const store = transaction.objectStore("recovery");
      const request = value === undefined ? store.get(key) : value === null ? store.delete(key) : store.put(value, key);
      transaction.oncomplete = () => resolve(value === undefined ? request.result : undefined);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally { database.close(); }
}

type DraftContextValue = {
  initial: DraftPayload;
  value: (name: string) => string | undefined;
  prepare: (form: FormData) => Promise<boolean>;
  resume: () => void;
};
const DraftContext = createContext<DraftContextValue | null>(null);
export const useDraftWorkspace = () => useContext(DraftContext);

export function DraftWorkspace({ userId, kind, targetSlug = "", children }: { userId: number; kind: DraftKind; targetSlug?: string; children: ReactNode }) {
  const router = useRouter();
  const [draft, setDraft] = useState<WorkDraft | null>(null);
  const [initial, setInitial] = useState<DraftPayload | null>(null);
  const [candidate, setCandidate] = useState<Recovery | null>(null);
  const [message, setMessage] = useState("Loading your draft…");
  const [problem, setProblem] = useState(false);
  const [busy, setBusy] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const opened = useRef(false);
  const version = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chain = useRef<Promise<boolean>>(Promise.resolve(true));
  const publishing = useRef(false);
  const dirty = useRef(false);
  const generation = useRef(0);
  const key = draft ? `${userId}:${draft.id}` : "";

  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    const id = new URL(location.href).searchParams.get("draft") ?? undefined;
    void openWorkDraft(kind, targetSlug, id).then(async (result) => {
      if ("error" in result) { setProblem(true); setMessage(result.error); return; }
      version.current = result.version;
      const url = new URL(location.href);
      url.searchParams.set("draft", result.id);
      history.replaceState(null, "", url);
      const local = await recovery(`${userId}:${result.id}`).catch(() => undefined);
      setDraft(result);
      if (local && !matchesDraft(local.payload, result.payload)) {
        setCandidate(local);
        setMessage("A recovery copy on this device differs from the saved draft. Choose which to continue with.");
      } else {
        setInitial(result.payload);
        setMessage(result.version ? "Saved draft restored. Confirm the ownership statements again before publishing." : "Private draft. Changes save automatically, including attachments.");
      }
    }).catch(() => { setProblem(true); setMessage("Couldn't load your draft. Check your connection and reload."); });
  }, [kind, targetSlug, userId]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty.current && !publishing.current) { event.preventDefault(); event.returnValue = ""; }
    };
    window.addEventListener("beforeunload", warn);
    return () => { window.removeEventListener("beforeunload", warn); if (timer.current) clearTimeout(timer.current); };
  }, []);

  function save(form: FormData): Promise<boolean> {
    if (!draft) return Promise.resolve(false);
    const at = generation.current;
    chain.current = chain.current.catch(() => false).then(async () => {
      setBusy(true);
      setProblem(false);
      let localSaved = false;
      try {
        const payload = await draftPayload(form);
        try { await recovery(key, { payload, version: version.current, savedAt: new Date().toISOString() }); localSaved = true; } catch { /* Online saving still works if device storage is unavailable. */ }
        const result = await saveWorkDraft(draft.id, version.current, form);
        if ("error" in result) { setProblem(true); setMessage(result.error + (localSaved ? " Recovery is available on this device." : " Device recovery is unavailable; keep this page open.")); return false; }
        version.current = result.version;
        if (at === generation.current) dirty.current = false;
        await recovery(key, { payload, version: result.version, savedAt: result.savedAt }).catch(() => {});
        setMessage(`Saved privately at ${new Date(result.savedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.${localSaved ? "" : " Device recovery is unavailable."}`);
        return true;
      } catch (error) {
        setProblem(true);
        setMessage(`${error instanceof Error && /draft|attachments|characters/.test(error.message) ? error.message : "Couldn't save online."} ${localSaved ? "Your recovery copy is on this device. Retry when connected." : "Keep this page open and retry; no recovery copy could be saved."}`);
        return false;
      } finally { setBusy(false); }
    });
    return chain.current;
  }

  function changed() {
    if (publishing.current || !initial) return;
    dirty.current = true;
    generation.current++;
    setMessage("Unsaved changes…");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const form = root.current?.querySelector("form");
      if (form) void save(new FormData(form));
    }, 1500);
  }

  async function prepare(form: FormData) {
    if (publishing.current) return false;
    publishing.current = true;
    if (timer.current) clearTimeout(timer.current);
    const ok = await save(form);
    if (!ok || !draft) { publishing.current = false; return false; }
    form.set("draftId", draft.id);
    form.set("draftVersion", String(version.current));
    return true;
  }

  return (
    <div ref={root} onChange={changed} onClick={(event) => {
      // Adding/removing an evidence row changes hidden inputs without an input event.
      if ((event.target as HTMLElement).closest('form button[type="button"]')) changed();
    }}>
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-card p-4">
        <p role={problem ? "alert" : "status"} className={`min-w-0 basis-full text-sm sm:flex-1 ${problem ? "text-heavy" : "text-ink-soft"}`}>{busy ? "Saving draft…" : message}</p>
        {initial && <button type="button" className="btn-ghost" disabled={busy} onClick={() => { const form = root.current?.querySelector("form"); if (form) void save(new FormData(form)); }}>Save draft</button>}
        <Link href="/dashboard" className="link text-sm" onNavigate={(event) => {
          if (!dirty.current && !publishing.current) return;
          event.preventDefault();
          if (publishing.current) return;
          const form = root.current?.querySelector("form");
          if (!form) return;
          if (timer.current) clearTimeout(timer.current);
          void save(new FormData(form)).then((ok) => { if (ok && !dirty.current) router.push("/dashboard"); });
        }}>My drafts</Link>
      </div>
      {candidate && draft && <div className="mb-6 flex flex-wrap gap-3">
        <button type="button" className="btn-primary" onClick={() => { setInitial(candidate.payload); setCandidate(null); dirty.current = true; setMessage("Device copy restored. Save it to your account when ready."); }}>Use device recovery</button>
        <button type="button" className="btn-ghost" onClick={() => { setInitial(draft.payload); setCandidate(null); void recovery(key, null).catch(() => {}); setMessage("Saved account draft restored."); }}>Use saved account draft</button>
      </div>}
      {initial && <DraftContext.Provider value={{ initial, value: (name) => initial.fields.find(([key]) => key === name)?.[1], prepare, resume: () => { publishing.current = false; } }}>
        {children}
        <RestoreDraft root={root} payload={initial} />
      </DraftContext.Provider>}
    </div>
  );
}

function RestoreDraft({ root, payload }: { root: React.RefObject<HTMLDivElement | null>; payload: DraftPayload }) {
  useEffect(() => {
    if (!payload.fields.length && !payload.files.length) return;
    const form = root.current?.querySelector("form");
    if (!form) return;
    const data = draftFormData(payload);
    const offsets = new Map<string, number>();
    for (const control of Array.from(form.elements)) {
      if (!(control instanceof HTMLInputElement || control instanceof HTMLSelectElement || control instanceof HTMLTextAreaElement)) continue;
      const name = control.name;
      if (!name || ["attest", "ownVideo", "editSlug", "draftId", "draftVersion"].includes(name)) continue;
      if (control instanceof HTMLInputElement && control.type === "file") {
        const file = data.get(name);
        if (file instanceof File && file.size) {
          const transfer = new DataTransfer(); transfer.items.add(file); control.files = transfer.files;
          control.dispatchEvent(new Event("change", { bubbles: true }));
        }
      } else if (control instanceof HTMLInputElement && ["radio", "checkbox"].includes(control.type)) {
        control.checked = data.getAll(name).includes(control.value);
      } else {
        const index = offsets.get(name) ?? 0;
        const value = data.getAll(name)[index];
        offsets.set(name, index + 1);
        if (typeof value === "string") control.value = value;
      }
    }
    form.querySelector('[name="category"]')?.dispatchEvent(new Event("change", { bubbles: true }));
  }, [root, payload]);
  return null;
}
