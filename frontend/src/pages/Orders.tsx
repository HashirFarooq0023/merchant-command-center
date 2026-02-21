import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Download, Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@clerk/clerk-react";

type OrderStatus = "Pending" | "Confirmed" | "Shipped" | "Cancelled";

type OrderData = {
  id: string;
  original_id: number;
  customer: string;
  phone: string;
  address: string;
  items: string;
  total: string;
  status: OrderStatus;
};

const statusColors: Record<string, string> = {
  Pending: "bg-accent/20 text-accent",
  Confirmed: "bg-primary/20 text-primary",
  Shipped: "bg-chart-2/20 text-chart-2",
  Cancelled: "bg-red-500/20 text-red-500",
};

const Orders = () => {
  const { getToken } = useAuth();
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const token = await getToken();
      const res = await fetch("http://localhost:8000/orders", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (id: string, original_id: number, status: OrderStatus) => {
    // Optimistic UI update
    setOrders(orders.map((o) => (o.id === id ? { ...o, status } : o)));

    try {
      const token = await getToken();
      await fetch(`http://localhost:8000/orders/${original_id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
    } catch (error) {
      console.error("Failed to update order status:", error);
      toast({
        title: "Error",
        description: "Failed to update order status. Please try again.",
        variant: "destructive"
      });
    }
  };

  const exportCSV = () => {
    const confirmed = orders.filter((o) => o.status === "Confirmed");
    toast({
      title: "Export Ready",
      description: `${confirmed.length} confirmed orders exported for courier upload`,
    });
  };

  const filtered = orders.filter(
    (o) =>
      o.customer.toLowerCase().includes(search.toLowerCase()) ||
      o.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Orders</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Manage AI-generated COD orders
          </p>
        </div>
        <Button onClick={exportCSV} className="gradient-primary text-primary-foreground">
          <Download className="h-4 w-4 mr-2" />
          Export for Courier
        </Button>
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
              placeholder="Search orders..."
              className="w-full bg-secondary rounded-lg pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {["Order ID", "Customer", "Phone", "Address", "Items", "Total", "Status"].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left text-xs font-medium text-muted-foreground p-4"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                >
                  <td className="p-4 text-sm font-mono text-primary">
                    {order.id}
                  </td>
                  <td className="p-4 text-sm text-foreground font-medium">
                    {order.customer}
                  </td>
                  <td className="p-4 text-sm text-muted-foreground font-mono">
                    {order.phone}
                  </td>
                  <td className="p-4 text-sm text-muted-foreground max-w-[180px] truncate">
                    {order.address}
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">
                    {order.items}
                  </td>
                  <td className="p-4 text-sm text-foreground font-medium">
                    {order.total}
                  </td>
                  <td className="p-4">
                    <select
                      value={order.status}
                      onChange={(e) =>
                        updateStatus(order.id, order.original_id, e.target.value as OrderStatus)
                      }
                      className={`text-xs font-medium px-3 py-1.5 rounded-full border-0 outline-none cursor-pointer ${statusColors[order.status] || "bg-muted text-foreground"}`}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Confirmed">Confirmed</option>
                      <option value="Shipped">Shipped</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};

export default Orders;
