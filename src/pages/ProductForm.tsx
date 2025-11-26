import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Upload, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

declare global {
  interface Window {
    cloudinary: any;
  }
}

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [colors, setColors] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    price: 0,
    category_id: "",
    description: "",
    images: [] as string[],
    stock: 0,
    variants: {},
  });

  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);

  useEffect(() => {
    fetchOptions();
    if (isEdit) {
      fetchProduct();
    }
  }, [id]);

  const fetchOptions = async () => {
    const [categoriesRes, tagsRes, colorsRes] = await Promise.all([
      supabase.from("categories").select("*").order("name"),
      supabase.from("tags").select("*").order("name"),
      supabase.from("colors").select("*").order("name"),
    ]);

    setCategories(categoriesRes.data || []);
    setTags(tagsRes.data || []);
    setColors(colorsRes.data || []);
  };

  const fetchProduct = async () => {
    if (!id) return;

    try {
      const { data: product, error } = await supabase
        .from("products")
        .select(`
          *,
          product_tags (tag_id),
          product_colors (color_id)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;

      setFormData({
        name: product.name,
        sku: product.sku,
        price: product.price,
        category_id: product.category_id || "",
        description: product.description || "",
        images: product.images || [],
        stock: product.stock,
        variants: product.variants || {},
      });

      setSelectedTags(product.product_tags?.map((pt: any) => pt.tag_id) || []);
      setSelectedColors(product.product_colors?.map((pc: any) => pc.color_id) || []);
    } catch (error) {
      console.error("Error fetching product:", error);
      toast.error("Failed to load product");
    } finally {
      setLoading(false);
    }
  };

  const openCloudinaryWidget = () => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      toast.error("Cloudinary configuration missing. Please add CLOUDINARY_CLOUD_NAME and CLOUDINARY_UPLOAD_PRESET.");
      return;
    }

    if (!window.cloudinary) {
      const script = document.createElement("script");
      script.src = "https://upload-widget.cloudinary.com/global/all.js";
      script.async = true;
      script.onload = () => openWidget(cloudName, uploadPreset);
      document.body.appendChild(script);
    } else {
      openWidget(cloudName, uploadPreset);
    }
  };

  const openWidget = (cloudName: string, uploadPreset: string) => {
    const widget = window.cloudinary.createUploadWidget(
      {
        cloudName,
        uploadPreset,
        sources: ["local", "url", "camera"],
        multiple: true,
        resourceType: "image",
      },
      (error: any, result: any) => {
        if (error) {
          toast.error("Upload failed");
          return;
        }
        if (result.event === "success") {
          setFormData({
            ...formData,
            images: [...formData.images, result.info.secure_url],
          });
          toast.success("Image uploaded successfully");
        }
      }
    );
    widget.open();
  };

  const removeImage = (index: number) => {
    setFormData({
      ...formData,
      images: formData.images.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const productData = {
        name: formData.name,
        sku: formData.sku,
        price: formData.price,
        category_id: formData.category_id || null,
        description: formData.description,
        images: formData.images,
        stock: formData.stock,
        variants: formData.variants,
      };

      let productId = id;

      if (isEdit) {
        const { error } = await supabase
          .from("products")
          .update(productData)
          .eq("id", id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("products")
          .insert([productData])
          .select()
          .single();

        if (error) throw error;
        productId = data.id;
      }

      // Update tags
      await supabase.from("product_tags").delete().eq("product_id", productId);
      if (selectedTags.length > 0) {
        await supabase
          .from("product_tags")
          .insert(selectedTags.map((tag_id) => ({ product_id: productId, tag_id })));
      }

      // Update colors
      await supabase.from("product_colors").delete().eq("product_id", productId);
      if (selectedColors.length > 0) {
        await supabase
          .from("product_colors")
          .insert(selectedColors.map((color_id) => ({ product_id: productId, color_id })));
      }

      toast.success(isEdit ? "Product updated successfully" : "Product created successfully");
      navigate("/products");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/products")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isEdit ? "Edit Product" : "Add Product"}
          </h1>
          <p className="text-muted-foreground">
            {isEdit ? "Update product details" : "Create a new product"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku">SKU *</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="price">Price *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock">Stock *</Label>
                <Input
                  id="stock"
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={formData.category_id} onValueChange={(value) => setFormData({ ...formData, category_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Product Images</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {formData.images.map((image, index) => (
                <div key={index} className="relative group">
                  <img
                    src={image}
                    alt={`Product ${index + 1}`}
                    className="w-full h-32 object-cover rounded-md border"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" onClick={openCloudinaryWidget}>
              <Upload className="mr-2 h-4 w-4" />
              Upload Images
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tags.map((tag) => (
                <div key={tag.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`tag-${tag.id}`}
                    checked={selectedTags.includes(tag.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedTags([...selectedTags, tag.id]);
                      } else {
                        setSelectedTags(selectedTags.filter((t) => t !== tag.id));
                      }
                    }}
                  />
                  <label htmlFor={`tag-${tag.id}`} className="text-sm cursor-pointer">
                    {tag.name}
                  </label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Colors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {colors.map((color) => (
                <div key={color.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`color-${color.id}`}
                    checked={selectedColors.includes(color.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedColors([...selectedColors, color.id]);
                      } else {
                        setSelectedColors(selectedColors.filter((c) => c !== color.id));
                      }
                    }}
                  />
                  <div
                    className="h-5 w-5 rounded border"
                    style={{ backgroundColor: color.hex }}
                  />
                  <label htmlFor={`color-${color.id}`} className="text-sm cursor-pointer">
                    {color.name}
                  </label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate("/products")}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : isEdit ? "Update Product" : "Create Product"}
          </Button>
        </div>
      </form>
    </div>
  );
}
