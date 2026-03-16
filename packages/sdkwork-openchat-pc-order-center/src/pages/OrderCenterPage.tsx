import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

interface OrderItem {
  id: string;
  customer: string;
  amount: number;
  status: "pending" | "paid" | "shipped" | "completed";
  createdAt: string;
  items: number;
}

const ORDERS: OrderItem[] = [
  { id: "ord-9001", customer: "ACME Inc.", amount: 1260, status: "pending", createdAt: "2026-03-08T08:45:00+08:00", items: 4 },
  { id: "ord-9002", customer: "Nova Studio", amount: 3890, status: "paid", createdAt: "2026-03-08T09:12:00+08:00", items: 8 },
  { id: "ord-9003", customer: "Lattice Labs", amount: 980, status: "shipped", createdAt: "2026-03-08T09:58:00+08:00", items: 2 },
  { id: "ord-9004", customer: "Quark Team", amount: 240, status: "completed", createdAt: "2026-03-08T10:18:00+08:00", items: 1 },
];

function formatTime(value: string): string {
  return new Date(value).toLocaleString();
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select" || target.isContentEditable;
}

const statusFlow: OrderItem["status"][] = ["pending", "paid", "shipped", "completed"];

export function OrderCenterPage() {
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [orders, setOrders] = useState<OrderItem[]>(ORDERS);
  const [status, setStatus] = useState<"all" | OrderItem["status"]>("all");
  const [keyword, setKeyword] = useState("");
  const [selectedId, setSelectedId] = useState(ORDERS[0]?.id || "");
  const [actionMessage, setActionMessage] = useState("Tip: Ctrl/Cmd+F search, Arrow Up/Down select, Ctrl+Enter update.");

  const filtered = useMemo(() => {
    const query = keyword.trim().toLowerCase();
    return orders.filter((item) => {
      if (status !== "all" && item.status !== status) {
        return false;
      }
      if (!query) {
        return true;
      }
      return `${item.id} ${item.customer}`.toLowerCase().includes(query);
    });
  }, [keyword, orders, status]);

  useEffect(() => {
    if (!filtered.some((item) => item.id === selectedId)) {
      setSelectedId(filtered[0]?.id || "");
    }
  }, [filtered, selectedId]);

  const selected = useMemo(
    () => filtered.find((item) => item.id === selectedId) || filtered[0] || null,
    [filtered, selectedId],
  );

  const totalAmount = useMemo(
    () => filtered.reduce((sum, item) => sum + item.amount, 0),
    [filtered],
  );

  function notifyAction(message: string): void {
    setActionMessage(`${new Date().toLocaleTimeString()} - ${message}`);
  }

  function advanceOrderStatus(): void {
    if (!selected) {
      return;
    }
    const currentIndex = statusFlow.indexOf(selected.status);
    const nextStatus = statusFlow[Math.min(statusFlow.length - 1, currentIndex + 1)];
    setOrders((current) =>
      current.map((item) => {
        if (item.id !== selected.id) {
          return item;
        }
        return { ...item, status: nextStatus };
      }),
    );
    if (nextStatus !== selected.status) {
      notifyAction(`Order ${selected.id} moved to ${nextStatus}.`);
    } else {
      notifyAction(`Order ${selected.id} is already in final status.`);
    }
  }

  useEffect(() => {
    function onWindowKeyDown(event: KeyboardEvent): void {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        advanceOrderStatus();
        return;
      }

      if (isTypingTarget(event.target)) {
        return;
      }

      if (!filtered.length) {
        return;
      }

      const currentIndex = filtered.findIndex((item) => item.id === selectedId);
      const safeIndex = currentIndex >= 0 ? currentIndex : 0;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        const nextIndex = Math.min(filtered.length - 1, safeIndex + 1);
        setSelectedId(filtered[nextIndex].id);
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        const nextIndex = Math.max(0, safeIndex - 1);
        setSelectedId(filtered[nextIndex].id);
      }
    }

    window.addEventListener("keydown", onWindowKeyDown);
    return () => {
      window.removeEventListener("keydown", onWindowKeyDown);
    };
  }, [filtered, selectedId]);

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col bg-bg-primary">
      <header className="border-b border-border bg-bg-secondary/70 px-6 py-5 backdrop-blur-sm">
        <h1 className="text-xl font-semibold text-text-primary">Order Center</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Unified desktop order cockpit for tracking payment, delivery and fulfillment actions.
        </p>
      </header>

      <div className="flex-1 overflow-hidden p-6">
        <div className="grid h-full min-h-[560px] gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="flex min-h-0 flex-col rounded-xl border border-border bg-bg-secondary">
            <div className="border-b border-border p-4">
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs uppercase tracking-wide text-text-muted">
                  Status
                  <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value as typeof status)}
                    className="mt-2 h-9 w-full rounded-md border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
                  >
                    <option value="all">All</option>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="shipped">Shipped</option>
                    <option value="completed">Completed</option>
                  </select>
                </label>
                <label className="text-xs uppercase tracking-wide text-text-muted">
                  Search
                  <input
                    ref={searchInputRef}
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    placeholder="Order ID / customer"
                    className="mt-2 h-9 w-full rounded-md border border-border bg-bg-tertiary px-3 text-sm text-text-primary"
                  />
                </label>
              </div>
              <p className="mt-2 text-[11px] text-text-muted">Shortcuts: Ctrl/Cmd+F, Arrow Up/Down, Ctrl+Enter</p>
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-3">
              <div className="space-y-2">
                {filtered.map((item) => {
                  const active = selected?.id === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      className={`w-full rounded-lg border px-3 py-2 text-left ${
                        active
                          ? "border-primary bg-primary-soft/25"
                          : "border-border bg-bg-primary hover:bg-bg-hover"
                      }`}
                    >
                      <p className="text-sm font-semibold text-text-primary">{item.id}</p>
                      <p className="mt-1 text-xs text-text-secondary">{item.customer}</p>
                      <p className="mt-1 text-[11px] text-text-muted">CNY {item.amount.toFixed(2)}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          <section className="flex min-h-0 flex-col rounded-xl border border-border bg-bg-secondary p-5">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-border bg-bg-primary px-3 py-2">
                <p className="text-[11px] text-text-muted">Orders</p>
                <p className="text-sm font-semibold text-text-primary">{filtered.length}</p>
              </div>
              <div className="rounded-lg border border-border bg-bg-primary px-3 py-2">
                <p className="text-[11px] text-text-muted">Total Amount</p>
                <p className="text-sm font-semibold text-text-primary">CNY {totalAmount.toFixed(2)}</p>
              </div>
              <div className="rounded-lg border border-border bg-bg-primary px-3 py-2">
                <p className="text-[11px] text-text-muted">Pending</p>
                <p className="text-sm font-semibold text-text-primary">
                  {filtered.filter((item) => item.status === "pending").length}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-border bg-bg-primary p-4">
              {selected ? (
                <>
                  <h2 className="text-lg font-semibold text-text-primary">{selected.id}</h2>
                  <div className="mt-2 space-y-1 text-sm text-text-secondary">
                    <p>Customer: {selected.customer}</p>
                    <p>Status: {selected.status}</p>
                    <p>Items: {selected.items}</p>
                    <p>Created: {formatTime(selected.createdAt)}</p>
                    <p>Amount: CNY {selected.amount.toFixed(2)}</p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={advanceOrderStatus}
                      className="rounded-md bg-primary px-3 py-1.5 text-xs text-white"
                    >
                      Update Status (Ctrl+Enter)
                    </button>
                    <button
                      onClick={() => navigate("/shopping")}
                      className="rounded-md border border-border bg-bg-tertiary px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover"
                    >
                      Continue Shopping
                    </button>
                    <button
                      onClick={() => navigate("/commerce/cart")}
                      className="rounded-md border border-border bg-bg-tertiary px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-hover"
                    >
                      Open Cart
                    </button>
                  </div>
                  <p className="mt-3 rounded-md border border-border bg-bg-tertiary px-3 py-2 text-xs text-text-secondary">
                    {actionMessage}
                  </p>
                </>
              ) : (
                <p className="text-sm text-text-muted">No order selected.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}

export default OrderCenterPage;
