import { useState } from "react";
import { motion } from "framer-motion";
import { Download, Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

type OrderStatus = "Pending" | "Confirmed" | "Shipped";

const mockOrders = [
  { id: "ORD-1042", customer: "Ahmed Khan", phone: "+92 300 1234567", address: "House 42, Block B, DHA Phase 5, Lahore", items: "Lawn Print 3-Piece × 2", total: "Rs. 9,000", status: "Pending" as OrderStatus },
  { id: "ORD-1041", customer: "Fatima Noor", phone: "+92 321 9876543", address: "Flat 8, Al-Habib Towers, Clifton, Karachi", items: "Silk Kurta - Blue × 1", total: "Rs. 6,200", status: "Confirmed" as OrderStatus },
  { id: "ORD-1040", customer: "Bilal Hussain", phone: "+92 333 4567890", address: "Street 7, Sector F-8, Islamabad", items: "Kids Shalwar Kameez × 3", total: "Rs. 8,400", status: "Shipped" as OrderStatus },
  { id: "ORD-1039", customer: "Ayesha Malik", phone: "+92 312 6543210", address: "Mohalla Iqbal, GT Road, Rawalpindi", items: "Cotton Dupatta × 4", total: "Rs. 4,800", status: "Confirmed" as OrderStatus },
  { id: "ORD-1038", customer: "Usman Tariq", phone: "+92 345 7890123", address: "Gulberg III, Main Boulevard, Lahore", items: "Bridal Lehnga Set × 1", total: "Rs. 45,000", status: "Pending" as OrderStatus },
  { id: "ORD-1037", customer: "Sana Javed", phone: "+92 302 3456789", address: "Askari 11, Sector B, Lahore", items: "Pashmina Shawl × 1", total: "Rs. 8,900", status: "Shipped" as OrderStatus },
];

const statusColors: Record<OrderStatus, string> = {
  Pending: "bg-accent/20 text-accent",
  Confirmed: "bg-primary/20 text-primary",
  Shipped: "bg-chart-2/20 text-chart-2",
};

const Orders = () => {
  const [orders, setOrders] = useState(mockOrders);
  const [search, setSearch] = useState("");

  const updateStatus = (id: string, status: OrderStatus) => {
    setOrders(orders.map((o) => (o.id === id ? { ...o, status } : o)));
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
                        updateStatus(order.id, e.target.value as OrderStatus)
                      }
                      className={`text-xs font-medium px-3 py-1.5 rounded-full border-0 outline-none cursor-pointer ${statusColors[order.status]}`}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Confirmed">Confirmed</option>
                      <option value="Shipped">Shipped</option>
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
