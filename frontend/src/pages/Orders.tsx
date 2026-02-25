import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Search, ChevronDown, ChevronUp, Calendar, MapPin, User, Package, CreditCard, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@clerk/clerk-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type OrderStatus = "Pending" | "Confirmed" | "Shipped" | "Cancelled";

type OrderItemDetail = {
  sku: string;
  title: string;
  quantity: number;
  price: string;
  image_url: string | null;
};

type OrderData = {
  id: string;
  original_id: number;
  customer: string;
  phone: string;
  address: string;
  items: string;
  detailed_items?: OrderItemDetail[];
  total: string;
  status: OrderStatus;
  created_at?: string;
};

const statusColors: Record<string, string> = {
  Pending: "bg-accent/20 text-accent",
  Confirmed: "bg-primary/20 text-primary",
  Shipped: "bg-chart-2/20 text-chart-2",
  Cancelled: "bg-red-500/20 text-red-500",
};

const Orders = () => {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");

  // New States for filter and expandable row
  const [dateFilter, setDateFilter] = useState<"All" | "Today" | "Week" | "Month">("All");
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // 1. Fetch orders using React Query
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch("http://localhost:8000/orders", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch orders");
      return (await res.json()) as OrderData[];
    },
    staleTime: 1000 * 60 * 5, // Cache data for 5 minutes without re-fetching
  });

  // 2. Mutation for updating status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ original_id, status }: { original_id: number, status: OrderStatus }) => {
      const token = await getToken();
      const res = await fetch(`http://localhost:8000/orders/${original_id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    // Optimistic Update
    onMutate: async (newStatus) => {
      await queryClient.cancelQueries({ queryKey: ['orders'] });
      const previousOrders = queryClient.getQueryData(['orders']);
      queryClient.setQueryData(['orders'], (old: OrderData[] | undefined) => {
        if (!old) return old;
        return old.map(o => o.original_id === newStatus.original_id ? { ...o, status: newStatus.status } : o);
      });
      return { previousOrders };
    },
    onError: (err, newStatus, context) => {
      if (context?.previousOrders) {
        queryClient.setQueryData(['orders'], context.previousOrders);
      }
      toast({ title: "Error", description: "Failed to update order status.", variant: "destructive" });
    },
    onSettled: () => {
      // Invalidate to make sure server and client are completely in sync
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    }
  });

  const updateStatus = (id: string, original_id: number, status: OrderStatus) => {
    updateStatusMutation.mutate({ original_id, status });
  };

  const exportCSV = () => {
    const confirmed = orders.filter((o) => o.status === "Confirmed");
    toast({
      title: "Export Ready",
      description: `${confirmed.length} confirmed orders exported for courier upload`,
    });
  };

  // Helper date logic
  const isDateInRange = (dateString?: string, range?: string) => {
    if (!range || range === "All") return true;
    if (!dateString) return false;

    // Using string matching / local parsing based on your created_at formatting
    const orderDate = new Date(dateString);
    const now = new Date();

    // Normalize bounds to midnight
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (range === "Today") {
      return orderDate >= startOfToday;
    }

    if (range === "Week") {
      const weekAgo = new Date(startOfToday);
      weekAgo.setDate(startOfToday.getDate() - 7);
      return orderDate >= weekAgo;
    }

    if (range === "Month") {
      const monthAgo = new Date(startOfToday);
      monthAgo.setMonth(startOfToday.getMonth() - 1);
      return orderDate >= monthAgo;
    }

    return true;
  };

  const filtered = orders.filter(
    (o) =>
      (o.customer.toLowerCase().includes(search.toLowerCase()) ||
        o.id.toLowerCase().includes(search.toLowerCase())) &&
      isDateInRange(o.created_at, dateFilter)
  );

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Orders</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Manage AI-generated COD orders
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
          {/* New Date Filter Dropdown */}
          <div className="relative flex-1 sm:flex-none">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="appearance-none bg-card border border-border rounded-xl text-sm pl-4 pr-10 py-2 outline-none focus:ring-2 focus:ring-primary/50 text-foreground font-medium w-full cursor-pointer"
            >
              <option className="bg-background text-foreground" value="All">All Time</option>
              <option className="bg-background text-foreground" value="Today">Today</option>
              <option className="bg-background text-foreground" value="Week">Last 7 Days</option>
              <option className="bg-background text-foreground" value="Month">Last 30 Days</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
          <Button onClick={exportCSV} className="gradient-primary text-primary-foreground flex-1 sm:flex-none">
            <Download className="h-4 w-4 mr-2" />
            Export for Courier
          </Button>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-xl overflow-hidden"
      >
        <div className="p-4 border-b border-border">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Order ID or Customer..."
              className="w-full bg-secondary rounded-lg pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {["Order ID", "Customer", "Phone", "Total", "Status", "Actions"].map(
                  (h) => (
                    <th
                      key={h}
                      className={`text-left text-xs font-medium text-muted-foreground p-4 ${h === "Actions" ? "text-right" : ""}`}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">
                    <RefreshCw className="h-4 w-4 animate-spin inline-block mr-2 text-primary" />
                    Loading orders...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-muted-foreground">
                    <p className="text-sm">No orders found matching your criteria.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((order) => (
                  <optgroup key={order.id} className="contents">
                    <tr
                      className={`border-b border-border/50 hover:bg-muted/20 transition-colors ${expandedOrderId === order.id ? "bg-muted/10 border-b-transparent" : ""
                        }`}
                    >
                      <td className="p-4 text-sm font-mono text-primary font-medium">
                        <div className="flex flex-col">
                          <span>{order.id}</span>
                          {order.created_at && (
                            <span className="text-[10px] text-muted-foreground font-sans mt-0.5">
                              {new Date(order.created_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-foreground font-medium">
                        {order.customer}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground font-mono">
                        {order.phone}
                      </td>
                      <td className="p-4 text-sm text-foreground font-medium">
                        {order.total}
                      </td>
                      <td className="p-4">
                        <div className="relative inline-block w-full min-w-[110px]">
                          <select
                            value={order.status}
                            onChange={(e) =>
                              updateStatus(order.id, order.original_id, e.target.value as OrderStatus)
                            }
                            className={`appearance-none w-full text-xs font-medium px-3 pr-8 py-1.5 rounded-xl border-0 outline-none cursor-pointer ${statusColors[order.status] || "bg-muted text-foreground"}`}
                          >
                            <option className="bg-background text-foreground font-sans" value="Pending">Pending</option>
                            <option className="bg-background text-foreground font-sans" value="Confirmed">Confirmed</option>
                            <option className="bg-background text-foreground font-sans" value="Shipped">Shipped</option>
                            <option className="bg-background text-foreground font-sans" value="Cancelled">Cancelled</option>
                          </select>
                          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 opacity-50 pointer-events-none" />
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-primary hover:text-primary hover:bg-primary/10"
                          onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                        >
                          {expandedOrderId === order.id ? (
                            <>Close <ChevronUp className="h-4 w-4 ml-1" /></>
                          ) : (
                            <>Details <ChevronDown className="h-4 w-4 ml-1" /></>
                          )}
                        </Button>
                      </td>
                    </tr>

                    {/* Dropdown Row */}
                    <AnimatePresence initial={false}>
                      {expandedOrderId === order.id && (
                        <tr className="border-b border-border/50 bg-muted/10">
                          <td colSpan={6} className="p-0">
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 border-t border-border/50">
                                {/* Left Col - Info */}
                                <div className="space-y-6">
                                  <div>
                                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                                      <User className="h-3 w-3" /> Delivery Address
                                    </h4>
                                    <div className="bg-card border border-border/50 rounded-lg p-3 text-sm">
                                      <p className="font-medium text-foreground mb-1">{order.customer}</p>
                                      <p className="text-muted-foreground leading-relaxed flex items-start gap-2">
                                        <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                                        {order.address}
                                      </p>
                                    </div>
                                  </div>

                                  <div>
                                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                                      <CreditCard className="h-3 w-3" /> Payment Method
                                    </h4>
                                    <div className="bg-card border border-border/50 rounded-lg p-3 text-sm flex items-center justify-between">
                                      <span className="font-medium">Cash on Delivery (COD)</span>
                                      <span className="font-mono text-primary">{order.total}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Right Col - Items */}
                                <div>
                                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                                    <Package className="h-3 w-3" /> Ordered Items
                                  </h4>
                                  <div className="space-y-2">
                                    {order.detailed_items?.map((item, idx) => (
                                      <div key={idx} className="flex gap-3 p-2.5 rounded-lg border border-border/50 bg-card hover:bg-muted/10 transition-colors">
                                        <div className="h-12 w-12 rounded bg-muted flex-shrink-0 border border-border overflow-hidden">
                                          {item.image_url ? (
                                            <img src={item.image_url} alt={item.title} className="h-full w-full object-cover" />
                                          ) : (
                                            <div className="h-full w-full flex items-center justify-center text-[10px] text-muted-foreground">No Img</div>
                                          )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium leading-tight truncate">{item.title}</p>
                                          <p className="text-xs text-muted-foreground mt-0.5 font-mono">SKU: {item.sku}</p>
                                        </div>
                                        <div className="flex flex-col items-end justify-center pl-2 border-l border-border/50">
                                          <p className="text-sm font-medium">{item.price}</p>
                                          <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                                        </div>
                                      </div>
                                    ))}
                                    {!order.detailed_items?.length && (
                                      <p className="text-sm text-muted-foreground">{order.items}</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </optgroup>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};

export default Orders;
