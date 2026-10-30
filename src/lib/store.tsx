import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AppData, Job, Resume, Settings } from "./types";
import { exampleData, isExampleId } from "./sample";

const DATA_KEY = "jfs.data.v2";
const KEY_KEY = "jfs.apiKey"; // kept apart so exports never include it

const defaultSettings: Settings = { apiKey: "", model: "claude-sonnet-5-5", theme: "system"};

const empty: AppData = { version: 2, resumes: [], activeResumeId: null, jobs: [], settings: defaultSettings };

function load(): AppData {
  try {
    const raw = localStorage.getItem(DATA_KEY);
    const data: AppData = raw ? { ...empty, ...JSON.parse(raw) } : empty;
    data.settings = { ...defaultSettings, ...data.settings, apiKey: localStorage.getItem(KEY_KEY) ?? "" };
    return data;
  } catch {
    return empty;
  }
}

function save(data: AppData) {
  try {
    const { apiKey, ...rest } = data.settings;
    localStorage.setItem(DATA_KEY, JSON.stringify({ ...data, settings: rest }));
    if (apiKey) localStorage.setItem(KEY_KEY, apiKey);
    else localStorage.removeItem(KEY_KEY);
  } catch {
    /* storage full or blocked; keep working in memory */
  }
}

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
export const today = () => new Date().toISOString().slice(0, 10);

interface Store {
  data: AppData;
  activeResume: Resume | null;
  saveResume: (r: Omit<Resume, "id" | "createdAt" | "updatedAt"> & { id?: string }) => string;
  deleteResume: (id: string) => void;
  setActiveResume: (id: string) => void;
  addJob: (j: Partial<Job> & Pick<Job, "title" | "company">) => string;
  updateJob: (id: string, patch: Partial<Job>) => void;
  deleteJob: (id: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  exportData: () => string;
  importData: (json: string) => void;
  resetAll: () => void;
  loadExamples: () => void;
  clearExamples: () => void;
  hasExamples: boolean;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(load);

  useEffect(() => save(data), [data]);

  // Keep several open tabs in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === DATA_KEY || e.key === KEY_KEY) setData(load());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const saveResume: Store["saveResume"] = useCallback((r) => {
    const id = r.id ?? uid();
    const now = Date.now();
    setData((d) => {
      const existing = d.resumes.find((x) => x.id === id);
      const next: Resume = existing
        ? { ...existing, ...r, id, updatedAt: now }
        : { name: r.name, fileName: r.fileName, text: r.text, id, createdAt: now, updatedAt: now };
      const resumes = existing ? d.resumes.map((x) => (x.id === id ? next : x)) : [...d.resumes, next];
      return { ...d, resumes, activeResumeId: d.activeResumeId ?? id };
    });
    return id;
  }, []);

  const deleteResume = useCallback((id: string) => {
    setData((d) => {
      const resumes = d.resumes.filter((r) => r.id !== id);
      const activeResumeId = d.activeResumeId === id ? resumes[0]?.id ?? null : d.activeResumeId;
      return { ...d, resumes, activeResumeId };
    });
  }, []);

  const setActiveResume = useCallback((id: string) => setData((d) => ({ ...d, activeResumeId: id })), []);

  const addJob: Store["addJob"] = useCallback((j) => {
    const id = uid();
    setData((d) => {
      const job: Job = {
        id,
        url: "",
        location: "",
        description: "",
        status: "Saved",
        createdAt: Date.now(),
        appliedOn: "",
        notes: "",
        resumeId: d.activeResumeId,
        ...j,
      };
      return { ...d, jobs: [job, ...d.jobs] };
    });
    return id;
  }, []);

  const updateJob = useCallback((id: string, patch: Partial<Job>) => {
    setData((d) => ({
      ...d,
      jobs: d.jobs.map((j) => {
        if (j.id !== id) return j;
        const next = { ...j, ...patch };
        if (patch.status === "Applied" && !j.appliedOn && !patch.appliedOn) next.appliedOn = today();
        return next;
      }),
    }));
  }, []);

  const deleteJob = useCallback((id: string) => setData((d) => ({ ...d, jobs: d.jobs.filter((j) => j.id !== id) })), []);

  const updateSettings = useCallback(
    (patch: Partial<Settings>) => setData((d) => ({ ...d, settings: { ...d.settings, ...patch } })),
    [],
  );

  const exportData = useCallback(() => {
    const { apiKey: _omit, ...settings } = data.settings;
    void _omit;
    return JSON.stringify({ ...data, settings }, null, 2);
  }, [data]);

  const importData = useCallback((json: string) => {
    const parsed = JSON.parse(json) as Partial<AppData>;
    if (!parsed || !Array.isArray(parsed.jobs) || !Array.isArray(parsed.resumes)) {
      throw new Error("That file isn't a Job Fit Studio export.");
    }
    setData((d) => ({
      ...empty,
      ...parsed,
      version: 2,
      settings: { ...d.settings, ...(parsed.settings ?? {}), apiKey: d.settings.apiKey },
    }));
  }, []);

  const resetAll = useCallback(() => setData((d) => ({ ...empty, settings: d.settings })), []);

  const loadExamples = useCallback(() => setData((d) => ({ ...d, ...exampleData() })), []);

  const clearExamples = useCallback(
    () =>
      setData((d) => {
        const resumes = d.resumes.filter((r) => !isExampleId(r.id));
        const activeResumeId = d.activeResumeId && !isExampleId(d.activeResumeId) ? d.activeResumeId : resumes[0]?.id ?? null;
        return { ...d, resumes, activeResumeId, jobs: d.jobs.filter((j) => !isExampleId(j.id)) };
      }),
    [],
  );

  const hasExamples = useMemo(() => data.jobs.some((j) => isExampleId(j.id)) || data.resumes.some((r) => isExampleId(r.id)), [data]);

  const activeResume = useMemo(
    () => data.resumes.find((r) => r.id === data.activeResumeId) ?? null,
    [data.resumes, data.activeResumeId],
  );

  const value = useMemo<Store>(
    () => ({
      data,
      activeResume,
      saveResume,
      deleteResume,
      setActiveResume,
      addJob,
      updateJob,
      deleteJob,
      updateSettings,
      exportData,
      importData,
      resetAll,
      loadExamples,
      clearExamples,
      hasExamples,
    }),
    [data, activeResume, saveResume, deleteResume, setActiveResume, addJob, updateJob, deleteJob, updateSettings, exportData, importData, resetAll, loadExamples, clearExamples, hasExamples],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore must be used inside StoreProvider");
  return s;
}
