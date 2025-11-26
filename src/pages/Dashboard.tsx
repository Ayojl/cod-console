import { useEffect, useState } from "react";
import { KPICard } from "@/components/KPICard";
import { Package, AlertTriangle, ShoppingCart, DollarSign } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalProducts: 0,
    inStock: 0,
    outOfStock: 0,
    todayOrders: 0,
    weekOrders: 0,
    totalRevenue: 0,
  });
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch products stats
      const { data: products } = await supabase.from("products").select("stock");
      
      const totalProducts = products?.length || 0;
      const inStock = products?.filter((p) => p.stock > 0).length || 0;
      const outOfStock = products?.filter((p) => p.stock === 0).length || 0;

      // Fetch low stock products
      const { data: lowStock } = await supabase
        .from("products")
        .select("name, sku, stock")
        .lt("stock", 10)
        .gt("stock", 0)
        .order("stock", { ascending: true })
        .limit(5);

      // Fetch orders stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { data: todayOrdersData } = await supabase
        .from("orders")
        .select("id")
        .gte("created_at", today.toISOString());

      const { data: weekOrdersData } = await supabase
        .from("orders")
        .select("id")
        .gte("created_at", weekAgo.toISOString());

      // Calculate revenue from delivered orders
      const { data: deliveredOrders } = await supabase
        .from("orders")
        .select(`
          delivery_fee,
          order_items (
            quantity,
            price
          )
        `)
        .eq("status", "delivered");

      const revenue = deliveredOrders?.reduce((sum, order) => {
        const itemsTotal = order.order_items?.reduce(
          (itemSum: number, item: any) => itemSum + (item.quantity * item.price),
          0
        ) || 0;
        return sum + itemsTotal + (order.delivery_fee || 0);
      }, 0) || 0;

      setStats({
        totalProducts,
        inStock,
        outOfStock,
        todayOrders: todayOrdersData?.length || 0,
        weekOrders: weekOrdersData?.length || 0,
        totalRevenue: revenue,
      });

      setLowStockProducts(lowStock || []);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
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
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your store performance</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Products"
          value={stats.totalProducts}
          icon={Package}
          description="All products in catalog"
        />
        <KPICard
          title="In Stock"
          value={stats.inStock}
          icon={Package}
          description="Available products"
        />
        <KPICard
          title="Out of Stock"
          value={stats.outOfStock}
          icon={AlertTriangle}
          description="Needs restocking"
        />
        <KPICard
          title="Orders (Today)"
          value={stats.todayOrders}
          icon={ShoppingCart}
          description={`${stats.weekOrders} this week`}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">From delivered orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Low Stock Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStockProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">All products have sufficient stock</p>
            ) : (
              <div className="space-y-2">
                {lowStockProducts.map((product) => (
                  <div key={product.sku} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
                    </div>
                    <Badge variant="outline" className="bg-warning/20 text-warning-foreground">
                      {product.stock} left
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
