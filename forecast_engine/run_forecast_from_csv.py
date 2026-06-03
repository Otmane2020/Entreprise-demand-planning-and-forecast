#!/usr/bin/env python3
"""Run DemandIQ forecasts for each SKU in a sales history CSV."""

from __future__ import annotations

import argparse
import csv
import json
import sys
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


def _pick(columns: list[str], *candidates: str) -> str:
    lower = {c.lower(): c for c in columns}
    for cand in candidates:
        if cand.lower() in lower:
            return lower[cand.lower()]
    for col in columns:
        if any(c in col.lower() for c in candidates):
            return col
    raise KeyError(f"Missing column (tried {candidates}) in {columns}")


def load_sales(path: Path) -> list[dict]:
    with path.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        columns = [c.strip() for c in reader.fieldnames or []]
        date_c = _pick(columns, "date")
        sku_c = _pick(columns, "sku")
        product_c = _pick(columns, "product", "product name", "product_name")
        units_c = _pick(columns, "units_sold", "units sold", "units")
        revenue_c = _pick(columns, "revenue")
        promo_c = _pick(columns, "promotion_flag", "promotion flag", "promotion")
        stockout_c = _pick(columns, "stockout_flag", "stockout flag", "stockout")

        rows: list[dict] = []
        for raw in reader:
            date_val = raw[date_c].strip()[:10]
            rows.append(
                {
                    "date": date_val,
                    "sku": raw[sku_c].strip().upper(),
                    "product_name": raw[product_c].strip(),
                    "units": float(raw[units_c]),
                    "revenue": float(raw[revenue_c]),
                    "promotion_flag": str(raw[promo_c]).strip() in ("1", "true", "True", "yes"),
                    "stockout_flag": str(raw[stockout_c]).strip() in ("1", "true", "True", "yes"),
                }
            )
    rows.sort(key=lambda r: (r["sku"], r["date"]))
    return rows


def group_by_sku(rows: list[dict]) -> dict[str, list[dict]]:
    grouped: dict[str, list[dict]] = {}
    for row in rows:
        grouped.setdefault(row["sku"], []).append(row)
    return grouped


def forecast_sku(
    api_base: str,
    sku: str,
    product_name: str,
    history_rows: list[dict],
    horizon: int,
) -> dict:
    history = [
        {
            "date": row["date"],
            "units": float(row["units"]),
            "revenue": float(row["revenue"]),
            "promotion_flag": bool(row["promotion_flag"]),
            "stockout_flag": bool(row["stockout_flag"]),
        }
        for row in history_rows
    ]
    payload = {
        "product_id": sku,
        "sku": sku,
        "product_name": product_name,
        "history": history,
        "forecast_horizon": horizon,
    }
    req = Request(
        f"{api_base.rstrip('/')}/forecast",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urlopen(req, timeout=120) as resp:
        return json.loads(resp.read().decode("utf-8"))


def main() -> int:
    parser = argparse.ArgumentParser(description="Run forecasts from a sales CSV")
    parser.add_argument(
        "csv_path",
        nargs="?",
        default=str(Path(__file__).parent / "demo_furniture_sales.csv"),
    )
    parser.add_argument("--api", default="http://localhost:8000")
    parser.add_argument("--horizon", type=int, default=6)
    parser.add_argument("--min-history", type=int, default=8)
    parser.add_argument("-o", "--output", help="Write JSON results to file")
    args = parser.parse_args()

    path = Path(args.csv_path)
    if not path.is_file():
        print(f"File not found: {path}", file=sys.stderr)
        return 1

    rows = load_sales(path)
    by_sku = group_by_sku(rows)

    results: dict[str, dict] = {}
    skipped: list[str] = []

    print(f"API: {args.api}")
    print(f"CSV: {path} ({len(rows)} rows, {len(by_sku)} SKUs)\n")

    for sku in sorted(by_sku.keys()):
        group = by_sku[sku]
        product_name = group[0]["product_name"]
        n = len(group)
        if n < args.min_history:
            skipped.append(f"{sku} ({n} points, need {args.min_history})")
            continue
        try:
            out = forecast_sku(args.api, sku, product_name, group, args.horizon)
            results[sku] = out
            units = out.get("forecast_units", [])
            model = out.get("best_model", "?")
            mape = out.get("metrics", {}).get("mape")
            mape_s = f"{mape:.1f}%" if isinstance(mape, (int, float)) else "n/a"
            print(f"=== {sku} — {product_name} ({n} months) ===")
            print(f"  Best model: {model}  |  MAPE: {mape_s}")
            print(f"  Forecast units ({args.horizon}m): {[round(u, 1) for u in units]}")
            print()
        except HTTPError as e:
            body = e.read().decode("utf-8", errors="replace")
            print(f"ERROR {sku}: HTTP {e.code} — {body}\n", file=sys.stderr)
        except URLError as e:
            print(f"ERROR {sku}: {e}", file=sys.stderr)
            print("Is the forecast engine running on port 8000?", file=sys.stderr)
            return 1

    if skipped:
        print("Skipped (insufficient history):")
        for s in skipped:
            print(f"  - {s}")

    if args.output:
        out_path = Path(args.output)
        out_path.write_text(json.dumps(results, indent=2), encoding="utf-8")
        print(f"\nResults written to {out_path}")

    return 0 if results else 1


if __name__ == "__main__":
    raise SystemExit(main())
