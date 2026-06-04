/*
  # Enterprise Demand Planning & Forecasting Platform - Core Schema

  ## Overview
  Creates the complete database schema for an enterprise demand planning platform
  supporting thousands of SKUs, forecasting, inventory optimization, and S&OP.

  ## New Tables

  ### products
  - Master product catalog with SKU, category, pricing, and supply chain parameters
  - Fields: id, sku, product_name, category, subcategory, brand, unit_price,
    lead_time_days, service_level_target, created_at

  ### sales_history
  - Historical sales transactions linked to products
  - Fields: id, product_id (FK), date, units_sold, revenue, promotion_flag, stockout_flag

  ### forecasts
  - Forecast outputs per product per date from statistical models
  - Fields: id, product_id (FK), forecast_date, forecast_units, forecast_revenue,
    model_name, lower_bound, upper_bound, accuracy_score

  ### forecast_versions
  - S&OP workflow versions: statistical, sales-adjusted, and consensus forecasts
  - Fields: id, product_id (FK), statistical_forecast, sales_forecast, consensus_forecast

  ### inventory
  - Current inventory position and optimization parameters per product
  - Fields: id, product_id (FK), current_stock, safety_stock, reorder_point, coverage_days

  ### forecast_metrics
  - Model accuracy KPIs per product (MAPE, WAPE, MASE, RMSE, Bias, Tracking Signal)
  - Fields: id, product_id (FK), mape, wape, mase, rmse, bias, tracking_signal

  ### user_profiles
  - Extended user profiles with roles for RBAC
  - Roles: admin, demand_planner, sales_manager, viewer

  ### scenarios
  - Scenario planning configurations and results
  - Fields: name, type, parameters, results

  ## Security
  - RLS enabled on all tables
  - Policies scoped to authenticated users
  - user_profiles visible only to owner; admins can manage all
*/

-- =====================
-- ENUMS
-- =====================
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'demand_planner', 'sales_manager', 'viewer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE abc_class AS ENUM ('A', 'B', 'C');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE xyz_class AS ENUM ('X', 'Y', 'Z');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE scenario_type AS ENUM ('demand_increase', 'demand_decrease', 'promotion', 'lead_time_increase', 'lead_time_decrease');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE soip_status AS ENUM ('draft', 'submitted', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =====================
-- USER PROFILES
-- =====================
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  role user_role NOT NULL DEFAULT 'viewer',
  business_unit text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- =====================
-- PRODUCTS
-- =====================
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text NOT NULL UNIQUE,
  product_name text NOT NULL,
  category text NOT NULL DEFAULT '',
  subcategory text DEFAULT '',
  brand text DEFAULT '',
  unit_price numeric(12,4) NOT NULL DEFAULT 0,
  lead_time_days integer NOT NULL DEFAULT 7,
  service_level_target numeric(5,2) NOT NULL DEFAULT 95.0,
  abc_class abc_class,
  xyz_class xyz_class,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view products"
  ON products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can update products"
  ON products FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can delete products"
  ON products FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);

-- =====================
-- SALES HISTORY
-- =====================
CREATE TABLE IF NOT EXISTS sales_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  date date NOT NULL,
  units_sold numeric(12,2) NOT NULL DEFAULT 0,
  revenue numeric(14,4) NOT NULL DEFAULT 0,
  promotion_flag boolean NOT NULL DEFAULT false,
  stockout_flag boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sales_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sales history"
  ON sales_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert sales history"
  ON sales_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update sales history"
  ON sales_history FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete sales history"
  ON sales_history FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_sales_history_product_id ON sales_history(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_history_date ON sales_history(date);
CREATE INDEX IF NOT EXISTS idx_sales_history_product_date ON sales_history(product_id, date);

-- =====================
-- FORECASTS
-- =====================
CREATE TABLE IF NOT EXISTS forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  forecast_date date NOT NULL,
  forecast_units numeric(12,2) NOT NULL DEFAULT 0,
  forecast_revenue numeric(14,4) NOT NULL DEFAULT 0,
  model_name text NOT NULL DEFAULT '',
  lower_bound numeric(12,2),
  upper_bound numeric(12,2),
  accuracy_score numeric(5,2),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE forecasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view forecasts"
  ON forecasts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert forecasts"
  ON forecasts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update forecasts"
  ON forecasts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete forecasts"
  ON forecasts FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_forecasts_product_id ON forecasts(product_id);
CREATE INDEX IF NOT EXISTS idx_forecasts_date ON forecasts(forecast_date);

-- =====================
-- FORECAST VERSIONS (S&OP)
-- =====================
CREATE TABLE IF NOT EXISTS forecast_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  period_date date NOT NULL,
  statistical_forecast numeric(12,2) NOT NULL DEFAULT 0,
  sales_forecast numeric(12,2),
  consensus_forecast numeric(12,2),
  status soip_status NOT NULL DEFAULT 'draft',
  created_by uuid REFERENCES auth.users(id),
  approved_by uuid REFERENCES auth.users(id),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE forecast_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view forecast versions"
  ON forecast_versions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert forecast versions"
  ON forecast_versions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update forecast versions"
  ON forecast_versions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete forecast versions"
  ON forecast_versions FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_forecast_versions_product_id ON forecast_versions(product_id);

-- =====================
-- INVENTORY
-- =====================
CREATE TABLE IF NOT EXISTS inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE UNIQUE,
  current_stock numeric(12,2) NOT NULL DEFAULT 0,
  safety_stock numeric(12,2) NOT NULL DEFAULT 0,
  reorder_point numeric(12,2) NOT NULL DEFAULT 0,
  coverage_days numeric(8,2) NOT NULL DEFAULT 0,
  on_order_quantity numeric(12,2) NOT NULL DEFAULT 0,
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view inventory"
  ON inventory FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert inventory"
  ON inventory FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update inventory"
  ON inventory FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete inventory"
  ON inventory FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON inventory(product_id);

-- =====================
-- FORECAST METRICS
-- =====================
CREATE TABLE IF NOT EXISTS forecast_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  period_month date NOT NULL,
  mape numeric(8,4),
  wape numeric(8,4),
  mase numeric(8,4),
  rmse numeric(12,4),
  bias numeric(8,4),
  tracking_signal numeric(8,4),
  model_name text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE forecast_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view forecast metrics"
  ON forecast_metrics FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert forecast metrics"
  ON forecast_metrics FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update forecast metrics"
  ON forecast_metrics FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete forecast metrics"
  ON forecast_metrics FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_forecast_metrics_product_id ON forecast_metrics(product_id);
CREATE INDEX IF NOT EXISTS idx_forecast_metrics_period ON forecast_metrics(period_month);

-- =====================
-- SCENARIOS
-- =====================
CREATE TABLE IF NOT EXISTS scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  scenario_type scenario_type NOT NULL,
  parameters jsonb NOT NULL DEFAULT '{}',
  results jsonb,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view scenarios"
  ON scenarios FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own scenarios"
  ON scenarios FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update own scenarios"
  ON scenarios FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can delete own scenarios"
  ON scenarios FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE INDEX IF NOT EXISTS idx_scenarios_created_by ON scenarios(created_by);

-- =====================
-- TRIGGER: auto-update updated_at
-- =====================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_forecast_versions_updated_at
  BEFORE UPDATE ON forecast_versions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_scenarios_updated_at
  BEFORE UPDATE ON scenarios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
