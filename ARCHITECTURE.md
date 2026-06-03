# DemandIQ Architecture Overview

## High-Level System Design

```
┌─────────────────────────────────────────────────────────────────┐
│                      Frontend (Next.js 15)                       │
│  ┌─────────────┬──────────────┬──────────────┬────────────────┐ │
│  │   Auth      │   Dashboard  │   Reports    │   Import       │ │
│  │  (Supabase) │   (Charts)   │  (PDF/Excel) │  (CSV/Data)    │ │
│  └─────────────┴──────────────┴──────────────┴────────────────┘ │
│         │                    │                    │               │
│         ├─ RLS Protected     ├─ Real-time        ├─ Batch        │
│         └─ Auth Context      └─ WebSocket         └─ Validation   │
└─────────────────────────────────────────────────────────────────┘
                               │ REST API
┌─────────────────────────────────────────────────────────────────┐
│                   Backend (Supabase PostgreSQL)                  │
│  ┌──────────────┬──────────────┬──────────────┬────────────────┐│
│  │   Products   │   Sales      │   Forecasts  │   Adjustments  ││
│  │  (Master)    │  (History)   │  (Results)   │  (Audit Trail) ││
│  └──────────────┴──────────────┴──────────────┴────────────────┘│
│  ┌──────────────┬──────────────┬──────────────┬────────────────┐│
│  │  Hierarchy   │  Calendar    │  Promotions  │  Service Level ││
│  │  (Family)    │  (Time Dim)  │  (Events)    │  (Targets)     ││
│  └──────────────┴──────────────┴──────────────┴────────────────┘│
│  ┌──────────────┬──────────────┬──────────────┬────────────────┐│
│  │  Suppliers   │  Model Runs  │   FVA        │   Metrics      ││
│  │  (Sourcing)  │  (Audit)     │  (Value Add) │  (Performance) ││
│  └──────────────┴──────────────┴──────────────┴────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                               │ REST API
┌─────────────────────────────────────────────────────────────────┐
│              Forecast Engine (Python FastAPI)                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Model Training & Selection                  │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │  13 Forecasting Models (Statistical + ML)          │  │  │
│  │  │  • SMA, WMA, Exp Smoothing, Holt, HW              │  │  │
│  │  │  • ETS, ARIMA, SARIMA, Croston                    │  │  │
│  │  │  • Linear Regression, Random Forest, XGBoost      │  │  │
│  │  │  • Prophet (Facebook)                             │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │  Metrics Calculation & Evaluation                  │  │  │
│  │  │  • MAPE, WAPE, MASE, RMSE, Bias, RMSSE            │  │  │
│  │  │  • Walk-forward validation (backtesting)          │  │  │
│  │  │  • Model performance tracking                     │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │  Auto-Selection & Ensemble                         │  │  │
│  │  │  • Primary: MASE (most reliable)                   │  │  │
│  │  │  • Secondary: Weighted score (MASE/RMSE/MAPE)     │  │  │
│  │  │  • Ensemble: Top-3 weighted average                │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Supporting Services                        │  │
│  │  • Backtesting Framework (walk-forward validation)     │  │
│  │  • FVA Calculator (workflow value-add tracking)        │  │
│  │  • Performance Tracker (historical metrics)            │  │
│  │  • Inventory Optimizer (safety stock + ROP)           │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Architecture

### Forecast Execution Flow
```
1. User selects product (SKU) & time horizon
   ↓
2. System loads:
   - 36 months sales history (from sales_history table)
   - Promotions (from promotion_events)
   - Stockouts (from sales_history.stockout_flag)
   - External factors (from calendar_dimension)
   ↓
3. FastAPI receives request with historical data
   ↓
4. Train-Test Split (80/20)
   - Training set: 36 months historical
   - Test set: Last ~7 months
   ↓
5. Run 13 Models in Parallel
   - Each model trains on training set
   - Each model predicts on test set
   ↓
6. Calculate Metrics for Each Model
   - MAPE, WAPE, MASE, RMSE, Bias, RMSSE
   - All metrics calculated on same test set (fair comparison)
   ↓
7. Auto-Select Best Model
   - Primary: Lowest MASE
   - Alternative: Weighted score (40% MASE + 25% RMSE + 20% MAPE + 15% Bias)
   ↓
8. Extend Forecast to Horizon
   - Best model forecasts next 6-12 months
   - Calculate 80-120% confidence bounds
   ↓
9. Return Response
   - best_model name
   - forecast_units array
   - confidence_lower/upper
   - model_performance (all 13 models' metrics)
   - training_info (metadata)
   ↓
10. Store in forecast_results table (audit trail)
    - All 13 model forecasts stored side-by-side
    - Actual results filled in when realized
```

### S&OP Workflow Flow
```
STATISTICAL FORECAST
  ↓ (Best model auto-selected by MASE)
  ├─ Forecast units: 1,250
  ├─ MAPE: 18.2%
  ├─ Status: APPROVED
  ↓ [FVA: 22% vs baseline]

SALES ADJUSTMENT
  ↓ (Sales team reviews market knowledge)
  ├─ Adjustment: +8% (promotional event)
  ├─ New forecast: 1,350 units
  ├─ MAPE: 15.2%
  ├─ Status: APPROVED
  ├─ Adjusted by: Sarah Johnson
  ↓ [FVA: 3.5% improvement vs statistical]

SUPPLY CHAIN INPUT
  ↓ (Supply chain reviews constraints)
  ├─ Adjustment: -5% (lead time constraint)
  ├─ Final forecast: 1,280 units
  ├─ MAPE: 14.8%
  ├─ Status: REVIEWED
  ├─ Reviewed by: Mike Chen
  ↓ [FVA: 0.4% improvement]

CONSENSUS FORECAST
  ↓ (Final cross-functional agreement)
  ├─ Consensus: 1,300 units
  ├─ MAPE: 12.1%
  ├─ Status: DRAFT
  ↓ [FVA: 2.7% improvement]
  
LOCKED FOR EXECUTION
  ├─ Total FVA: 28.8% (vs 18% baseline)
  ├─ Status: LOCKED
  ├─ Ready for: PO generation, procurement, inventory
```

## Table Relationships

```
products (master)
├─ sales_history (foreign key)
├─ forecasts (foreign key)
├─ forecast_model_runs (foreign key)
├─ forecast_adjustments (foreign key)
├─ forecast_results (foreign key)
├─ forecast_value_added (foreign key)
├─ product_hierarchy (one-to-one)
├─ promotion_events (one-to-many)
├─ product_supplier_map (one-to-many)
│  └─ supplier_master
└─ service_levels (via family_code)

calendar_dimension (time dimension)
├─ Used in reporting for hierarchical aggregation
└─ References holiday periods, seasons

forecast_model_runs (audit trail)
├─ Links to all forecast_results
├─ Records model training metadata
└─ Enables historical performance tracking
```

## Key Architecture Decisions

### 1. **Model Selection by MASE**
- MASE (Mean Absolute Scaled Error) is scale-invariant
- Comparable across all SKUs (unlike MAPE which can be inflated on low volumes)
- Primary metric for auto-selection
- Weighted secondary metrics for tie-breaking

### 2. **13 Models, Not 1**
- Statistical models capture trend/seasonality without data
- ML models capture complex patterns with feature engineering
- Ensemble approach: Top-3 models weighted (50%, 30%, 20%)
- Allows ABC-XYZ specific recommendations

### 3. **Train-Test Split (80/20)**
- 36 months data: ~29 months training, ~7 months test
- Fair comparison: all models evaluated on same test set
- Walk-forward validation optional for deeper backtesting

### 4. **S&OP Workflow as Audit Trail**
- Statistical (baseline)
- Sales input (market knowledge)
- Supply chain input (constraints)
- Consensus (final approved)
- Each stage records FVA improvement
- Full traceability for compliance

### 5. **Enterprise Tables for Scale**
- `calendar_dimension`: Enables reporting by week/month/quarter/season
- `product_hierarchy`: Multi-level aggregation (Family → Brand → SKU)
- `forecast_results`: All model outputs stored (enables model comparison dashboard)
- `service_levels`: Configurable by product family (not per-SKU)

---

## Scalability Considerations

### Current Performance
- 95 products: Build time ~5 sec, forecast time ~200-500ms per SKU
- 36 months history: Handles efficiently
- 13 models: Run in parallel, ~500ms total latency

### Scaling Path
| Metric | Small (Current) | Mid-Market | Enterprise |
|--------|-----------------|------------|------------|
| SKUs | 95 | 500-1,000 | 10,000+ |
| History | 36 months | 60 months | 84+ months |
| Models | 13 (sequential) | 13 (parallel) | 20+ (selective) |
| Forecast Freq | Monthly | Weekly | Daily |
| Latency Target | <1s | <500ms | <200ms |
| Retraining | Quarterly | Monthly | Weekly |

### Optimization Strategies
1. **Parallel Model Execution**: Use Ray or Dask for distributed training
2. **Caching**: Cache model coefficients for stable products (XYZ: X)
3. **Feature Store**: Pre-compute lag features, seasonal indicators
4. **Database Indexing**: Composite indexes on (product_id, forecast_period)
5. **Archive Old Data**: Move 5+ year old sales to cold storage
6. **Selective Models**: ABC products get all 13 models, C products get SMA only

---

## Security & Compliance

### Row-Level Security (RLS)
- All tables protected with RLS policies
- Users see only their organization's data
- Policies check `auth.uid()` against `user_id`

### Audit Trail
- `forecast_adjustments`: Every S&OP change tracked (who, when, before/after)
- `forecast_model_runs`: Training metadata for compliance
- `forecast_value_added`: FVA calculations for performance reviews

### Data Integrity
- Foreign keys prevent orphaned records
- Unique constraints on critical fields
- Default values for timestamps (created_at, updated_at)
- Soft deletes optional (not hard deletes)

### Environment Variables
- `.env`: Local development secrets
- `.env.production`: Production secrets (Supabase, API keys)
- `NEXT_PUBLIC_*`: Safe for frontend consumption

---

## Monitoring & Observability

### Model Performance Dashboard (`/dashboard/comparison`)
- Tracks accuracy (MAPE, WAPE) over time
- Alerts if best model changes (model drift)
- Compares new models vs current production

### FVA Tracking Dashboard (`/dashboard/fva`)
- Monitors S&OP workflow efficiency
- Tracks value-add at each stage
- Identifies bottlenecks in consensus process

### Recommended Metrics
- Model MAPE: Alert if >20% for 2 consecutive weeks
- Model RMSE: Alert if increases >10%
- S&OP Cycle Time: Alert if >7 days
- Forecast Bias: Alert if >±10%

---

## Future Enhancements

### Near-term (1-2 months)
- [ ] Automatic model retraining scheduler
- [ ] Real-time forecast updates via WebSocket
- [ ] Email notifications for S&OP approvals
- [ ] PDF/Excel report generation

### Medium-term (2-3 months)
- [ ] Multi-warehouse scenario planning
- [ ] Supplier constraint solver
- [ ] AI-powered promotional recommendations
- [ ] API for ERP integration (SAP, NetSuite)

### Long-term (3-6 months)
- [ ] Generative AI for demand insight explanations
- [ ] Advanced simulation engine (Monte Carlo)
- [ ] Data marketplace integrations (weather, competitor data)
- [ ] Blockchain audit trail for compliance

---

**Architecture Version**: 2.0  
**Last Updated**: June 2026  
**Status**: Production-ready for MVP & Demo
