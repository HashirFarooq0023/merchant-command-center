import { useState } from "react";
import { motion } from "framer-motion";
import { MessageSquare, User, Bot, Hand, Clock, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

const mockChats = [
  {
    id: 1,
    phone: "+92 300 1234567",
    name: "Ahmed Khan",
    lastMessage: "Haan ji, order confirm karo",
    time: "2 min ago",
    status: "active" as const,
    messages: [
      { role: "customer" as const, text: "Assalam-o-Alaikum, lawn collection dikhao" },
      { role: "bot" as const, text: "Walaikum Assalam! Humari Lawn Collection 2024 available hai. Kya aap 3-piece dekhna chahenge?" },
      { role: "customer" as const, text: "Haan, blue wala dikhao aur price batao" },
      { role: "bot" as const, text: "Blue Lawn Print 3-Piece Rs. 4,500 ka hai. Kya aap order place karna chahenge?" },
      { role: "customer" as const, text: "Haan ji, order confirm karo" },
    ],
  },
  {
    id: 2,
    phone: "+92 321 9876543",
    name: "Fatima Noor",
    lastMessage: "Delivery kitne din mein hogi?",
    time: "8 min ago",
    status: "active" as const,
    messages: [
      { role: "customer" as const, text: "Bridal collection hai kya?" },
      { role: "bot" as const, text: "Ji haan! Humari Bridal Collection Rs. 25,000 se start hoti hai." },
      { role: "customer" as const, text: "Delivery kitne din mein hogi?" },
    ],
  },
  {
    id: 3,
    phone: "+92 333 4567890",
    name: "Bilal Hussain",
    lastMessage: "Yeh galat product bheja hai!",
    time: "15 min ago",
    status: "escalated" as const,
    messages: [
      { role: "customer" as const, text: "Mera order abhi tak nahi aaya" },
      { role: "bot" as const, text: "I apologize for the delay. Let me check your order status." },
      { role: "customer" as const, text: "Yeh galat product bheja hai!" },
    ],
  },
];

const Conversations = () => {
  const [selectedChat, setSelectedChat] = useState(mockChats[0]);

  const handleTakeover = (chatId: number) => {
    toast({
      title: "Human Takeover Activated",
      description: `AI paused for chat with ${selectedChat.name}. You can now respond directly.`,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Live Conversations</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Monitor AI interactions with customers in real-time
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-220px)]">
        {/* Chat List */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-card rounded-xl overflow-hidden flex flex-col"
        >
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">
              Active Chats ({mockChats.length})
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            {mockChats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => setSelectedChat(chat)}
                className={`w-full p-4 text-left border-b border-border/50 hover:bg-muted/20 transition-colors ${
                  selectedChat.id === chat.id ? "bg-muted/30" : ""
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-foreground">
                    {chat.name}
                  </span>
                  <span className="text-xs text-muted-foreground">{chat.time}</span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                    {chat.lastMessage}
                  </p>
                  <Circle
                    className={`h-2 w-2 fill-current ${
                      chat.status === "escalated" ? "text-accent" : "text-primary"
                    }`}
                  />
                </div>
                <p className="text-xs text-muted-foreground/70 font-mono mt-1">
                  {chat.phone}
                </p>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Chat View */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-card rounded-xl flex flex-col lg:col-span-2 overflow-hidden"
        >
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                {selectedChat.name}
              </p>
              <p className="text-xs text-muted-foreground font-mono">
                {selectedChat.phone}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleTakeover(selectedChat.id)}
              className="border-accent text-accent hover:bg-accent/10"
            >
              <Hand className="h-4 w-4 mr-1" />
              Human Takeover
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {selectedChat.messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2 ${
                  msg.role === "customer" ? "" : "justify-end"
                }`}
              >
                {msg.role === "customer" && (
                  <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-1">
                    <User className="h-3 w-3 text-secondary-foreground" />
                  </div>
                )}
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${
                    msg.role === "customer"
                      ? "bg-secondary text-secondary-foreground rounded-bl-md"
                      : "bg-primary/20 text-foreground rounded-br-md"
                  }`}
                >
                  {msg.text}
                </div>
                {msg.role === "bot" && (
                  <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-1">
                    <Bot className="h-3 w-3 text-primary" />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-border bg-muted/20">
            <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-2">
              <Clock className="h-3 w-3" />
              Read-only view • Click "Human Takeover" to respond directly
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Conversations;
