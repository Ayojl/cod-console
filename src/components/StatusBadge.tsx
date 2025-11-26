import { Badge } from "@/components/ui/badge";

const statusConfig = {
  pending: { label: "Pending", className: "bg-warning/20 text-warning-foreground hover:bg-warning/30" },
  confirmed: { label: "Confirmed", className: "bg-primary/20 text-primary hover:bg-primary/30" },
  prepared: { label: "Prepared", className: "bg-accent/20 text-accent-foreground hover:bg-accent/30" },
  shipped: { label: "Shipped", className: "bg-primary/20 text-primary hover:bg-primary/30" },
  delivered: { label: "Delivered", className: "bg-success/20 text-success-foreground hover:bg-success/30" },
  returned: { label: "Returned", className: "bg-muted text-muted-foreground hover:bg-muted/80" },
  canceled: { label: "Canceled", className: "bg-destructive/20 text-destructive-foreground hover:bg-destructive/30" },
};

interface StatusBadgeProps {
  status: keyof typeof statusConfig;
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const config = statusConfig[status];
  
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
};
