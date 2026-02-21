import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, RotateCcw, Bot, User, Search, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

import { v4 as uuidv4 } from 'uuid';

const initialMessages: Message[] = [
  {
    role: "assistant",
    content:
      "Assalam-o-Alaikum! 👋 Welcome to our store. I can help you find products, place orders, or answer any questions. Kya aap kuch dhundh rahe hain?",
  },
];

// Helper to simulate WhatsApp formatting and extract markdown images
const renderWhatsAppMessage = (content: string) => {
  // If this is a dedicated image bubble
  if (content.startsWith("__IMAGE__")) {
    const url = content.replace("__IMAGE__", "").trim();
    return (
      <img
        src={url}
        alt="Product Attachment"
        className="w-full max-w-[250px] h-auto rounded-lg shadow-sm object-cover"
        onError={(e) => {
          // Fallback if image fails to load (e.g., broken URL from Shopify)
          const target = e.target as HTMLImageElement;
          target.src = "https://placehold.co/400x400/png?text=Image+Unavailable";
          target.onerror = null; // Prevent infinite loop
        }}
      />
    );
  }

  // Standard text formatting
  const formatText = (text: string) => {
    // WhatsApp bold *text* -> <strong>text</strong>
    // WhatsApp italic _text_ -> <em>text</em>
    return text
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\*(.*?)\*/g, "<strong>$1</strong>")
      .replace(/_(.*?)_/g, "<em>$1</em>");
  };

  return <span className="whitespace-pre-line" dangerouslySetInnerHTML={{ __html: formatText(content) }} />;
};

const AISimulator = () => {
  const { getToken } = useAuth();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [orderState, setOrderState] = useState(mockOrderState);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [showTrialModal, setShowTrialModal] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Generate a unique session ID for this chat instance
    setSessionId(uuidv4());
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const token = await getToken();

      const reqBody: any = {
        message: userMsg.content,
        session_id: sessionId,
      };

      const customKey = localStorage.getItem("merchant_openai_key");
      if (customKey) {
        reqBody.open_ai_key = customKey; // Pass down the custom key to backend for later once DB is ready
      }

      const res = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(reqBody),
      });

      if (!res.ok) {
        throw new Error("Network response was not ok");
      }

      if (res.status === 402 || res.status === 403) {
        // Backend should theoretically send a 402/403 for expired trials
        setShowTrialModal(true);
        setMessages((prev) => [...prev, { role: "assistant", content: "Failed to send message: Trial Expired." }]);
        setIsLoading(false);
        return;
      }

      const data = await res.json();

      // If we are mocking the backend logic here locally for testing instead:
      if (data.response === "TRIAL_EXPIRED" || data.error === "TRIAL_EXPIRED") {
        setShowTrialModal(true);
        setMessages((prev) => [...prev, { role: "assistant", content: "Failed to send message: Trial Expired." }]);
        return;
      }

      // Parse the AI response to explicitly separate images into their own message bubbles
      let textContent = data.response;

      // Regex catches standard markdown images AND raw trailing URLs prefixed by 'Image URL:'
      const imgRegex = /(?:\[.*?\]\((https?:\/\/[^\s\)]+)\))|(?:Image URL:\s*(https?:\/\/[^\s]+))/gi;

      const imageUrls: string[] = [];
      let match;

      // Extract all URLs
      while ((match = imgRegex.exec(data.response)) !== null) {
        const url = match[1] || match[2];
        if (url) {
          imageUrls.push(url);
        }
      }

      // Clean the text by ripping out all image references
      textContent = textContent.replace(imgRegex, '').trim();

      setMessages((prev) => {
        const payload: Message[] = [...prev];
        // 1. Push the text bubble first
        if (textContent) {
          payload.push({ role: "assistant", content: textContent });
        }
        // 2. Push each image as its own distinct bubble directly underneath
        imageUrls.forEach(url => {
          payload.push({ role: "assistant", content: `__IMAGE__${url}` });
        });

        // If the AI somehow returned nothing and no images, provide a fallback
        if (!textContent && imageUrls.length === 0) {
          payload.push({ role: "assistant", content: data.response });
        }

        return payload;
      });

    } catch (error) {
      console.error("Error sending message:", error);

      // Mocking the trial expiry client side strictly for this specific UI task since backend DB is skipped:
      const customKey = localStorage.getItem("merchant_openai_key");
      if (!customKey && messages.length > 5) { // Arbitrary limit mockup due to skipped backend connection 
        setShowTrialModal(true);
        setMessages((prev) => [...prev, { role: "assistant", content: "Trial simulated logic triggered." }]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I am having trouble connecting to the server right now." }]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resetChat = () => {
    setMessages(initialMessages);
    setOrderState(mockOrderState);
    setSessionId(uuidv4()); // Start a new session
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">AI Simulator</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Test your bot before going live on WhatsApp
        </p>
      </div>

      <Dialog open={showTrialModal} onOpenChange={setShowTrialModal}>
        <DialogContent className="sm:max-w-md border-border glass-card">
          <DialogHeader>
            <DialogTitle>Trial Expired ⏳</DialogTitle>
            <DialogDescription className="pt-2">
              Your 48-hour free trial has ended. Please contact our team and continue your package for e-commerce, or add your own OpenAI API key to continue chatting.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            <Button
              className="w-full gradient-primary"
              onClick={() => window.open("mailto:hashirfarooq48@gmail.com")}
            >
              Contact Us
            </Button>
            <Button
              className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/80"
              onClick={() => {
                setShowTrialModal(false);
                navigate("/settings");
              }}
            >
              Add OpenAI API Key
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
                  className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm ${msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-secondary text-secondary-foreground rounded-bl-md"
                    }`}
                >
                  {renderWhatsAppMessage(msg.content)}
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
                    className={`text-xs font-mono ${val === "Pending..." || val === "—"
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
