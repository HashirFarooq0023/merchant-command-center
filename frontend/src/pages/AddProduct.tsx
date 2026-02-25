import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Upload, X, ArrowLeft, Image as ImageIcon, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@clerk/clerk-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const MAX_IMAGES = 5;

const AddProduct = () => {
    const { getToken } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [title, setTitle] = useState("");
    const [handle, setHandle] = useState("");
    const [skuPrefix, setSkuPrefix] = useState("");
    const [price, setPrice] = useState("");
    const [vendor, setVendor] = useState("");
    const [instock, setInstock] = useState("");
    const [description, setDescription] = useState("");
    const [inventoryPolicy, setInventoryPolicy] = useState("deny");

    const [images, setImages] = useState<(File | null)[]>([null, null, null, null, null]);
    const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>(["", "", "", "", ""]);

    const [isSubmitting, setIsSubmitting] = useState(false);

    const fileInputRefs = [
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
    ];

    const handleImageClick = (index: number) => {
        fileInputRefs[index].current?.click();
    };

    const handleImageChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith("image/")) {
                toast({
                    title: "Invalid file type",
                    description: "Please upload an image file.",
                    variant: "destructive"
                });
                return;
            }

            const newImages = [...images];
            newImages[index] = file;
            setImages(newImages);

            const newPreviewUrls = [...imagePreviewUrls];
            newPreviewUrls[index] = URL.createObjectURL(file);
            setImagePreviewUrls(newPreviewUrls);
        }
    };

    const removeImage = (index: number, e: React.MouseEvent) => {
        e.stopPropagation();
        const newImages = [...images];
        newImages[index] = null;
        setImages(newImages);

        const newPreviewUrls = [...imagePreviewUrls];
        if (newPreviewUrls[index]) {
            URL.revokeObjectURL(newPreviewUrls[index]);
        }
        newPreviewUrls[index] = "";
        setImagePreviewUrls(newPreviewUrls);

        // Reset file input
        if (fileInputRefs[index].current) {
            fileInputRefs[index].current!.value = "";
        }
    };

    const uploadImage = async (file: File): Promise<string> => {
        const token = await getToken();
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("http://localhost:8000/products/upload-image", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`
            },
            body: formData,
        });

        if (!response.ok) {
            throw new Error("Failed to upload image");
        }

        const data = await response.json();
        return data.url;
    };

    const submitProductMutation = useMutation({
        mutationFn: async () => {
            // 1. Validate
            if (!title || !handle || !skuPrefix || !price || !instock) {
                throw new Error("Please fill in all required fields (Title, Category, SKU Prefix, Price, Quantity).");
            }

            setIsSubmitting(true);
            const token = await getToken();

            // 2. Upload images (parallel)
            const uploadedUrls = ["", "", "", "", ""];
            const uploadPromises = images.map(async (file, index) => {
                if (file) {
                    try {
                        uploadedUrls[index] = await uploadImage(file);
                    } catch (e) {
                        throw new Error(`Failed to upload image ${index + 1}`);
                    }
                }
            });

            await Promise.all(uploadPromises);

            // 3. Submit Product
            const payload = {
                title,
                handle,
                sku_prefix: skuPrefix,
                price: parseFloat(price),
                vendor: vendor || undefined,
                instock: parseInt(instock, 10),
                description: description || undefined,
                inventory_policy: inventoryPolicy,
                image_url_1: uploadedUrls[0],
                image_url_2: uploadedUrls[1],
                image_url_3: uploadedUrls[2],
                image_url_4: uploadedUrls[3],
                image_url_5: uploadedUrls[4],
            };

            const response = await fetch("http://localhost:8000/products/single", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || "Failed to add product");
            }

            return response.json();
        },
        onSuccess: (data) => {
            toast({
                title: "Success",
                description: `Product added successfully with SKU: ${data.sku}`,
            });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            navigate("/knowledge-base");
        },
        onError: (error: any) => {
            setIsSubmitting(false);
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive"
            });
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        submitProductMutation.mutate();
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-12">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate("/knowledge-base")} className="rounded-full">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h2 className="text-2xl font-bold text-foreground">Add New Product</h2>
                    <p className="text-muted-foreground text-sm mt-1">
                        Create a new product manually to train the AI instantly.
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Main Details */}
                <div className="lg:col-span-2 space-y-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-card rounded-xl border border-divider p-6 space-y-6"
                    >
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Product Title <span className="text-destructive">*</span></Label>
                                <Input
                                    id="title"
                                    placeholder="e.g. Wireless Noise Cancelling Headphones"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    disabled={isSubmitting}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    placeholder="Describe the product features, benefits, and specifications..."
                                    className="min-h-[150px] resize-y"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    disabled={isSubmitting}
                                />
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="glass-card rounded-xl border border-divider p-6 space-y-6"
                    >
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-foreground">Media</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">You can upload up to 5 images. The first image will be used as the primary thumbnail.</p>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                            {[0, 1, 2, 3, 4].map((index) => (
                                <div key={index} className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">Image {index + 1} {index === 0 && "(Primary)"}</Label>
                                    <div
                                        onClick={() => !isSubmitting && handleImageClick(index)}
                                        className={`aspect-square w-full rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer transition-all relative overflow-hidden group
                                    ${imagePreviewUrls[index]
                                                ? "border-primary/50 bg-background"
                                                : "border-border hover:border-primary/50 hover:bg-primary/5"
                                            }
                                    ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}
                                `}
                                    >
                                        {imagePreviewUrls[index] ? (
                                            <>
                                                <img src={imagePreviewUrls[index]} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <Button
                                                        variant="destructive"
                                                        size="icon"
                                                        className="h-8 w-8 rounded-full"
                                                        onClick={(e) => !isSubmitting && removeImage(index, e)}
                                                        disabled={isSubmitting}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center text-muted-foreground">
                                                <ImageIcon className="h-6 w-6 mb-2 opacity-50" />
                                                <span className="text-xs font-medium">Upload</span>
                                            </div>
                                        )}
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        ref={fileInputRefs[index]}
                                        onChange={(e) => handleImageChange(index, e)}
                                        disabled={isSubmitting}
                                    />
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>

                {/* Right Column - Organization & Pricing */}
                <div className="space-y-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="glass-card rounded-xl border border-divider p-6 space-y-6"
                    >
                        <h3 className="text-lg font-semibold text-foreground">Pricing & Inventory</h3>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="price">Price (Rs.) <span className="text-destructive">*</span></Label>
                                <Input
                                    id="price"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    disabled={isSubmitting}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="instock">Quantity <span className="text-destructive">*</span></Label>
                                <Input
                                    id="instock"
                                    type="number"
                                    min="0"
                                    placeholder="100"
                                    value={instock}
                                    onChange={(e) => setInstock(e.target.value)}
                                    disabled={isSubmitting}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="policy">Inventory Policy</Label>
                                <Select value={inventoryPolicy} onValueChange={setInventoryPolicy} disabled={isSubmitting}>
                                    <SelectTrigger id="policy">
                                        <SelectValue placeholder="Select policy" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="deny">Stop selling when out of stock</SelectItem>
                                        <SelectItem value="continue">Continue selling when out of stock</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="glass-card rounded-xl border border-divider p-6 space-y-6"
                    >
                        <h3 className="text-lg font-semibold text-foreground">Organization</h3>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="handle">Category / Handle <span className="text-destructive">*</span></Label>
                                <Input
                                    id="handle"
                                    placeholder="e.g. electronics"
                                    value={handle}
                                    onChange={(e) => setHandle(e.target.value)}
                                    disabled={isSubmitting}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="vendor">Vendor</Label>
                                <Input
                                    id="vendor"
                                    placeholder="e.g. Sony"
                                    value={vendor}
                                    onChange={(e) => setVendor(e.target.value)}
                                    disabled={isSubmitting}
                                />
                            </div>

                            <div className="space-y-2 pt-2 border-t border-border">
                                <Label htmlFor="skuprefix">SKU Generation <span className="text-destructive">*</span></Label>
                                <p className="text-xs text-muted-foreground mb-2">
                                    Enter the prefix. The system will auto-add 4 random numbers to make it unique.
                                    (e.g., entering 'TSHIRT' generates 'TSHIRT-8392')
                                </p>
                                <Input
                                    id="skuprefix"
                                    placeholder="Prefix (e.g. LAPTOP)"
                                    value={skuPrefix}
                                    onChange={(e) => setSkuPrefix(e.target.value)}
                                    disabled={isSubmitting}
                                />
                                {skuPrefix && (
                                    <div className="mt-2 p-2 bg-muted/50 rounded flex items-center justify-between border border-border">
                                        <span className="text-xs font-medium text-muted-foreground">Preview:</span>
                                        <span className="text-xs font-mono font-bold text-primary">{skuPrefix.toUpperCase()}-XXXX</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>

                    <Button
                        type="submit"
                        className="w-full h-12 text-base font-semibold shadow-md gap-2"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                Saving Product...
                            </>
                        ) : (
                            <>
                                <Save className="h-5 w-5" />
                                Save Product
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default AddProduct;
