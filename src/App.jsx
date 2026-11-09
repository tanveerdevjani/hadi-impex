import { useEffect } from "react";
import { Navigate, Outlet, Route, Routes, useNavigate } from "react-router-dom";
import { useStore } from "./store.jsx";
import ContainerDetail from "./pages/ContainerDetail.jsx";
import ContainerList from "./pages/ContainerList.jsx";
import Payments from "./pages/Payments.jsx";
import Purchases from "./pages/Purchases.jsx";
import QuotationView from "./pages/QuotationView.jsx";
import Quotations from "./pages/Quotations.jsx";
import Users from "./pages/Users.jsx";

const APP_PATHS = /^\/(containers|users|quotations|purchases|payments)(\/[\w-]+)?$/;

function Layout() {
  const { ready, error, refresh } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    function onMessage(event) {
      if (event.origin !== location.origin || event.data?.type !== "hadi-navigate") return;
      const path = String(event.data.path || "");
      if (!APP_PATHS.test(path)) return;
      navigate(path);
      window.scrollTo(0, 0);
      refresh().catch(() => {});
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [navigate, refresh]);

  return (
    <main className="mx-auto w-full max-w-7xl p-3 sm:p-6 lg:p-8 print:max-w-none print:p-0">
      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : null}
      {!ready && !error ? <div className="text-sm text-slate-500">Loading...</div> : <Outlet />}
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/containers" element={<ContainerList />} />
        <Route path="/containers/:id" element={<ContainerDetail />} />
        <Route path="/users" element={<Users />} />
        <Route path="/quotations" element={<Quotations />} />
        <Route path="/quotations/:id" element={<QuotationView />} />
        <Route path="/purchases" element={<Purchases />} />
        <Route path="/payments" element={<Payments />} />
      </Route>
      <Route path="*" element={<Navigate to="/containers" replace />} />
    </Routes>
  );
}
