import { useMemo, useState } from "react";
import { Search, Download, Receipt, Eye, X } from "lucide-react";
import { useInvoices, type Invoice } from "@/store/invoices";
import { downloadInvoicePDF } from "@/lib/invoice-pdf";
import { formatINR, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export function HistoryScreen() {
  const invoices = useInvoices((s) => s.invoices);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "cash" | "upi" | "credit">("all");
  const [preview, setPreview] = useState<Invoice | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return invoices.filter((inv) => {
      if (filter !== "all" && inv.payment !== filter) return false;
      if (!q) return true;
      return (
        inv.number.toLowerCase().includes(q) ||
        inv.customer.toLowerCase().includes(q) ||
        inv.items.some((i) => i.productName.toLowerCase().includes(q))
      );
    });
  }, [invoices, query, filter]);

  const stats = useMemo(() => {
    const total = invoices.reduce((s, i) => s + i.totals.total, 0);
    const today = new Date().toDateString();
    const todayTotal = invoices
      .filter((i) => new Date(i.createdAt).toDateString() === today)
      .reduce((s, i) => s + i.totals.total, 0);
    return { count: invoices.length, total, todayTotal };
  }, [invoices]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-border px-5 py-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search invoice #, customer, item…"
            className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
          />
        </div>
        <div className="flex items-center gap-1 rounded-md border border-input p-0.5">
          {(["all", "cash", "upi", "credit"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={cn(
                "rounded px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                filter === k
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {k}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-4 text-xs">
          <Stat label="Today" value={formatINR(stats.todayTotal)} />
          <Stat label="All-time" value={formatINR(stats.total)} />
          <Stat label="Invoices" value={String(stats.count)} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Receipt className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">
              {invoices.length === 0 ? "No invoices yet" : "No matches"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {invoices.length === 0
                ? "Generated invoices will appear here"
                : "Try a different search or filter"}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-background text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr className="border-b border-border">
                <th className="px-5 py-2.5 text-left font-medium">Invoice</th>
                <th className="px-2 py-2.5 text-left font-medium">Date</th>
                <th className="px-2 py-2.5 text-left font-medium">Customer</th>
                <th className="px-2 py-2.5 text-left font-medium">Payment</th>
                <th className="px-2 py-2.5 text-right font-medium">Items</th>
                <th className="px-2 py-2.5 text-right font-medium">Total</th>
                <th className="px-5 py-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => (
                <tr
                  key={inv.id}
                  className="border-b border-border/60 hover:bg-surface"
                >
                  <td className="px-5 py-2.5 font-mono text-xs font-medium">
                    {inv.number}
                  </td>
                  <td className="px-2 py-2.5 text-xs text-muted-foreground">
                    {new Date(inv.createdAt).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-2 py-2.5">
                    {inv.customer || (
                      <span className="text-muted-foreground">Walk-in</span>
                    )}
                  </td>
                  <td className="px-2 py-2.5">
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[10px] font-medium uppercase",
                        inv.payment === "credit"
                          ? "bg-warning/15 text-warning-foreground"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {inv.payment}
                    </span>
                  </td>
                  <td className="px-2 py-2.5 text-right font-mono text-xs tabular-nums text-muted-foreground">
                    {inv.items.length}
                  </td>
                  <td className="px-2 py-2.5 text-right font-mono text-sm font-medium tabular-nums">
                    {formatINR(inv.totals.total)}
                  </td>
                  <td className="px-5 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setPreview(inv)}
                        className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </button>
                      <button
                        onClick={() => downloadInvoicePDF(inv)}
                        className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-foreground hover:bg-muted"
                      >
                        <Download className="h-3.5 w-3.5" />
                        PDF
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {preview && (
        <InvoicePreview invoice={preview} onClose={() => setPreview(null)} />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col leading-tight">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="font-mono text-sm font-medium tabular-nums">{value}</span>
    </div>
  );
}

function InvoicePreview({
  invoice,
  onClose,
}: {
  invoice: Invoice;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-border bg-card shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div>
            <div className="font-mono text-sm font-semibold">{invoice.number}</div>
            <div className="text-xs text-muted-foreground">
              {formatDate(invoice.createdAt)} ·{" "}
              {invoice.customer || "Walk-in customer"}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => downloadInvoicePDF(invoice)}
              className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Download className="h-3.5 w-3.5" />
              Download PDF
            </button>
            <button
              onClick={onClose}
              className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr className="border-b border-border">
                <th className="py-2 text-left font-medium">Item</th>
                <th className="py-2 text-right font-medium">Qty</th>
                <th className="py-2 text-right font-medium">Rate</th>
                <th className="py-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((it) => (
                <tr key={it.id} className="border-b border-border/60">
                  <td className="py-2">
                    <div className="font-medium">{it.productName}</div>
                    <div className="font-mono text-[11px] text-muted-foreground">
                      {it.batchNo} · GST {it.gst}%
                      {it.discount > 0 && ` · ${it.discount}% off`}
                    </div>
                  </td>
                  <td className="py-2 text-right font-mono tabular-nums">
                    {it.qty}
                  </td>
                  <td className="py-2 text-right font-mono tabular-nums">
                    {formatINR(it.price)}
                  </td>
                  <td className="py-2 text-right font-mono font-medium tabular-nums">
                    {formatINR(it.qty * it.price * (1 - it.discount / 100))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 ml-auto w-64 space-y-1.5 text-sm">
            <Row label="Subtotal" value={formatINR(invoice.totals.subtotal)} />
            {invoice.totals.lineDiscount > 0 && (
              <Row
                label="Line discounts"
                value={`− ${formatINR(invoice.totals.lineDiscount)}`}
                muted
              />
            )}
            {invoice.totals.globalDiscount > 0 && (
              <Row
                label={`Bill discount (${invoice.globalDiscount}%)`}
                value={`− ${formatINR(invoice.totals.globalDiscount)}`}
                muted
              />
            )}
            <Row label="Taxable" value={formatINR(invoice.totals.taxable)} />
            <Row label="GST" value={formatINR(invoice.totals.gst)} />
            <div className="mt-2 flex items-baseline justify-between border-t border-border pt-2">
              <span className="font-medium">Total</span>
              <span className="font-mono text-lg font-semibold tabular-nums">
                {formatINR(invoice.totals.total)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "font-mono tabular-nums",
          muted ? "text-muted-foreground" : "text-foreground",
        )}
      >
        {value}
      </span>
    </div>
  );
}
