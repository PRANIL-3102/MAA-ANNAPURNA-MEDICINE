import { useMemo } from "react";
import { TrendingUp, AlertTriangle, Clock, Wallet } from "lucide-react";
import { useInventory, flatBatches } from "@/store/inventory";
import { useInvoices } from "@/store/invoices";
import { formatINR, formatDate, daysUntil } from "@/lib/format";
import { cn } from "@/lib/utils";

export function DashboardScreen() {
  const products = useInventory((s) => s.products);
  const invoices = useInvoices((s) => s.invoices);

  const todaySales = useMemo(() => {
    const today = new Date().toDateString();
    return invoices
      .filter((i) => new Date(i.createdAt).toDateString() === today)
      .reduce((s, i) => s + i.totals.total, 0);
  }, [invoices]);

  const stats = useMemo(() => {
    const batches = flatBatches(products);
    const lowStock = batches.filter((b) => b.batch.stock < 20);
    const expiring = batches.filter((b) => {
      const d = daysUntil(b.batch.expiry);
      return d >= 0 && d < 90;
    });
    const expired = batches.filter((b) => daysUntil(b.batch.expiry) < 0);
    const stockValue = batches.reduce(
      (sum, b) => sum + b.batch.stock * b.batch.purchasePrice,
      0,
    );
    return { lowStock, expiring, expired, stockValue };
  }, [products]);

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="grid grid-cols-4 gap-4">
        <Stat
          icon={TrendingUp}
          label="Today's sales"
          value={formatINR(todaySales)}
          hint={todaySales > 0 ? `${invoices.length} total invoices` : "No invoices yet"}
          tone="default"
        />
        <Stat
          icon={Wallet}
          label="Stock value"
          value={formatINR(stats.stockValue)}
          hint={`${products.length} products`}
          tone="default"
        />
        <Stat
          icon={AlertTriangle}
          label="Low stock"
          value={String(stats.lowStock.length)}
          hint="Below 20 units"
          tone={stats.lowStock.length > 0 ? "warning" : "default"}
        />
        <Stat
          icon={Clock}
          label="Expiring soon"
          value={String(stats.expiring.length)}
          hint="Within 90 days"
          tone={stats.expiring.length > 0 ? "warning" : "default"}
        />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <Panel
          title="Low stock alerts"
          empty={stats.lowStock.length === 0}
          emptyText="All products well stocked"
        >
          <ul className="divide-y divide-border">
            {stats.lowStock.slice(0, 6).map(({ product, batch }) => (
              <li
                key={batch.id}
                className="flex items-center justify-between py-2.5"
              >
                <div>
                  <div className="text-sm font-medium">{product.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    Batch {batch.batchNo}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm font-medium text-warning-foreground tabular-nums">
                    {batch.stock} left
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          title="Expiring medicines"
          empty={stats.expiring.length + stats.expired.length === 0}
          emptyText="No upcoming expiries"
        >
          <ul className="divide-y divide-border">
            {[...stats.expired, ...stats.expiring].slice(0, 6).map(({ product, batch }) => {
              const d = daysUntil(batch.expiry);
              return (
                <li
                  key={batch.id}
                  className="flex items-center justify-between py-2.5"
                >
                  <div>
                    <div className="text-sm font-medium">{product.name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      Batch {batch.batchNo} · {formatDate(batch.expiry)}
                    </div>
                  </div>
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[11px] font-medium",
                      d < 0
                        ? "bg-destructive/15 text-destructive"
                        : "bg-warning/15 text-warning-foreground",
                    )}
                  >
                    {d < 0 ? "Expired" : `${d}d`}
                  </span>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint: string;
  tone: "default" | "warning";
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <Icon
          className={cn(
            "h-4 w-4",
            tone === "warning" ? "text-warning-foreground" : "text-muted-foreground",
          )}
        />
      </div>
      <div className="mt-2 font-mono text-2xl font-semibold tracking-tight tabular-nums">
        {value}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}

function Panel({
  title,
  empty,
  emptyText,
  children,
}: {
  title: string;
  empty: boolean;
  emptyText: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="border-b border-border px-4 py-2.5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h2>
      </div>
      <div className="px-4 py-1">
        {empty ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            {emptyText}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
