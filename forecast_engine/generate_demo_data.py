"""
Generate comprehensive demo dataset for demand planning platform
Output: CSV files for import into the application
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random

def generate_products(num_skus=120):
    """Generate extended product catalog with 120+ SKUs"""
    categories = ['Electronics', 'Apparel', 'Food & Beverage', 'Home & Garden', 'Sports', 'Automotive']
    brands = ['TechCorp', 'StyleMax', 'NutriHub', 'HomeFlow', 'AthleteZone', 'AutoPro']
    subcats = ['Premium', 'Standard', 'Budget', 'Professional', 'Casual']

    products = []
    sku_counter = 1000

    base_products = [
        ('EL-001', 'Wireless Headphones Pro', 'Electronics', 'Audio', 'SoundCore', 149.99, 14, 'A', 'X'),
        ('EL-002', 'Smart Watch Series 5', 'Electronics', 'Wearables', 'TechFit', 299.99, 21, 'A', 'Y'),
        ('EL-003', 'Bluetooth Speaker Mini', 'Electronics', 'Audio', 'SoundCore', 79.99, 10, 'B', 'X'),
        ('AP-001', 'Performance Running Shoes', 'Apparel', 'Footwear', 'StepFast', 119.99, 30, 'A', 'Y'),
        ('FB-001', 'Premium Coffee Blend', 'Food & Beverage', 'Coffee', 'BeanMaster', 24.99, 7, 'A', 'X'),
    ]

    products.extend([{
        'sku': sku, 'product_name': name, 'category': cat, 'subcategory': subcat,
        'brand': brand, 'unit_price': price, 'lead_time_days': lt, 'abc_class': abc, 'xyz_class': xyz
    } for sku, name, cat, subcat, brand, price, lt, abc, xyz in base_products])

    # Generate additional SKUs
    for cat_idx, category in enumerate(categories):
        for i in range(15):
            cat_prefix = category[:2].upper()
            sku = f"{cat_prefix}-{sku_counter:03d}"
            sku_counter += 1

            base_price = 30 + random.random() * 250
            lead_time = 5 + random.randint(0, 30)
            abc_hash = (cat_idx * 17 + i * 13) % 100
            abc_class = 'A' if abc_hash < 80 else ('B' if abc_hash < 95 else 'C')
            xyz_class = random.choice(['X', 'Y', 'Z'])

            products.append({
                'sku': sku,
                'product_name': f"{category} Product {i+1}",
                'category': category,
                'subcategory': random.choice(subcats),
                'brand': brands[cat_idx],
                'unit_price': round(base_price, 2),
                'lead_time_days': lead_time,
                'abc_class': abc_class,
                'xyz_class': xyz_class
            })

    return pd.DataFrame(products)

def generate_sales_history(products_df, months=36):
    """Generate 36 months of realistic sales history with seasonality, promotions, stockouts"""
    sales_records = []
    now = datetime.now()

    # Promotion calendar
    promotion_months = [9, 10, 11, 4]  # Oct, Nov, Dec, May (0-indexed Sep, Oct, Nov, Apr)
    black_friday_weeks = [47, 48]

    for _, product in products_df.iterrows():
        sku = product['sku']
        price = product['unit_price']

        # SKU-specific base demand derived from hash
        sku_hash = sum(ord(c) for c in sku)
        base_units = 200 + (sku_hash % 800)

        for month_offset in range(months, -1, -1):
            date = now - timedelta(days=30*month_offset)
            month_idx = date.month - 1

            # Multi-harmonic seasonality
            holiday_peak = 1.4 if (month_idx >= 10 or month_idx <= 0) else 1.0
            summer_dip = 0.7 if 6 <= month_idx <= 7 else 1.0
            spring_upswing = 1.15 if 2 <= month_idx <= 4 else 1.0
            base_seasonal = holiday_peak * summer_dip * spring_upswing

            seasonal = np.sin(((month_idx - 2) / 12) * 2 * np.pi) * (base_units * 0.3) * base_seasonal
            trend = (36 - month_offset) * (base_units * 0.015)
            noise = (random.random() - 0.5) * (base_units * 0.12)

            # Promotion probability
            promo_chance = 0.25 if month_idx in promotion_months else 0.08
            promo_flag = random.random() < promo_chance

            # Stockout probability
            stockout_chance = 0.08 if promo_flag else 0.03
            stockout_flag = random.random() < stockout_chance

            units = max(10, int(base_units + seasonal + trend + noise))

            if promo_flag:
                units = int(units * (1.25 + random.random() * 0.3))

            if stockout_flag:
                units = int(units * 0.4)

            sales_records.append({
                'sku': sku,
                'date': date.strftime('%Y-%m-%d'),
                'units_sold': units,
                'revenue': units * price,
                'promotion_flag': int(promo_flag),
                'stockout_flag': int(stockout_flag)
            })

    return pd.DataFrame(sales_records)

def generate_promotions(products_df):
    """Generate promotion event calendar"""
    promotions = []
    now = datetime.now()

    event_types = ['seasonal', 'clearance', 'holiday', 'flash_sale', 'bundle']

    for _, product in products_df.iterrows():
        sku = product['sku']

        # A-class products get more promotions
        if product['abc_class'] == 'A' and random.random() < 0.6:
            # Q4 holidays
            event_start = datetime(now.year, 10, 15)
            event_end = datetime(now.year, 12, 31)
            promotions.append({
                'sku': sku,
                'event_name': f"Q4 Holiday Campaign - {sku}",
                'event_type': 'holiday',
                'start_date': event_start.strftime('%Y-%m-%d'),
                'end_date': event_end.strftime('%Y-%m-%d'),
                'discount_percent': 15 + random.random() * 25,
                'expected_lift_percent': 25 + random.random() * 40,
                'status': 'planned'
            })

        # Black Friday/Cyber Monday
        if random.random() < 0.7:
            bf_date = datetime(now.year, 11, 25)  # Approximate Black Friday
            promotions.append({
                'sku': sku,
                'event_name': f"Black Friday Sale - {sku}",
                'event_type': 'flash_sale',
                'start_date': (bf_date - timedelta(days=2)).strftime('%Y-%m-%d'),
                'end_date': (bf_date + timedelta(days=2)).strftime('%Y-%m-%d'),
                'discount_percent': 30 + random.random() * 20,
                'expected_lift_percent': 50 + random.random() * 50,
                'status': 'planned'
            })

    return pd.DataFrame(promotions)

if __name__ == '__main__':
    print("Generating extended product catalog...")
    products_df = generate_products(120)
    products_df.to_csv('demo_products.csv', index=False)
    print(f"✓ Generated {len(products_df)} products -> demo_products.csv")

    print("Generating 36 months of sales history...")
    sales_df = generate_sales_history(products_df, months=36)
    sales_df.to_csv('demo_sales_history.csv', index=False)
    print(f"✓ Generated {len(sales_df)} sales records -> demo_sales_history.csv")

    print("Generating promotion events...")
    promo_df = generate_promotions(products_df)
    promo_df.to_csv('demo_promotions.csv', index=False)
    print(f"✓ Generated {len(promo_df)} promotion events -> demo_promotions.csv")

    print("\nDataset Summary:")
    print(f"  Products: {len(products_df)}")
    print(f"  Sales Records: {len(sales_df)} ({len(sales_df)//len(products_df)} months average)")
    print(f"  Promotion Events: {len(promo_df)}")
    print(f"\nFiles ready for import:")
    print(f"  - demo_products.csv")
    print(f"  - demo_sales_history.csv")
    print(f"  - demo_promotions.csv")
