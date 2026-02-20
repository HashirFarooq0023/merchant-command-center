import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, RotateCcw, Bot, User, Search, Package } from "lucide-react";
import { Button } from "@/components/ui/button";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const mockDebugProducts = [
  { name: "Lawn Print 3-Piece", score: 0.94 },
  { name: "Cotton Dupatta", score: 0.87 },
  { name: "Silk Kurta - Blue", score: 0.82 },
];

const mockOrderState = {
  name: "Pending...",
  address: "Pending...",
  phone: "Pending...",
  quantity: "—",
};

const initialMessages: Message[] = [
  {
    role: "assistant",
    content:
      "Assalam-o-Alaikum! 👋 Welcome to our store. I can help you find products, place orders, or answer any questions. Kya aap kuch dhundh rahe hain?",
  },
];

const botResponses: Record<string, string> = {
  default:
    "Ji bilkul! Humari nayi Lawn Collection 2024 abhi available hai. Prices Rs. 3,500 se start hoti hain. Kya aap koi specific design dekhna chahenge?",
  order:
    "Order place karne ke liye mujhe yeh information chahiye:\n\n1. 📦 Product ka naam\n2. 📍 Complete delivery address\n3. 📱 Phone number\n4. 🔢 Quantity\n\nPlease apni details share karein!",
  price:
    "Humari price range yeh hai:\n• Lawn 3-Piece: Rs. 3,500 - Rs. 8,000\n• Ready-to-Wear: Rs. 4,500 - Rs. 12,000\n• Bridal Collection: Rs. 25,000+\n\nDelivery charges Rs. 200 hain aur 3-5 working days mein deliver ho jata hai.",
};

const AISimulator = () => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [orderState, setOrderState] = useState(mockOrderState);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;
    const userMsg: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);

    const lower = input.toLowerCase();
    let response = botResponses.default;
    if (lower.includes("order") || lower.includes("buy")) response = botResponses.order;
    if (lower.includes("price") || lower.includes("kitne")) response = botResponses.price;

    if (lower.includes("ahmed")) {
      setOrderState((s) => ({ ...s, name: "Ahmed Khan" }));
    }
    if (lower.includes("lahore") || lower.includes("karachi")) {
      setOrderState((s) => ({ ...s, address: input }));
    }

    setInput("");
    setTimeout(() => {
      setMessages((prev) => [...prev, { role: "assistant", content: response }]);
    }, 800);
  };

  const resetChat = () => {
    setMessages(initialMessages);
    setOrderState(mockOrderState);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">AI Simulator</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Test your bot before going live on WhatsApp
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-220px)]">
        {/* Chat Window */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-card rounded-xl flex flex-col lg:col-span-2 overflow-hidden"
        >
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full gradient-primary flex items-center justify-center">
                <Bot className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Commerce Bot</p>
                <p className="text-xs text-primary flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Online
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetChat}
              className="text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
              >
                {msg.role === "assistant" && (
                  <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-1">
                    <Bot className="h-3.5 w-3.5 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm whitespace-pre-line ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-secondary text-secondary-foreground rounded-bl-md"
                  }`}
                >
                  {msg.content}
                </div>
                {msg.role === "user" && (
                  <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-1">
                    <User className="h-3.5 w-3.5 text-secondary-foreground" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          <div className="p-4 border-t border-border">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Type a message... (try 'price' or 'order')"
                className="flex-1 bg-secondary rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/50"
              />
              <Button
                onClick={sendMessage}
                size="icon"
                className="rounded-xl gradient-primary"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Debug Panel */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-card rounded-xl p-5 flex flex-col gap-6 overflow-y-auto"
        >
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
              <Search className="h-4 w-4 text-primary" />
              Vector Search Results
            </h3>
            <div className="space-y-2">
              {mockDebugProducts.map((p, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/50"
                >
                  <span className="text-xs text-foreground">{p.name}</span>
                  <span className="text-xs font-mono text-primary">
                    {p.score.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
              <Package className="h-4 w-4 text-accent" />
              Order Extraction State
            </h3>
            <div className="space-y-2">
              {Object.entries(orderState).map(([key, val]) => (
                <div
                  key={key}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/50"
                >
                  <span className="text-xs text-muted-foreground capitalize">
                    {key}
                  </span>
                  <span
                    className={`text-xs font-mono ${
                      val === "Pending..." || val === "—"
                        ? "text-muted-foreground"
                        : "text-primary"
                    }`}
                  >
                    {val}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AISimulator;
