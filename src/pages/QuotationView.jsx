import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import QuotationForm from "../components/QuotationForm.jsx";
import { controlClass, Pill, primaryButton, secondaryButton } from "../components/ui.jsx";
import { QUOTE_STATUSES, labelOf, number, quoteTotals, toneOf, usd } from "../lib/business.js";
import { formatDate } from "../lib/format.js";
import { useStore } from "../store.jsx";

const FALLBACK_SELLER = "Business Bay, Dubai, UAE";

export default function QuotationView() {
  const { id } = useParams();
  const { records, invoices, canWrite, saveRecord, rates } = useStore();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const quote = records.quotations.find((item) => item.id === id);

  if (!quote) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8">
        <h1 className="text-xl font-bold">Quotation not found</h1>
        <Link to="/quotations" className="mt-3 inline-block text-sm font-semibold text-blue-700">Back to quotations</Link>
      </div>
    );
  }

  const seller = invoices.find((pi) => pi.sellerName) || {};
  const totals = quoteTotals(quote);

  async function setStatus(status) {
    setError("");
    try {
      await saveRecord("quotations", { ...quote, status });
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="space-y-5">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/quotations" className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-500 hover:text-slate-800" aria-label="Back">←</Link>
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">{quote.number} <Pill tone={toneOf(QUOTE_STATUSES, quote.status)}>{labelOf(QUOTE_STATUSES, quote.status)}</Pill></h1>
            <p className="text-xs text-slate-500">Last updated by {quote.updatedBy || "—"}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canWrite ? (
            <select className={controlClass} value={quote.status} onChange={(event) => setStatus(event.target.value)} aria-label="Status">
              {QUOTE_STATUSES.map((item) => <option key={item.id} value={item.id}>Mark as {item.label}</option>)}
            </select>
          ) : null}
          {canWrite ? <button type="button" className={secondaryButton} onClick={() => setEditing(true)}>Edit</button> : null}
          <button type="button" className={primaryButton} onClick={() => window.print()}>Print / Save PDF</button>
        </div>
      </div>
      {error ? <div className="no-print rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}

      <article className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none" style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}>
        <header className="flex items-start justify-between gap-6 border-b-2 border-slate-900 pb-5">
          <div className="flex items-center gap-4">
            <img src="/logo-transparent.png" alt="Hadi Impex" className="h-16 w-auto object-contain" />
            <div>
              <div className="text-lg font-black tracking-tight text-slate-900">{seller.sellerName || "HADI IMPEX"}</div>
              <div className="whitespace-pre-line text-[11px] leading-relaxed text-slate-500">{seller.sellerAddress || FALLBACK_SELLER}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black uppercase tracking-wide text-blue-800">Quotation</div>
            <div className="mt-1 font-mono text-sm font-bold">{quote.number}</div>
            <div className="text-xs text-slate-500">Date: {formatDate(quote.date)}</div>
            <div className="text-xs text-slate-500">Valid until: {formatDate(quote.validUntil)}</div>
          </div>
        </header>

        <section className="mt-6 grid gap-6 sm:grid-cols-2 print:grid-cols-2">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Prepared for</div>
            <div className="mt-1 text-base font-bold text-slate-900">{quote.buyer}</div>
            {quote.buyerContact ? <div className="text-sm text-slate-600">Attn: {quote.buyerContact}</div> : null}
            {quote.buyerEmail ? <div className="text-sm text-slate-600">{quote.buyerEmail}</div> : null}
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Delivery terms</div><div className="font-semibold">{quote.incoterm}</div></div>
            <div><div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Destination</div><div className="font-semibold">{quote.destination || "—"}</div></div>
          </div>
        </section>

        <table className="mt-6 w-full text-left text-sm">
          <thead>
            <tr className="bg-slate-900 text-[11px] uppercase tracking-wide text-white print:bg-slate-900">
              <th className="px-3 py-2.5">Description of goods</th>
              <th className="px-3 py-2.5">Packing</th>
              <th className="px-3 py-2.5 text-right">Quantity</th>
              <th className="px-3 py-2.5 text-right">Unit price</th>
              <th className="px-3 py-2.5 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-200 align-top">
              <td className="px-3 py-3"><div className="font-semibold">{quote.product}</div>{quote.grade ? <div className="text-xs text-slate-500">{quote.grade}</div> : null}</td>
              <td className="px-3 py-3 text-slate-600">{quote.packing || "—"}{quote.cartons ? <div className="text-xs">{number(quote.cartons)} cartons</div> : null}</td>
              <td className="px-3 py-3 text-right font-mono">{number(quote.quantityKg)} KG</td>
              <td className="px-3 py-3 text-right font-mono">{usd(quote.priceUsdPerKg, 3)} / KG</td>
              <td className="px-3 py-3 text-right font-mono font-bold">{usd(totals.total)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colSpan="4" className="px-3 pt-4 text-right text-xs font-bold uppercase tracking-wide text-slate-500">Total ({quote.incoterm})</td>
              <td className="px-3 pt-4 text-right font-mono text-lg font-black text-blue-800">{usd(totals.total)}</td>
            </tr>
            <tr>
              <td colSpan="4" className="px-3 text-right text-xs text-slate-400">Approx. in AED at {rates.usdToAed}</td>
              <td className="px-3 text-right font-mono text-xs text-slate-500">AED {number(totals.total * rates.usdToAed, 2)}</td>
            </tr>
          </tfoot>
        </table>

        <section className="mt-8 grid gap-6 sm:grid-cols-2 print:grid-cols-2">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Payment terms</div>
            <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{quote.paymentTerms || "—"}</p>
            {quote.notes ? (
              <>
                <div className="mt-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Notes</div>
                <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{quote.notes}</p>
              </>
            ) : null}
          </div>
          <div className="flex flex-col justify-end text-right">
            <div className="ml-auto h-12 w-48 border-b border-slate-300" />
            <div className="mt-1 text-xs font-semibold text-slate-600">For {seller.sellerName || "HADI IMPEX"}</div>
            <div className="text-[11px] text-slate-400">Authorised signatory</div>
          </div>
        </section>

        <p className="mt-8 border-t border-slate-100 pt-3 text-center text-[10px] text-slate-400">
          This quotation is valid until {formatDate(quote.validUntil)} and subject to availability at the time of confirmation.
        </p>
      </article>

      {canWrite ? (
        <div className="no-print mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
          <div className="font-bold text-slate-900">Internal (not printed)</div>
          <div className="mt-1 text-slate-600">
            Landed cost {quote.costUsdPerKg ? `${usd(quote.costUsdPerKg, 3)} / KG` : "not entered"}
            {totals.marginPct == null ? "" : ` · Margin ${usd(totals.margin, 0)} (${totals.marginPct.toFixed(1)}%)`}
          </div>
        </div>
      ) : null}

      {editing ? <QuotationForm quote={quote} onClose={() => setEditing(false)} /> : null}
    </div>
  );
}
