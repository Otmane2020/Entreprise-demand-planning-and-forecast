/*
  # Enterprise Schema Extensions for Production Analytics

  This migration adds critical tables for enterprise demand planning:
  
  1. New Tables
    - `calendar_dimension`: Time dimension for forecasts (dates, periods, holidays, seasons)
    - `product_hierarchy`: Product family/brand/category relationships
    - `promotion_events`: Promotional calendar and event tracking
    - `forecast_results`: Detailed model-by-model forecast results (ETS, ARIMA, Prophet, XGBoost, etc.)
    - `supplier_master`: Supplier and sourcing information
    - `service_levels`: Service level targets by product family
  
  2. Security
    - Enable RLS on all new tables
    - Add policies for authenticated users to access data
  
  3. Data Model Rationale
    - `calendar_dimension`: Enables hierarchical reporting by week/month/quarter/holiday
    - `product_hierarchy`: Supports multi-level aggregation and strategy matrices
    - `promotion_events`: Tracks external factors affecting demand patterns
    - `forecast_results`: Persists all model outputs for model comparison and audit trail
    - `supplier_master`: Foundation for supply chain optimization
    - `service_levels`: Business rules for safety stock and reorder point calculations
*/

-- Calendar Dimension Table
CREATE TABLE IF NOT EXISTS calendar_dimension (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_date date NOT NULL UNIQUE,
  day_of_week int,
  week_of_year int,
  month_num int,
  quarter_num int,
  year_num int,
  is_holiday boolean DEFAULT false,
  holiday_name text,
  season text,
  period_label text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Product Hierarchy Table
CREATE TABLE IF NOT EXISTS product_hierarchy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  family_code text NOT NULL,
  family_name text NOT NULL,
  brand_code text,
  brand_name text,
  category_code text,
  category_name text,
  sub_category_code text,
  sub_category_name text,
  strategic_importance text,
  forecasting_method text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(product_id)
);

-- Promotion Events Table
CREATE TABLE IF NOT EXISTS promotion_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  event_name text NOT NULL,
  event_type text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  discount_percent numeric(5,2),
  expected_lift_percent numeric(5,2),
  status text DEFAULT 'planned',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Forecast Results Table (stores all model outputs side-by-side)
CREATE TABLE IF NOT EXISTS forecast_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  forecast_period date NOT NULL,
  model_run_id uuid REFERENCES forecast_model_runs(id) ON DELETE SET NULL,
  
  -- Actual result (once realized)
  actual_units int,
  actual_revenue numeric(12,2),
  
  -- All model forecasts stored together
  sma_forecast int,
  wma_forecast int,
  exp_smoothing_forecast int,
  holt_forecast int,
  holt_winters_forecast int,
  ets_forecast int,
  arima_forecast int,
  sarima_forecast int,
  croston_forecast int,
  linear_regression_forecast int,
  random_forest_forecast int,
  xgboost_forecast int,
  prophet_forecast int,
  
  -- Best model selected
  selected_model text,
  ensemble_forecast int,
  
  -- Confidence bounds
  forecast_lower int,
  forecast_upper int,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(product_id, forecast_period, model_run_id)
);

-- Supplier Master Table
CREATE TABLE IF NOT EXISTS supplier_master (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_code text NOT NULL UNIQUE,
  supplier_name text NOT NULL,
  lead_time_days int DEFAULT 0,
  lead_time_variability_days int DEFAULT 0,
  is_primary boolean DEFAULT true,
  location text,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Product-Supplier Mapping
CREATE TABLE IF NOT EXISTS product_supplier_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES supplier_master(id) ON DELETE CASCADE,
  is_primary boolean DEFAULT true,
  lead_time_days int,
  cost_per_unit numeric(12,2),
  minimum_order_qty int,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(product_id, supplier_id)
);

-- Service Levels by Family
CREATE TABLE IF NOT EXISTS service_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_code text NOT NULL,
  service_level_percent numeric(5,2) NOT NULL DEFAULT 95,
  target_fill_rate numeric(5,2) NOT NULL DEFAULT 95,
  stockout_cost_per_unit numeric(12,2) DEFAULT 0,
  holding_cost_percent numeric(5,2) DEFAULT 20,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(family_code)
);

-- Enable RLS on all tables
ALTER TABLE calendar_dimension ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_hierarchy ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE forecast_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_supplier_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_levels ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Calendar accessible to authenticated users"
  ON calendar_dimension FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Product hierarchy accessible to authenticated users"
  ON product_hierarchy FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = product_hierarchy.product_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view promotion events for their products"
  ON promotion_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = promotion_events.product_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create/edit promotion events for their products"
  ON promotion_events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = promotion_events.product_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their promotion events"
  ON promotion_events FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = promotion_events.product_id
      AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = promotion_events.product_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view forecast results for their products"
  ON forecast_results FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = forecast_results.product_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Suppliers visible to authenticated users"
  ON supplier_master FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can view supplier mappings for their products"
  ON product_supplier_map FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = product_supplier_map.product_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Service levels visible to authenticated users"
  ON service_levels FOR SELECT
  TO authenticated
  USING (true);

-- Create indexes for performance
CREATE INDEX idx_calendar_date ON calendar_dimension(calendar_date);
CREATE INDEX idx_calendar_period ON calendar_dimension(year_num, month_num);
CREATE INDEX idx_calendar_season ON calendar_dimension(season);
CREATE INDEX idx_product_hierarchy_product ON product_hierarchy(product_id);
CREATE INDEX idx_product_hierarchy_family ON product_hierarchy(family_code);
CREATE INDEX idx_promotion_product_date ON promotion_events(product_id, start_date, end_date);
CREATE INDEX idx_forecast_results_product_period ON forecast_results(product_id, forecast_period);
CREATE INDEX idx_forecast_results_model_run ON forecast_results(model_run_id);
CREATE INDEX idx_supplier_code ON supplier_master(supplier_code);
CREATE INDEX idx_product_supplier_product ON product_supplier_map(product_id);
CREATE INDEX idx_service_level_family ON service_levels(family_code);