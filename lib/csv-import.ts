import * as XLSX from 'xlsx';

interface ColumnMatch {
  fileColumn: string;
  suggestedTarget: string;
  confidence: number;
}

const EXPECTED_COLUMNS = [
  { name: 'Date', aliases: ['date', 'day', 'timestamp', 'time', 'period', 'month'] },
  { name: 'SKU', aliases: ['sku', 'product_sku', 'code', 'productcode', 'item_code'] },
  { name: 'Product Name', aliases: ['product_name', 'product', 'name', 'description', 'item_name'] },
  { name: 'Category', aliases: ['category', 'product_category', 'type', 'class', 'segment'] },
  { name: 'Units Sold', aliases: ['units_sold', 'qty', 'quantity', 'units', 'sold_units', 'volume'] },
  { name: 'Revenue', aliases: ['revenue', 'sales', 'amount', 'total', 'sales_amount', 'total_revenue'] },
  { name: 'Promotion Flag', aliases: ['promotion_flag', 'promo', 'promotion', 'is_promotion', 'on_promo'] },
  { name: 'Stockout Flag', aliases: ['stockout_flag', 'stockout', 'out_of_stock', 'oos', 'is_stockout'] },
];

export interface CSVValidationError {
  row: number;
  column: string;
  message: string;
  severity: 'error' | 'warning';
}

function normalizeString(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

export function suggestColumnMapping(csvColumns: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};

  for (const expected of EXPECTED_COLUMNS) {
    let bestMatch = '';
    let bestScore = 0;

    for (const csvCol of csvColumns) {
      const normalized = normalizeString(csvCol);
      let score = 0;

      // Exact match
      if (normalized === normalizeString(expected.name)) score = 1;
      // Alias match
      else if (expected.aliases.some(alias => normalized.includes(normalizeString(alias)) || normalizeString(alias).includes(normalized))) {
        score = 0.9;
      }
      // Partial match
      else if (normalizeString(expected.name).includes(normalized) || normalized.includes(normalizeString(expected.name))) {
        score = 0.7;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = csvCol;
      }
    }

    if (bestMatch && bestScore > 0.5) {
      mapping[expected.name] = bestMatch;
    }
  }

  return mapping;
}

export async function parseCSVFile(file: File): Promise<{ columns: string[]; rows: Record<string, unknown>[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) throw new Error('Failed to read file');

        const workbook = XLSX.read(data, { type: 'binary' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        if (!sheet) throw new Error('No sheet found');

        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
        const columns = Object.keys(rows[0] || {});

        resolve({ columns, rows });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsBinaryString(file);
  });
}

export function validateData(
  rows: Record<string, unknown>[],
  mapping: Record<string, string>
): { validRows: Record<string, unknown>[]; errors: CSVValidationError[] } {
  const errors: CSVValidationError[] = [];
  const validRows: Record<string, unknown>[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    let hasError = false;

    // Validate Date
    const dateCol = mapping['Date'];
    if (dateCol && row[dateCol]) {
      const dateStr = String(row[dateCol]).trim();
      if (!/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
        errors.push({
          row: i + 2,
          column: 'Date',
          message: 'Invalid date format (expected YYYY-MM-DD)',
          severity: 'error',
        });
        hasError = true;
      }
    }

    // Validate SKU
    const skuCol = mapping['SKU'];
    if (skuCol && !row[skuCol]) {
      errors.push({
        row: i + 2,
        column: 'SKU',
        message: 'SKU is required',
        severity: 'error',
      });
      hasError = true;
    }

    // Validate numeric columns
    const numericCols = ['Units Sold', 'Revenue'];
    for (const col of numericCols) {
      const csvCol = mapping[col];
      if (csvCol && row[csvCol]) {
        const val = Number(row[csvCol]);
        if (isNaN(val)) {
          errors.push({
            row: i + 2,
            column: col,
            message: `Non-numeric value found`,
            severity: 'error',
          });
          hasError = true;
        } else if (val < 0) {
          errors.push({
            row: i + 2,
            column: col,
            message: `Negative value detected`,
            severity: 'warning',
          });
        }
      }
    }

    if (!hasError) validRows.push(row);
  }

  return { validRows, errors };
}

export function transformRow(row: Record<string, unknown>, mapping: Record<string, string>): {
  date: string;
  sku: string;
  product_name: string;
  category: string;
  units_sold: number;
  revenue: number;
  promotion_flag: boolean;
  stockout_flag: boolean;
} {
  return {
    date: String(row[mapping['Date']] || '').trim(),
    sku: String(row[mapping['SKU']] || '').trim().toUpperCase(),
    product_name: String(row[mapping['Product Name']] || '').trim(),
    category: String(row[mapping['Category']] || '').trim(),
    units_sold: Number(row[mapping['Units Sold']] || 0),
    revenue: Number(row[mapping['Revenue']] || 0),
    promotion_flag: String(row[mapping['Promotion Flag']] || 'false').toLowerCase() === 'true',
    stockout_flag: String(row[mapping['Stockout Flag']] || 'false').toLowerCase() === 'true',
  };
}
