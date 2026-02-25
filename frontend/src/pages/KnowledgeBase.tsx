import { useState, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { Upload, FileSpreadsheet, Check, RefreshCw, ToggleLeft, ToggleRight, Trash2, Edit2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { useAuth } from "@clerk/clerk-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

const KnowledgeBase = () => {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [processedCount, setProcessedCount] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Hidden input reference for standard clicks
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Fetch products using React Query
  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const token = await getToken();
      const response = await fetch("http://localhost:8000/products", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Failed to fetch products");
      return (await response.json()) as any[];
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Mutate clear catalog
  const clearCatalogMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      const response = await fetch("http://localhost:8000/products", {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Failed to clear catalog");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Catalog Cleared", description: "All products have been deleted successfully." });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const clearCatalog = () => {
    if (!confirm("Are you sure you want to delete all products from your catalog? This cannot be undone.")) return;
    clearCatalogMutation.mutate();
  };

  // Mutate delete product
  const deleteProductMutation = useMutation({
    mutationFn: async (id: number) => {
      const token = await getToken();
      const response = await fetch(`http://localhost:8000/products/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Failed to delete product");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Product Deleted", description: "The product was removed successfully." });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const deleteProduct = (id: number) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    deleteProductMutation.mutate(id);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const processFile = async (uploadedFile: File) => {
    if (!uploadedFile.name.endsWith(".csv")) {
      toast({
        title: "Invalid File",
        description: "Please upload a valid .csv file from Shopify.",
        variant: "destructive"
      });
      return;
    }

    setFile(uploadedFile);
    setSyncing(true);
    setSyncProgress(25); // Start artificial progress for visual feedback
    setProcessedCount(null);

    try {
      const token = await getToken();

      const formData = new FormData();
      formData.append("file", uploadedFile);

      setSyncProgress(50);

      const response = await fetch("http://localhost:8000/upload-catalog", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formData,
      });

      setSyncProgress(90);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Upload failed");
      }

      setProcessedCount(data.processed_variants);
      setSyncProgress(100);

      toast({
        title: "Upload Successful",
        description: `Successfully processed ${data.processed_variants} product variants into your AI Knowledge Engine.`,
      });

      queryClient.invalidateQueries({ queryKey: ['products'] });

    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to process the CSV file.",
        variant: "destructive"
      });
      setFile(null); // Reset UI
    } finally {
      setSyncing(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const toggleStock = (id: number) => {
    queryClient.setQueryData(['products'], (old: any[]) => {
      if (!old) return old;
      return old.map((p) => (p.id === id ? { ...p, stock: !p.stock } : p));
    });
  };

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!searchQuery.trim()) return products;
    const lowerQuery = searchQuery.toLowerCase();
    return products.filter((p: any) =>
      (p.title && p.title.toLowerCase().includes(lowerQuery)) ||
      (p.sku && p.sku.toLowerCase().includes(lowerQuery))
    );
  }, [products, searchQuery]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Knowledge Base</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Upload your product catalog to train the AI
          </p>
        </div>
        {products.length > 0 && (
          <Button
            variant="destructive"
            onClick={clearCatalog}
            disabled={clearCatalogMutation.isPending || syncing}
            className="flex items-center gap-2"
          >
            {clearCatalogMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Clear Catalog
          </Button>
        )}
      </div>

      {/* Upload Zone */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-xl p-8"
      >
        {!file ? (
          <div>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center gap-4 cursor-pointer transition-all ${isDragging
                ? "border-primary bg-primary/5 shadow-inner scale-[0.99]"
                : "border-border hover:border-primary/50 group"
                }`}
            >
              <div className={`h-16 w-16 rounded-2xl flex items-center justify-center transition-colors ${isDragging ? "bg-primary/20" : "bg-primary/10 group-hover:bg-primary/20"
                }`}>
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-foreground font-medium">
                  {isDragging ? "Drop CSV file here" : "Drop your Shopify CSV here"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  or click to browse • Supports .csv files
                </p>
              </div>
            </div>
            {/* Hidden Input Fallback */}
            <input
              type="file"
              accept=".csv"
              ref={fileInputRef}
              onChange={handleFileInput}
              className="hidden"
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-foreground">
                {file.name}
              </span>
              {!syncing && processedCount !== null && (
                <Check className="h-4 w-4 text-primary ml-auto" />
              )}
            </div>

            {syncing && (
              <div className="space-y-2 mt-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    Uploading and Vectorizing Data...
                  </span>
                  <span className="text-primary font-medium">{syncProgress}%</span>
                </div>
                <Progress value={syncProgress} className="h-2" />
              </div>
            )}

            {!syncing && processedCount !== null && (
              <div className="mt-4 p-4 rounded-xl bg-primary/10 border border-primary/20 flex items-start gap-4">
                <div className="mt-0.5">
                  <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Catalog Synced</h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Successfully parsed dependencies and embedded <strong>{processedCount}</strong> highly specific product variants into your AI Knowledge Engine.<br />
                    The bot is now fully aware of pricing, titles, inventory tracking policies, and detailed descriptions.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 text-xs"
                    onClick={() => {
                      setFile(null);
                      setProcessedCount(null);
                      queryClient.invalidateQueries({ queryKey: ['products'] }); // Refresh table when dialog dismissed
                    }}
                  >
                    Upload Another File
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Data Preview / Product Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card rounded-xl overflow-hidden mt-8"
      >
        <div className="p-5 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Product Catalog Preview
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Inventory policies guide AI recommendations when out of stock
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                className="pl-9 bg-background/50 border-border"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Button
              onClick={() => navigate("/add-product")}
              className="flex items-center gap-2 whitespace-nowrap"
            >
              Add Product manually
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left text-xs font-medium text-muted-foreground p-4">
                  Title
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">
                  Price
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">
                  Description
                </th>
                <th className="text-center text-xs font-medium text-muted-foreground p-4">
                  Quantity
                </th>
                <th className="text-center text-xs font-medium text-muted-foreground p-4">
                  Inventory Policy
                </th>
                <th className="text-right text-xs font-medium text-muted-foreground p-4">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loadingProducts ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">
                    <RefreshCw className="h-4 w-4 animate-spin inline-block mr-2 text-primary" />
                    Loading product catalog...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">
                    {searchQuery ? "No products found matching your search." : "No products found. Please upload a CSV or add one manually!"}
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product: any) => (
                  <tr
                    key={product.id}
                    className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                  >
                    <td className="p-4 text-sm text-foreground font-medium">
                      <div>{product.title}</div>
                      <div className="text-xs text-muted-foreground font-mono mt-0.5">{product.sku}</div>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {product.price}
                    </td>
                    <td className="p-4 text-sm text-muted-foreground max-w-[200px] truncate">
                      {product.description}
                    </td>
                    <td className="p-4 text-center text-sm font-medium">
                      {product.instock !== undefined ? product.instock : '-'}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${product.inventory_policy === 'continue' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        {product.inventory_policy === 'continue' ? 'Continue Selling' : 'Stop Selling'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-primary hover:text-primary hover:bg-primary/10 h-8 w-8 mr-1"
                        onClick={() => navigate(`/edit-product/${product.id}`)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                        onClick={() => deleteProduct(product.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};

export default KnowledgeBase;
