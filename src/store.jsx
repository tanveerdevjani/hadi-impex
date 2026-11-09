import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, apiBlob } from "./lib/api.js";
import { readInvoices, readRates } from "./lib/business.js";

const StoreContext = createContext(null);
const EMPTY_RECORDS = { quotations: [], purchases: [], payments: [] };

export function StoreProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);
  const [containers, setContainers] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [records, setRecords] = useState(EMPTY_RECORDS);
  const [local, setLocal] = useState({});

  const refresh = useCallback(async () => {
    const [state, saved, shared] = await Promise.all([api("/api/state"), api("/api/records"), api("/api/local")]);
    setUser(state.user);
    setContainers(state.containers);
    setDocuments(state.documents);
    setRecords({ ...EMPTY_RECORDS, ...saved });
    setLocal(shared.values || {});
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await refresh();
        if (active) setReady(true);
      } catch (err) {
        if (active && err?.message !== "Sign in required.") setError(err?.message || "Could not open the saved records.");
      }
    })();
    return () => {
      active = false;
    };
  }, [refresh]);

  const canWrite = user?.role === "admin" || user?.role === "write";
  const rates = useMemo(() => readRates(local), [local]);
  const invoices = useMemo(() => readInvoices(local), [local]);

  const value = useMemo(
    () => ({
      ready,
      error,
      user,
      canWrite,
      containers,
      documents,
      records,
      rates,
      invoices,
      refresh,
      async saveRecord(kind, record) {
        const saved = record.id
          ? await api(`/api/records/${kind}/${record.id}`, { method: "PUT", body: record })
          : await api(`/api/records/${kind}`, { method: "POST", body: record });
        setRecords(await api("/api/records"));
        return saved;
      },
      async deleteRecord(kind, id) {
        await api(`/api/records/${kind}/${id}`, { method: "DELETE" });
        setRecords(await api("/api/records"));
      },
      async addContainer(container) {
        await api("/api/containers", { method: "POST", body: container });
        await refresh();
      },
      async deleteContainer(id) {
        await api(`/api/containers/${id}`, { method: "DELETE" });
        await refresh();
      },
      async deleteSamples() {
        await api("/api/samples", { method: "DELETE" });
        await refresh();
      },
      async addDocument(document) {
        const params = new URLSearchParams({
          containerId: document.containerId,
          categoryId: document.categoryId,
          name: document.name,
          fileName: document.fileName,
        });
        await api(`/api/documents?${params}`, {
          method: "POST",
          headers: { "Content-Type": document.mimeType },
          body: document.blob,
        });
        await refresh();
      },
      async updateDocument(document) {
        await api(`/api/documents/${document.id}`, { method: "PATCH", body: { name: document.name } });
        await refresh();
      },
      async deleteDocument(id) {
        await api(`/api/documents/${id}`, { method: "DELETE" });
        await refresh();
      },
      loadBlob(document) {
        return apiBlob(`/api/documents/${document.id}/file`);
      },
    }),
    [ready, error, user, canWrite, containers, documents, records, rates, invoices, refresh]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error("Store is unavailable");
  return store;
}
