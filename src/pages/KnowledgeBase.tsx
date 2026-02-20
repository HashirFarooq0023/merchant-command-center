import { useState } from "react";
import { motion } from "framer-motion";
import { Upload, FileSpreadsheet, Check, X, RefreshCw, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const mockProducts = [
  { id: 1, title: "Lawn Print 3-Piece", price: "Rs. 4,500", stock: true, description: "Premium lawn fabric..." },
  { id: 2, title: "Silk Kurta - Blue", price: "Rs. 6,200", stock: true, description: "Pure silk kurta..." },
  { id: 3, title: "Cotton Dupatta", price: "Rs. 1,200", stock: false, description: "Handwoven cotton..." },
  { id: 4, title: "Bridal Lehnga Set", price: "Rs. 45,000", stock: true, description: "Heavy embroidery..." },
  { id: 5, title: "Kids Shalwar Kameez", price: "Rs. 2,800", stock: true, description: "Comfortable cotton..." },
  { id: 6, title: "Pashmina Shawl", price: "Rs. 8,900", stock: true, description: "Authentic pashmina..." },
];

const KnowledgeBase = () => {
  const [uploaded, setUploaded] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [products, setProducts] = useState(mockProducts);

  const handleUpload = () => {
    setUploaded(true);
    setSyncing(true);
    setSyncProgress(0);
    const interval = setInterval(() => {
      setSyncProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setSyncing(false);
          return 100;
        }
        return prev + 5;
      });
    }, 150);
  };

  const toggleStock = (id: number) => {
    setProducts(products.map((p) => (p.id === id ? { ...p, stock: !p.stock } : p)));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Knowledge Base</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Upload your product catalog to train the AI
        </p>
      </div>

      {/* Upload Zone */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-xl p-8"
      >
        {!uploaded ? (
          <div
            onClick={handleUpload}
            className="border-2 border-dashed border-border rounded-xl p-12 flex flex-col items-center gap-4 cursor-pointer hover:border-primary/50 transition-colors group"
          >
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-foreground font-medium">
                Drop your Shopify CSV here
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                or click to browse • Supports .csv files
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-foreground">
                shopify_products_export.csv
              </span>
              <Check className="h-4 w-4 text-primary ml-auto" />
            </div>

            {syncing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    Generating Embeddings: {Math.round((syncProgress / 100) * 200)}/200 Products
                  </span>
                  <span className="text-primary font-medium">{syncProgress}%</span>
                </div>
                <Progress value={syncProgress} className="h-2" />
              </div>
            )}

            {!syncing && syncProgress === 100 && (
              <div className="flex items-center gap-2 text-sm text-primary">
                <Check className="h-4 w-4" />
                <span>All 200 products synced successfully</span>
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
        className="glass-card rounded-xl overflow-hidden"
      >
        <div className="p-5 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">
            Product Catalog Preview
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Toggle stock status to instantly update AI recommendations
          </p>
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
                  In Stock
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr
                  key={product.id}
                  className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                >
                  <td className="p-4 text-sm text-foreground font-medium">
                    {product.title}
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">
                    {product.price}
                  </td>
                  <td className="p-4 text-sm text-muted-foreground max-w-[200px] truncate">
                    {product.description}
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => toggleStock(product.id)}
                      className="inline-flex items-center"
                    >
                      {product.stock ? (
                        <ToggleRight className="h-6 w-6 text-primary" />
                      ) : (
                        <ToggleLeft className="h-6 w-6 text-muted-foreground" />
                      )}
                    </button>
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

export default KnowledgeBase;
