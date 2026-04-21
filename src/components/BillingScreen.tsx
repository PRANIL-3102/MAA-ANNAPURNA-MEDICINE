import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X, Trash2, Plus, Minus, AlertTriangle } from "lucide-react";
import { useInventory, flatBatches } from "@/store/inventory";
import { useBilling, computeTotals } from "@/store/billing";
import { useInvoices } from "@/store/invoices";
import { downloadInvoicePDF } from "@/lib/invoice-pdf";
import { formatINR, formatDate, daysUntil } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function BillingScreen() {
  const products = useInventory((s) => s.products);
  const decrementBatch = useInventory((s) => s.decrementBatch);
  const addInvoice = useInvoices((s) => s.add);
  const billing = useBilling();
  const totals = useMemo(
    () => computeTotals(billing.items, billing.globalDiscount),
    [billing.items, billing.globalDiscount],
  );

  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = flatBatches(products).filter(({ batch }) => batch.stock > 0);
    if (!q) return all.slice(0, 8);
    return all
      .filter(
        ({ product, batch }) =>
          product.name.toLowerCase().includes(q) ||
          product.manufacturer.toLowerCase().includes(q) ||
          batch.batchNo.toLowerCase().includes(q),
      )
      .slice(0, 12);
  }, [products, query]);

  useEffect(() => setHighlighted(0), [query]);

  // Global keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleCheckout();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billing.items, totals.total]);

  const handleAdd = (idx: number) => {
    const r = results[idx];
    if (!r) return;
    billing.addItem({
      productId: r.product.id,
      productName: r.product.name,
      batchId: r.batch.id,
      batchNo: r.batch.batchNo,
      expiry: r.batch.expiry,
      price: r.batch.sellingPrice,
      gst: r.batch.gst,
    });
    setQuery("");
    searchRef.current?.focus();
  };

  const handleCheckout = () => {
    if (billing.items.length === 0) {
      toast.error("Add items before checkout");
      return;
    }
    for (const it of billing.items) {
      decrementBatch(it.batchId, it.qty);
    }
    const inv = addInvoice({
      customer: billing.customer,
      payment: billing.payment,
      items: billing.items,
      totals,
      globalDiscount: billing.globalDiscount,
    });
    downloadInvoicePDF(inv);
    toast.success(`${inv.number} · ${formatINR(totals.total)}`, {
      description: "PDF downloaded",
    });
    billing.reset();
  };

  return (
    <div className="grid h-full grid-cols-[320px_1fr_340px] divide-x divide-border">
      {/* LEFT — search + results */}
      <section className="flex flex-col overflow-hidden bg-surface/40">
        <div className="border-b border-border p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={searchRef}
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setHighlighted((h) => Math.min(h + 1, results.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setHighlighted((h) => Math.max(h - 1, 0));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  handleAdd(highlighted);
                } else if (e.key === "Escape") {
                  setQuery("");
                }
              }}
              placeholder="Search medicine, batch…"
              className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-8 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{results.length} results</span>
            <span>
              <kbd>↑↓</kbd> <kbd>Enter</kbd>
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {results.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              No medicines match "{query}"
            </div>
          ) : (
            <ul className="p-1.5">
              {results.map((r, idx) => {
                const exp = daysUntil(r.batch.expiry);
                const isLow = r.batch.stock < 20;
                return (
                  <li key={r.batch.id}>
                    <button
                      onClick={() => handleAdd(idx)}
                      onMouseEnter={() => setHighlighted(idx)}
                      className={cn(
                        "group flex w-full flex-col gap-0.5 rounded-md px-2.5 py-2 text-left transition-colors",
                        idx === highlighted
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-muted",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">
                          {r.product.name}
                        </span>
                        <span className="shrink-0 font-mono text-xs">
                          {formatINR(r.batch.sellingPrice)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                        <span className="truncate">
                          {r.product.manufacturer} · {r.batch.batchNo}
                        </span>
                        <span className="flex items-center gap-1.5">
                          {exp < 60 && (
                            <span
                              className={cn(
                                "rounded px-1 py-px text-[10px] font-medium",
                                exp < 0
                                  ? "bg-destructive/15 text-destructive"
                                  : "bg-warning/15 text-warning-foreground",
                              )}
                            >
                              {exp < 0 ? "Expired" : `${exp}d`}
                            </span>
                          )}
                          <span className={isLow ? "text-warning-foreground" : ""}>
                            {r.batch.stock} in stock
                          </span>
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* CENTER — line items */}
      <section className="flex flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {billing.items.length} item{billing.items.length === 1 ? "" : "s"}
            </span>
            <span>·</span>
            <span>Auto-saved</span>
          </div>
          {billing.items.length > 0 && (
            <button
              onClick={billing.reset}
              className="text-xs text-muted-foreground hover:text-destructive"
            >
              Clear all
            </button>
          )}
        </div>

        {billing.items.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Search className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">Start by searching a medicine</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Press <kbd>/</kbd> to focus search · <kbd>Enter</kbd> to add
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-background text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-4 py-2 text-left font-medium">Item</th>
                  <th className="px-2 py-2 text-left font-medium">Batch</th>
                  <th className="px-2 py-2 text-right font-medium">Qty</th>
                  <th className="px-2 py-2 text-right font-medium">Price</th>
                  <th className="px-2 py-2 text-right font-medium">Disc%</th>
                  <th className="px-2 py-2 text-right font-medium">GST%</th>
                  <th className="px-4 py-2 text-right font-medium">Amount</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {billing.items.map((it) => {
                  const exp = daysUntil(it.expiry);
                  const lineAmt =
                    it.qty * it.price * (1 - it.discount / 100);
                  return (
                    <tr
                      key={it.id}
                      className="border-b border-border/60 hover:bg-surface"
                    >
                      <td className="px-4 py-2">
                        <div className="font-medium">{it.productName}</div>
                        {exp < 60 && (
                          <div className="mt-0.5 flex items-center gap-1 text-[10px] text-warning-foreground">
                            <AlertTriangle className="h-3 w-3" />
                            {exp < 0 ? "Expired" : `Expires in ${exp}d`}
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-2 font-mono text-xs text-muted-foreground">
                        {it.batchNo}
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center justify-end gap-0.5">
                          <button
                            onClick={() =>
                              it.qty > 1 &&
                              billing.updateItem(it.id, { qty: it.qty - 1 })
                            }
                            className="rounded p-1 text-muted-foreground hover:bg-muted"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <input
                            type="number"
                            value={it.qty}
                            min={1}
                            onChange={(e) =>
                              billing.updateItem(it.id, {
                                qty: Math.max(1, Number(e.target.value) || 1),
                              })
                            }
                            className="h-7 w-12 rounded border border-input bg-background text-center text-sm tabular-nums outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                          />
                          <button
                            onClick={() =>
                              billing.updateItem(it.id, { qty: it.qty + 1 })
                            }
                            className="rounded p-1 text-muted-foreground hover:bg-muted"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                      <td className="px-2 py-2 text-right font-mono text-sm tabular-nums">
                        {formatINR(it.price)}
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          value={it.discount}
                          min={0}
                          max={100}
                          onChange={(e) =>
                            billing.updateItem(it.id, {
                              discount: Math.min(
                                100,
                                Math.max(0, Number(e.target.value) || 0),
                              ),
                            })
                          }
                          className="h-7 w-14 rounded border border-input bg-background text-right text-sm tabular-nums outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                        />
                      </td>
                      <td className="px-2 py-2 text-right font-mono text-xs text-muted-foreground tabular-nums">
                        {it.gst}%
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-sm font-medium tabular-nums">
                        {formatINR(lineAmt)}
                      </td>
                      <td className="pr-3">
                        <button
                          onClick={() => billing.removeItem(it.id)}
                          className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* RIGHT — totals */}
      <section className="flex flex-col overflow-hidden bg-surface/40">
        <div className="border-b border-border p-4">
          <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Customer
          </label>
          <input
            value={billing.customer}
            onChange={(e) => billing.setCustomer(e.target.value)}
            placeholder="Walk-in customer"
            className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <Row label="Subtotal" value={formatINR(totals.subtotal)} />
          {totals.lineDiscount > 0 && (
            <Row
              label="Line discounts"
              value={`− ${formatINR(totals.lineDiscount)}`}
              muted
            />
          )}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">Bill discount</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                max={100}
                value={billing.globalDiscount}
                onChange={(e) =>
                  billing.setGlobalDiscount(
                    Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                  )
                }
                className="h-7 w-14 rounded border border-input bg-background text-right text-sm tabular-nums outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
              />
              <span className="text-xs text-muted-foreground">%</span>
            </div>
          </div>
          {totals.globalDiscount > 0 && (
            <Row
              label=""
              value={`− ${formatINR(totals.globalDiscount)}`}
              muted
            />
          )}
          <div className="border-t border-border pt-3">
            <Row label="Taxable" value={formatINR(totals.taxable)} />
            <Row label="GST" value={formatINR(totals.gst)} />
          </div>

          <div className="mt-2 border-t border-border pt-3">
            <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Payment
            </label>
            <div className="mt-1.5 grid grid-cols-3 gap-1 rounded-md border border-input p-0.5">
              {(["cash", "upi", "credit"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => billing.setPayment(m)}
                  className={cn(
                    "rounded px-2 py-1.5 text-xs font-medium capitalize transition-colors",
                    billing.payment === m
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-border p-4 space-y-3 bg-background">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-medium">Total</span>
            <span className="font-mono text-2xl font-semibold tracking-tight tabular-nums">
              {formatINR(totals.total)}
            </span>
          </div>
          <button
            onClick={handleCheckout}
            disabled={billing.items.length === 0}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Generate Invoice
            <kbd className="border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground/80">
              ⌘ ⏎
            </kbd>
          </button>
        </div>
      </section>
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
