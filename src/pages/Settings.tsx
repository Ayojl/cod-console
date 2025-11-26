import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";

declare global {
  interface Window {
    cloudinary: any;
  }
}

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<any>({
    store_name: "",
    phone: "",
    whatsapp: "",
    address: "",
    currency: "DZD",
    default_delivery_fee: 0,
    cod_notes: "",
    low_stock_threshold: 10,
    enable_low_stock_alerts: true,
    enable_order_notifications: true,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("store_settings")
        .select("*")
        .single();

      if (error) throw error;
      if (data) setSettings(data);
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const openCloudinaryWidget = (fieldName: "logo" | "featured_banner") => {
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
      script.onload = () => openWidget(cloudName, uploadPreset, fieldName);
      document.body.appendChild(script);
    } else {
      openWidget(cloudName, uploadPreset, fieldName);
    }
  };

  const openWidget = (cloudName: string, uploadPreset: string, fieldName: "logo" | "featured_banner") => {
    const widget = window.cloudinary.createUploadWidget(
      {
        cloudName,
        uploadPreset,
        sources: ["local", "url", "camera"],
        multiple: false,
        resourceType: "image",
      },
      (error: any, result: any) => {
        if (error) {
          toast.error("Upload failed");
          return;
        }
        if (result.event === "success") {
          setSettings({ ...settings, [fieldName]: result.info.secure_url });
          toast.success("Image uploaded successfully");
        }
      }
    );
    widget.open();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase
        .from("store_settings")
        .update(settings)
        .eq("id", settings.id);

      if (error) throw error;

      toast.success("Settings updated successfully");
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Configure your store settings</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Store Information</CardTitle>
            <CardDescription>Basic information about your store</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="store_name">Store Name</Label>
              <Input
                id="store_name"
                value={settings.store_name}
                onChange={(e) => setSettings({ ...settings, store_name: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Store Logo</Label>
              <div className="flex items-center gap-4">
                {settings.logo && (
                  <div className="relative">
                    <img src={settings.logo} alt="Store logo" className="h-20 w-20 object-contain rounded-md border" />
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, logo: "" })}
                      className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
                <Button type="button" variant="outline" onClick={() => openCloudinaryWidget("logo")}>
                  <Upload className="mr-2 h-4 w-4" />
                  {settings.logo ? "Change Logo" : "Upload Logo"}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Featured Banner</Label>
              <div className="flex items-center gap-4">
                {settings.featured_banner && (
                  <div className="relative">
                    <img src={settings.featured_banner} alt="Banner" className="h-20 w-40 object-cover rounded-md border" />
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, featured_banner: "" })}
                      className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
                <Button type="button" variant="outline" onClick={() => openCloudinaryWidget("featured_banner")}>
                  <Upload className="mr-2 h-4 w-4" />
                  {settings.featured_banner ? "Change Banner" : "Upload Banner"}
                </Button>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={settings.phone}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp Number</Label>
                <Input
                  id="whatsapp"
                  value={settings.whatsapp}
                  onChange={(e) => setSettings({ ...settings, whatsapp: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Store Address</Label>
              <Textarea
                id="address"
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Input
                  id="currency"
                  value={settings.currency}
                  onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="delivery_fee">Default Delivery Fee</Label>
                <Input
                  id="delivery_fee"
                  type="number"
                  step="0.01"
                  value={settings.default_delivery_fee}
                  onChange={(e) =>
                    setSettings({ ...settings, default_delivery_fee: parseFloat(e.target.value) })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cod_notes">Cash on Delivery Instructions</Label>
              <Textarea
                id="cod_notes"
                value={settings.cod_notes}
                onChange={(e) => setSettings({ ...settings, cod_notes: e.target.value })}
                placeholder="Instructions for COD orders..."
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Manage notification preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="low_stock">Low Stock Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when products are running low
                </p>
              </div>
              <Switch
                id="low_stock"
                checked={settings.enable_low_stock_alerts}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enable_low_stock_alerts: checked })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="threshold">Low Stock Threshold</Label>
              <Input
                id="threshold"
                type="number"
                value={settings.low_stock_threshold}
                onChange={(e) =>
                  setSettings({ ...settings, low_stock_threshold: parseInt(e.target.value) })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="order_notifications">New Order Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified about new orders
                </p>
              </div>
              <Switch
                id="order_notifications"
                checked={settings.enable_order_notifications}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enable_order_notifications: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
