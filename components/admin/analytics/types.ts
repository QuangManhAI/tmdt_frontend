export type Granularity = "day" | "week" | "month";
export type Scope = "realized" | "all";

export interface Metric {
  value: number;
  previous: number;
  change_pct: number | null;
}

export interface TimePoint {
  period: string;
  label: string;
  revenue: number;
  previous_revenue: number;
  orders: number;
  units: number;
  units_by_category: Record<string, number>;
}

export interface GroupRow {
  id: string;
  name: string;
  revenue: number;
  units: number;
  orders: number;
  share: number;
}

export interface ProductRow {
  product_id: string;
  name: string;
  category_id: string;
  martial_art_id: string;
  price: number;
  avg_price: number;
  units: number;
  revenue: number;
  orders: number;
  stock: number;
  sell_through: number;
}

export interface CountRow {
  id: string;
  name: string;
  count: number;
  revenue: number;
}

export interface HeatCell {
  weekday: number;
  hour: number;
  orders: number;
}

export interface AnalyticsData {
  filters: {
    start: string;
    end: string;
    granularity: Granularity;
    scope: Scope;
    martial_art?: string | null;
    category?: string | null;
    channel?: string | null;
    payment_method?: string | null;
  };
  summary: {
    revenue: Metric;
    orders: Metric;
    units: Metric;
    avg_order_value: Metric;
    customers: Metric;
    cancel_rate: Metric;
  };
  timeseries: TimePoint[];
  by_category: GroupRow[];
  by_martial_art: GroupRow[];
  products: ProductRow[];
  sizes: CountRow[];
  statuses: CountRow[];
  payment_methods: CountRow[];
  provinces: CountRow[];
  heatmap: HeatCell[];
}
