import { motion } from "framer-motion";
import {
  ShoppingCart,
  CheckCircle2,
  MessageSquare,
  Coins,
  TrendingUp,
  TrendingDown,
  ArrowRight,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

const metrics = [
  {
    label: "Total Automated Orders",
    value: "1,247",
    change: "+12.5%",
    trend: "up" as const,
    icon: ShoppingCart,
  },
  {
    label: "Verification Success",
    value: "94.2%",
    change: "+3.1%",
    trend: "up" as const,
    icon: CheckCircle2,
  },
  {
    label: "AI Messages Sent",
    value: "18,439",
    change: "+28.7%",
    trend: "up" as const,
    icon: MessageSquare,
  },
  {
    label: "Est. Token Cost",
    value: "$42.18",
    change: "-8.2%",
    trend: "down" as const,
    icon: Coins,
  },
];

const chartData = [
  { day: "Mon", orders: 42, messages: 320 },
  { day: "Tue", orders: 58, messages: 410 },
  { day: "Wed", orders: 35, messages: 280 },
  { day: "Thu", orders: 71, messages: 520 },
  { day: "Fri", orders: 63, messages: 470 },
  { day: "Sat", orders: 89, messages: 680 },
  { day: "Sun", orders: 54, messages: 390 },
];

const topProducts = [
  { name: "Lawn Collection 2024", queries: 342 },
  { name: "Unstitched Fabric", queries: 278 },
  { name: "Ready-to-Wear Kurta", queries: 195 },
  { name: "Bridal Formal", queries: 167 },
  { name: "Kids Summer Range", queries: 124 },
];

const recentActivity = [
  { text: "Order #1042 confirmed by AI", time: "2 min ago", type: "success" },
  { text: "New product catalog synced (200 items)", time: "15 min ago", type: "info" },
  { text: "Customer requested human support", time: "32 min ago", type: "warning" },
  { text: "Order #1039 shipped via TCS", time: "1 hr ago", type: "success" },
  { text: "AI handled complaint for Order #1035", time: "2 hr ago", type: "info" },
  { text: "Order #1037 confirmed by AI", time: "3 hr ago", type: "success" },
];

const MetricCard = ({
  metric,
  index,
}: {
  metric: (typeof metrics)[0];
  index: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.1 }}
    className="glass-card rounded-xl p-5"
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-muted-foreground">{metric.label}</p>
        <p className="text-2xl font-bold mt-1 text-foreground">{metric.value}</p>
      </div>
      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
        <metric.icon className="h-5 w-5 text-primary" />
      </div>
    </div>
    <div className="flex items-center gap-1 mt-3">
      {metric.trend === "up" ? (
        <TrendingUp className="h-3.5 w-3.5 text-primary" />
      ) : (
        <TrendingDown className="h-3.5 w-3.5 text-accent" />
      )}
      <span
        className={`text-xs font-medium ${
          metric.trend === "up" ? "text-primary" : "text-accent"
        }`}
      >
        {metric.change}
      </span>
      <span className="text-xs text-muted-foreground ml-1">vs last week</span>
    </div>
  </motion.div>
);

const Dashboard = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Your AI commerce performance at a glance
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, i) => (
          <MetricCard key={metric.label} metric={metric} index={i} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Orders Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card rounded-xl p-5 lg:col-span-2"
        >
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Orders This Week
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="orderGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(160 84% 39%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(160 84% 39%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 20% 16%)" />
              <XAxis dataKey="day" stroke="hsl(220 10% 46%)" fontSize={12} />
              <YAxis stroke="hsl(220 10% 46%)" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(222 35% 9%)",
                  border: "1px solid hsl(222 20% 16%)",
                  borderRadius: "8px",
                  color: "hsl(220 14% 92%)",
                }}
              />
              <Area
                type="monotone"
                dataKey="orders"
                stroke="hsl(160 84% 39%)"
                fill="url(#orderGrad)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Top Products */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card rounded-xl p-5"
        >
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Top Queried Products
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={topProducts} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 20% 16%)" />
              <XAxis type="number" stroke="hsl(220 10% 46%)" fontSize={12} />
              <YAxis
                dataKey="name"
                type="category"
                stroke="hsl(220 10% 46%)"
                fontSize={11}
                width={100}
                tick={{ fill: "hsl(220 10% 55%)" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(222 35% 9%)",
                  border: "1px solid hsl(222 20% 16%)",
                  borderRadius: "8px",
                  color: "hsl(220 14% 92%)",
                }}
              />
              <Bar dataKey="queries" fill="hsl(160 84% 39%)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Activity Feed */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="glass-card rounded-xl p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">
            Recent Activity
          </h3>
          <button className="text-xs text-primary flex items-center gap-1 hover:underline">
            View all <ArrowRight className="h-3 w-3" />
          </button>
        </div>
        <div className="space-y-3">
          {recentActivity.map((item, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`h-2 w-2 rounded-full ${
                    item.type === "success"
                      ? "bg-primary"
                      : item.type === "warning"
                      ? "bg-accent"
                      : "bg-chart-2"
                  }`}
                />
                <span className="text-sm text-foreground">{item.text}</span>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                {item.time}
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;
