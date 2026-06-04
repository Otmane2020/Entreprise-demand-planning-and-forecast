import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserRole = 'admin' | 'demand_planner' | 'sales_manager' | 'viewer';
export type AbcClass = 'A' | 'B' | 'C';
export type XyzClass = 'X' | 'Y' | 'Z';
export type SoipStatus = 'draft' | 'submitted' | 'approved' | 'rejected';
export type ScenarioType = 'demand_increase' | 'demand_decrease' | 'promotion' | 'lead_time_increase' | 'lead_time_decrease';

export interface UserProfile {
  id: string;
  full_name: string | null;
  role: UserRole;
  business_unit: string | null;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  sku: string;
  product_name: string;
  category: string;
  subcategory: string | null;
  brand: string | null;
  unit_price: number;
  lead_time_days: number;
  service_level_target: number;
  abc_class: AbcClass | null;
  xyz_class: XyzClass | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface SalesHistory {
  id: string;
  product_id: string;
  date: string;
  units_sold: number;
  revenue: number;
  promotion_flag: boolean;
  stockout_flag: boolean;
  created_at: string;
}

export interface Forecast {
  id: string;
  product_id: string;
  forecast_date: string;
  forecast_units: number;
  forecast_revenue: number;
  model_name: string;
  lower_bound: number | null;
  upper_bound: number | null;
  accuracy_score: number | null;
  created_at: string;
}

export interface ForecastVersion {
  id: string;
  product_id: string;
  period_date: string;
  statistical_forecast: number;
  sales_forecast: number | null;
  consensus_forecast: number | null;
  status: SoipStatus;
  created_by: string | null;
  approved_by: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Inventory {
  id: string;
  product_id: string;
  current_stock: number;
  safety_stock: number;
  reorder_point: number;
  coverage_days: number;
  on_order_quantity: number;
  last_updated: string;
  created_at: string;
}

export interface ForecastMetric {
  id: string;
  product_id: string;
  period_month: string;
  mape: number | null;
  wape: number | null;
  mase: number | null;
  rmse: number | null;
  bias: number | null;
  tracking_signal: number | null;
  model_name: string;
  created_at: string;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  scenario_type: ScenarioType;
  parameters: Record<string, unknown>;
  results: Record<string, unknown> | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}
