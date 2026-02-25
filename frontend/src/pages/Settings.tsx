import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Save, Webhook, Phone, Shield, MessageSquareText, Copy, Check, Key, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@clerk/clerk-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const Settings = () => {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);

  const [storeName, setStoreName] = useState("");
  const [openAiKey, setOpenAiKey] = useState("");
  const [whatsappPhoneId, setWhatsappPhoneId] = useState("");
  const [whatsappBusinessId, setWhatsappBusinessId] = useState("");
  const [whatsappToken, setWhatsappToken] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [verifyToken, setVerifyToken] = useState("Loading...");

  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";

  const { data: webhookData } = useQuery({
    queryKey: ['webhook-url'],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(`${apiUrl}/settings/webhook-url`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) return { url: "Ngrok tunnel not detected" };
      return res.json();
    }
  });

  const webhookUrl = webhookData?.url || "Loading...";

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyToken = () => {
    navigator.clipboard.writeText(verifyToken);
    setTokenCopied(true);
    setTimeout(() => setTokenCopied(false), 2000);
  };

  // Fetch Settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(`${apiUrl}/settings`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to load settings");
      return res.json();
    }
  });

  useEffect(() => {
    if (settings) {
      setStoreName(settings.store_name || "");
      setOpenAiKey(settings.openai_api_key || "");
      setWhatsappPhoneId(settings.whatsapp_phone_number_id || "");
      setWhatsappBusinessId(settings.whatsapp_business_account_id || "");
      setWhatsappToken(settings.whatsapp_access_token || "");
      setSystemPrompt(settings.system_prompt || `- Delivery Charges: 250 PKR
- Free Delivery: Orders above 2999 PKR
- Delivery Time: 3–4 days
- Parcel Policy: Cannot open before payment
- Payment: Cash on Delivery (COD)`);
      setVerifyToken(settings.webhook_verify_token || "Failed to generate token");
    }
  }, [settings]);

  // Update Settings
  const mutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      const res = await fetch(`${apiUrl}/settings`, {
        method: 'PUT',
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          store_name: storeName,
          openai_api_key: openAiKey,
          whatsapp_phone_number_id: whatsappPhoneId,
          whatsapp_business_account_id: whatsappBusinessId,
          whatsapp_access_token: whatsappToken,
          system_prompt: systemPrompt
        })
      });
      if (!res.ok) throw new Error("Failed to save settings");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Settings Saved", description: "Your configuration has been updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });

  const handleSave = () => {
    mutation.mutate();
  };

  if (isLoading) {
    return <div className="flex h-[200px] items-center justify-center text-muted-foreground"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 w-full">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Settings</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Configure your integrations and AI personality
        </p>
      </div>

      {/* General Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-xl p-6"
      >
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
          Store Details
        </h3>
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">
            Store Name
          </label>
          <input
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            placeholder="e.g. Trends Store"
            className="w-full bg-secondary rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </motion.div>

      {/* WhatsApp API */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
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
              value={whatsappPhoneId}
              onChange={(e) => setWhatsappPhoneId(e.target.value)}
              placeholder="Enter Phone Number ID"
              className="w-full bg-secondary rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">
              Business Account ID
            </label>
            <input
              value={whatsappBusinessId}
              onChange={(e) => setWhatsappBusinessId(e.target.value)}
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
              value={whatsappToken}
              onChange={(e) => setWhatsappToken(e.target.value)}
              placeholder="Enter your access token"
              className="w-full bg-secondary rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
      </motion.div>

      {/* API Configuration */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="glass-card rounded-xl p-6"
      >
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
          <Key className="h-4 w-4 text-primary" />
          API Configuration
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Provide your own OpenAI API key. If left blank, you will be using the shared company trial (48 hours limited).
        </p>
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">
            OpenAI API Key
          </label>
          <input
            type="password"
            value={openAiKey}
            onChange={(e) => setOpenAiKey(e.target.value)}
            placeholder="sk-proj-..."
            className="w-full bg-secondary rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/50"
          />
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
        <p className="text-xs text-muted-foreground mb-4">
          Paste these credentials in your Meta Developer Console → Webhooks
        </p>

        <div className="space-y-5">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">
              Callback URL (Live Ngrok)
            </label>
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
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">
              Verify Token
            </label>
            <div className="flex gap-2">
              <div className="flex-1 bg-secondary rounded-lg px-4 py-2.5 text-sm text-foreground font-mono overflow-x-auto">
                {verifyToken}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={copyToken}
                className="shrink-0"
              >
                {tokenCopied ? (
                  <Check className="h-4 w-4 text-primary" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Policies & FAQs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card rounded-xl p-6"
      >
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
          <MessageSquareText className="h-4 w-4 text-primary" />
          Policies & FAQs
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Customize your Store's delivery parameters and payment policies
        </p>
        <Textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          rows={10}
          className="bg-secondary border-border text-foreground font-mono text-sm resize-y w-full"
        />
      </motion.div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={mutation.isPending} className="gradient-primary text-primary-foreground px-8">
          {mutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Settings
        </Button>
      </div>
    </div>
  );
};

export default Settings;
