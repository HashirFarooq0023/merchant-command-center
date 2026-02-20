import { useState } from "react";
import { motion } from "framer-motion";
import { Save, Webhook, Phone, Shield, MessageSquareText, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

const Settings = () => {
  const [copied, setCopied] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState(
    `You are a helpful shopping assistant for a Pakistani clothing store. Follow these rules:
- Always greet the customer with "Assalam-o-Alaikum"
- Respond in Urdu/English mixed language (Roman Urdu)
- Tell customers delivery takes 3-5 working days
- Delivery charges are Rs. 200
- Payment method is Cash on Delivery (COD)
- Be polite, friendly, and helpful
- If you don't know something, tell the customer you'll connect them with a human agent`
  );

  const webhookUrl = "https://your-server.com/api/webhook/whatsapp";

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    toast({ title: "Settings Saved", description: "Your configuration has been updated" });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Settings</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Configure your integrations and AI personality
        </p>
      </div>

      {/* WhatsApp API */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-xl p-6"
      >
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
          <Phone className="h-4 w-4 text-primary" />
          WhatsApp Cloud API
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">
              Phone Number ID
            </label>
            <input
              placeholder="Enter Phone Number ID"
              className="w-full bg-secondary rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">
              Business Account ID
            </label>
            <input
              placeholder="Enter WABA ID"
              className="w-full bg-secondary rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-muted-foreground mb-1.5 block">
              Permanent Access Token
            </label>
            <input
              type="password"
              placeholder="Enter your access token"
              className="w-full bg-secondary rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
      </motion.div>

      {/* Webhook */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card rounded-xl p-6"
      >
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
          <Webhook className="h-4 w-4 text-primary" />
          Webhook Configuration
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Paste this URL in your Meta Developer Console → Webhooks → Callback URL
        </p>
        <div className="flex gap-2">
          <div className="flex-1 bg-secondary rounded-lg px-4 py-2.5 text-sm text-foreground font-mono overflow-x-auto">
            {webhookUrl}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={copyWebhook}
            className="shrink-0"
          >
            {copied ? (
              <Check className="h-4 w-4 text-primary" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </motion.div>

      {/* System Prompt */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card rounded-xl p-6"
      >
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
          <MessageSquareText className="h-4 w-4 text-primary" />
          System Prompt Editor
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Customize the AI&apos;s personality and rules for customer interactions
        </p>
        <Textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          rows={10}
          className="bg-secondary border-border text-foreground font-mono text-sm resize-y"
        />
      </motion.div>

      <div className="flex justify-end">
        <Button onClick={handleSave} className="gradient-primary text-primary-foreground px-8">
          <Save className="h-4 w-4 mr-2" />
          Save Settings
        </Button>
      </div>
    </div>
  );
};

export default Settings;
