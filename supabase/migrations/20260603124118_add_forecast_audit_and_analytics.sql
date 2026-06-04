/*
  # Add Forecast Model History, S&OP Audit Trail, and FVA Tracking

  ## Overview
  Critical tables for enterprise credibility:
  - forecast_model_runs: Track all model trainings and performance metrics
  - forecast_adjustments: Audit trail for S&OP workflow changes
  - forecast_value_added: Compare forecast quality across workflow stages

  ## New Tables

  ### forecast_model_runs
  - Stores every model training with performance metrics (MAPE, WAPE, MASE, RMSE, Bias)
  - Tracks which model was selected for production
  - Records training period for reproducibility
  - Allows analyzing model performance over time

  ### forecast_adjustments
  - Complete audit trail of S&OP process
  - Tracks: statistical → sales → consensus adjustments
  - Stores reason for each change
  - User attribution for accountability

  ### forecast_value_added
  - FVA comparison: baseline vs statistical vs sales vs consensus
  - Shows value of sales input in S&OP
  - Key metric for supply chain directors
  - Demonstrates ROI of planning process
*/

-- =====================
-- FORECAST MODEL RUNS
-- =====================
CREATE TABLE IF NOT EXISTS forecast_model_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  model_name text NOT NULL,
  mape numeric(8,4),
  wape numeric(8,4),
  mase numeric(8,4),
  rmse numeric(12,4),
  bias numeric(8,4),
  selected boolean DEFAULT false,
  run_date date NOT NULL DEFAULT CURRENT_DATE,
  training_period_start date NOT NULL,
  training_period_end date NOT NULL,
  forecast_horizon_months integer DEFAULT 6,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE forecast_model_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view model runs"
  ON forecast_model_runs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert model runs"
  ON forecast_model_runs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_forecast_model_runs_product ON forecast_model_runs(product_id);
CREATE INDEX IF NOT EXISTS idx_forecast_model_runs_run_date ON forecast_model_runs(run_date);
CREATE INDEX IF NOT EXISTS idx_forecast_model_runs_selected ON forecast_model_runs(selected) WHERE selected = true;

-- =====================
-- FORECAST ADJUSTMENTS (S&OP Audit Trail)
-- =====================
CREATE TABLE IF NOT EXISTS forecast_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_version_id uuid NOT NULL REFERENCES forecast_versions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  adjustment_type text NOT NULL, -- 'statistical', 'sales', 'consensus'
  old_value numeric(12,2),
  new_value numeric(12,2),
  variance_percent numeric(8,2),
  reason text,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE forecast_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view adjustments"
  ON forecast_adjustments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert adjustments"
  ON forecast_adjustments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_forecast_adjustments_forecast_version ON forecast_adjustments(forecast_version_id);
CREATE INDEX IF NOT EXISTS idx_forecast_adjustments_user ON forecast_adjustments(user_id);
CREATE INDEX IF NOT EXISTS idx_forecast_adjustments_created_at ON forecast_adjustments(created_at);

-- =====================
-- FORECAST VALUE ADDED
-- =====================
CREATE TABLE IF NOT EXISTS forecast_value_added (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_version_id uuid NOT NULL REFERENCES forecast_versions(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  period_date date NOT NULL,
  
  -- Baseline forecast (naive/simple MA)
  baseline_forecast numeric(12,2) NOT NULL,
  baseline_mape numeric(8,4),
  
  -- Statistical forecast
  statistical_forecast numeric(12,2) NOT NULL,
  statistical_mape numeric(8,4),
  
  -- Sales adjusted forecast
  sales_forecast numeric(12,2),
  sales_mape numeric(8,4),
  
  -- Consensus forecast
  consensus_forecast numeric(12,2),
  consensus_mape numeric(8,4),
  
  -- FVA Metrics
  statistical_fva numeric(8,4),  -- vs baseline
  sales_fva numeric(8,4),        -- vs statistical
  consensus_fva numeric(8,4),    -- vs sales
  total_fva numeric(8,4),        -- vs baseline
  
  -- Context
  actual_units numeric(12,2),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE forecast_value_added ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view FVA"
  ON forecast_value_added FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert FVA"
  ON forecast_value_added FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_forecast_value_added_product ON forecast_value_added(product_id);
CREATE INDEX IF NOT EXISTS idx_forecast_value_added_period ON forecast_value_added(period_date);
CREATE INDEX IF NOT EXISTS idx_forecast_value_added_forecast_version ON forecast_value_added(forecast_version_id);
