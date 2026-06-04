/*
  # Enterprise Demand Planning Extensions Phase 2
  
  New tables:
  - forecast_snapshots: Monthly cycles
  - forecast_exceptions: Alerts
  - external_signals: Demand signals
  - forecast_hierarchy: Multi-level aggregation
  - service_policies: ABC-XYZ service levels
  - ml_model_registry: Model versioning
  - forecast_engine_jobs: Batch jobs
*/

CREATE TABLE IF NOT EXISTS forecast_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  snapshot_date date NOT NULL,
  cycle_number int NOT NULL,
  forecast_month date NOT NULL,
  forecast_units int NOT NULL,
  forecast_revenue numeric(12,2),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_snapshots_product ON forecast_snapshots(product_id);

CREATE TABLE IF NOT EXISTS forecast_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  exception_type text NOT NULL,
  severity text NOT NULL,
  message text NOT NULL,
  status text DEFAULT 'open',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_exceptions_product ON forecast_exceptions(product_id);

CREATE TABLE IF NOT EXISTS external_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  signal_type text NOT NULL,
  signal_date date NOT NULL,
  signal_value numeric(12,4),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_signals_product ON external_signals(product_id);

CREATE TABLE IF NOT EXISTS forecast_hierarchy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku_code text NOT NULL,
  family_code text,
  category_code text,
  hierarchy_level int,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_hierarchy_product ON forecast_hierarchy(product_id);

CREATE TABLE IF NOT EXISTS service_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  abc_class text NOT NULL,
  xyz_class text NOT NULL,
  service_level_pct numeric(5,2),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ml_model_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name text NOT NULL,
  model_version text NOT NULL,
  is_champion boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS forecast_engine_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type text NOT NULL,
  status text DEFAULT 'queued',
  product_id uuid REFERENCES products(id),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE forecast_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE forecast_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE forecast_hierarchy ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_model_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE forecast_engine_jobs ENABLE ROW LEVEL SECURITY;