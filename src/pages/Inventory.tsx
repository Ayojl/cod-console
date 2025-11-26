import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Package } from "lucide-react";

export default function Inventory() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [adjustment, setAdjustment] = useState("");
  const [reason, setReason] = useState("restock");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("stock", { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProduct) return;

    const adjustmentValue = parseInt(adjustment);
    const newStock = selectedProduct.stock + adjustmentValue;

    if (newStock < 0) {
      toast.error("Stock cannot be negative");
      return;
    }

    try {
      // Update product stock
      const { error: updateError } = await supabase
        .from("products")
        .update({ stock: newStock })
        .eq("id", selectedProduct.id);

      if (updateError) throw updateError;

      // Record adjustment
      const { error: adjustmentError } = await supabase
        .from("inventory_adjustments")
        .insert([
          {
            product_id: selectedProduct.id,
            adjustment: adjustmentValue,
            reason: reason as "restock" | "correction" | "damage" | "return" | "sale",
            notes,
          },
        ]);

      if (adjustmentError) throw adjustmentError;

      toast.success("Stock adjusted successfully");
      setAdjustModalOpen(false);
      setSelectedProduct(null);
      setAdjustment("");
      setNotes("");
      fetchProducts();
    } catch (error: any) {
      toast.error(error.message);
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
        <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
        <p className="text-muted-foreground">Manage product stock levels</p>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Current Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No products found
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell className="text-muted-foreground">{product.sku}</TableCell>
                  <TableCell>{product.stock}</TableCell>
                  <TableCell>
                    {product.stock === 0 ? (
                      <Badge variant="outline" className="bg-destructive/20 text-destructive-foreground">
                        Out of Stock
                      </Badge>
                    ) : product.stock < 10 ? (
                      <Badge variant="outline" className="bg-warning/20 text-warning-foreground">
                        Low Stock
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-success/20 text-success-foreground">
                        In Stock
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedProduct(product);
                        setAdjustModalOpen(true);
                      }}
                    >
                      Adjust Stock
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={adjustModalOpen} onOpenChange={setAdjustModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock</DialogTitle>
            <DialogDescription>
              Update stock level for {selectedProduct?.name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdjustStock}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Current Stock</Label>
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-lg font-semibold">{selectedProduct?.stock}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="adjustment">Adjustment</Label>
                <Input
                  id="adjustment"
                  type="number"
                  placeholder="Enter positive or negative number"
                  value={adjustment}
                  onChange={(e) => setAdjustment(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  New stock: {selectedProduct?.stock + (parseInt(adjustment) || 0)}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reason">Reason</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="restock">Restock</SelectItem>
                    <SelectItem value="correction">Correction</SelectItem>
                    <SelectItem value="damage">Damage</SelectItem>
                    <SelectItem value="return">Return</SelectItem>
                    <SelectItem value="sale">Sale</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes about this adjustment..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Adjust Stock</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
