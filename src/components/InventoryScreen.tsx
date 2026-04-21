import { useMemo, useState } from "react";
import { Search, AlertTriangle, Package } from "lucide-react";
import { useInventory, flatBatches } from "@/store/inventory";
import { formatINR, formatDate, daysUntil } from "@/lib/format";
import { cn } from "@/lib/utils";

type Filter = "all" | "low" | "expiring" | "expired";

export function InventoryScreen() {
  const products = useInventory((s) => s.products);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return flatBatches(products).filter(({ product, batch }) => {
      const matches =
        !q ||
        product.name.toLowerCase().includes(q) ||
        product.manufacturer.toLowerCase().includes(q) ||
        batch.batchNo.toLowerCase().includes(q);
      if (!matches) return false;
      const exp = daysUntil(batch.expiry);
      if (filter === "low") return batch.stock < 20;
      if (filter === "expiring") return exp >= 0 && exp < 90;
      if (filter === "expired") return exp < 0;
      return true;
    });
  }, [products, query, filter]);

  const counts = useMemo(() => {
    const all = flatBatches(products);
    return {
      all: all.length,
      low: all.filter((r) => r.batch.stock < 20).length,
      expiring: all.filter((r) => {
        const e = daysUntil(r.batch.expiry);
        return e >= 0 && e < 90;
      }).length,
      expired: all.filter((r) => daysUntil(r.batch.expiry) < 0).length,
    };
  }, [products]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-border px-5 py-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search inventory…"
            className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
          />
        </div>
        <div className="flex items-center gap-1 rounded-md border border-input p-0.5">
          {(
            [
              ["all", "All", counts.all],
              ["low", "Low stock", counts.low],
              ["expiring", "Expiring", counts.expiring],
              ["expired", "Expired", counts.expired],
            ] as const
          ).map(([k, label, c]) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={cn(
                "flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors",
                filter === k
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
              <span
                className={cn(
                  "rounded px-1 text-[10px] tabular-nums",
                  filter === k ? "bg-background/20" : "bg-muted",
                )}
              >
                {c}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-background text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr className="border-b border-border">
              <th className="px-5 py-2.5 text-left font-medium">Medicine</th>
              <th className="px-2 py-2.5 text-left font-medium">Batch</th>
              <th className="px-2 py-2.5 text-left font-medium">Expiry</th>
              <th className="px-2 py-2.5 text-right font-medium">Stock</th>
              <th className="px-2 py-2.5 text-right font-medium">Purchase</th>
              <th className="px-2 py-2.5 text-right font-medium">MRP</th>
              <th className="px-2 py-2.5 text-right font-medium">Selling</th>
              <th className="px-5 py-2.5 text-right font-medium">Margin</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ product, batch }) => {
              const exp = daysUntil(batch.expiry);
              const margin =
                ((batch.sellingPrice - batch.purchasePrice) /
                  batch.purchasePrice) *
                100;
              return (
                <tr
                  key={batch.id}
                  className="border-b border-border/60 hover:bg-surface"
                >
                  <td className="px-5 py-2.5">
                    <div className="font-medium">{product.name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {product.manufacturer} · {product.pack}
                    </div>
                  </td>
                  <td className="px-2 py-2.5 font-mono text-xs text-muted-foreground">
                    {batch.batchNo}
                  </td>
                  <td className="px-2 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs">{formatDate(batch.expiry)}</span>
                      {exp < 0 ? (
                        <span className="rounded bg-destructive/15 px-1.5 py-px text-[10px] font-medium text-destructive">
                          Expired
                        </span>
                      ) : exp < 90 ? (
                        <span className="rounded bg-warning/15 px-1.5 py-px text-[10px] font-medium text-warning-foreground">
                          {exp}d
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td
                    className={cn(
                      "px-2 py-2.5 text-right font-mono text-sm tabular-nums",
                      batch.stock < 20 && "text-warning-foreground font-medium",
                    )}
                  >
                    {batch.stock}
                  </td>
                  <td className="px-2 py-2.5 text-right font-mono text-xs text-muted-foreground tabular-nums">
                    {formatINR(batch.purchasePrice)}
                  </td>
                  <td className="px-2 py-2.5 text-right font-mono text-xs text-muted-foreground tabular-nums">
                    {formatINR(batch.mrp)}
                  </td>
                  <td className="px-2 py-2.5 text-right font-mono text-sm tabular-nums">
                    {formatINR(batch.sellingPrice)}
                  </td>
                  <td className="px-5 py-2.5 text-right font-mono text-xs text-success tabular-nums">
                    +{margin.toFixed(0)}%
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="py-16 text-center text-sm text-muted-foreground">
                  <Package className="mx-auto mb-2 h-8 w-8 opacity-30" />
                  No batches match your filter
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
