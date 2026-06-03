'use client';

import { useState, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText, CheckCircle, AlertCircle, ChevronRight, X, RotateCcw, Table, Zap, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { parseCSVFile, suggestColumnMapping, validateData, transformRow, CSVValidationError } from '@/lib/csv-import';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { isDemoMode } from '@/lib/demo-mode';
import { saveLocalImport } from '@/lib/local-import-store';
import { ForecastPlanSelector } from '@/components/forecast-plan-selector';
import {
  loadForecastPreferences,
  saveForecastPreferences,
  type ForecastPreferences,
  horizonToPeriods,
} from '@/lib/forecast-settings';
import { useRouter } from 'next/navigation';

type Step = 'upload' | 'mapping' | 'validation' | 'preview' | 'complete';

const EXPECTED_COLUMNS = [
  'Date',
  'SKU',
  'Product Name',
  'Famille',
  'Sous-famille',
  'Units Sold',
  'Revenue',
  'Promotion Flag',
  'Stockout Flag',
];
const UNMAPPED = '__unmapped__';

export default function ImportPage() {
  const { isDemo } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [forecastPrefs, setForecastPrefs] = useState<ForecastPreferences>(() => loadForecastPreferences());
  const [step, setStep] = useState<Step>('upload');
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<{ name: string; rows: unknown[] } | null>(null);
  const [fileColumns, setFileColumns] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [validationErrors, setValidationErrors] = useState<CSVValidationError[]>([]);
  const [validatedRows, setValidatedRows] = useState<unknown[]>([]);
  const [importing, setImporting] = useState(false);

  const handleFile = useCallback(async (fileObj: File) => {
    try {
      const ext = fileObj.name.split('.').pop()?.toLowerCase();
      if (!['csv', 'xlsx', 'xls'].includes(ext ?? '')) {
        toast.error('Unsupported file type. Use CSV or Excel files.');
        return;
      }

      const { columns, rows } = await parseCSVFile(fileObj);
      if (rows.length === 0) {
        toast.error('File is empty');
        return;
      }

      setFile({ name: fileObj.name, rows });
      setFileColumns(columns);

      // Auto-suggest mapping
      const suggestedMapping = suggestColumnMapping(columns);
      setColumnMapping(suggestedMapping);
      setStep('mapping');
      toast.success(`File loaded: ${rows.length} rows detected`);
    } catch (error) {
      toast.error(`Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) void handleFile(dropped);
    },
    [handleFile]
  );

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) void handleFile(f);
    e.target.value = '';
  }

  function runValidation() {
    if (!file) return;
    const { validRows, errors } = validateData(file.rows as Record<string, unknown>[], columnMapping);
    setValidationErrors(errors);
    setValidatedRows(validRows);
    setStep('validation');
  }

  function goToPreview() {
    setStep('preview');
  }

  async function runImport() {
    if (!file || !validatedRows.length) return;

    setImporting(true);
    try {
      const transformedRows = (validatedRows as Record<string, unknown>[]).map(row =>
        transformRow(row, columnMapping)
      );

      if (isDemoMode() || isDemo) {
        const count = saveLocalImport(transformedRows);
        setStep('complete');
        saveForecastPreferences(forecastPrefs);
        toast.success(`${count} lignes importées (stockage local — mode démo)`);
        setStep('complete');
        setImporting(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check/create products
      const uniqueSkus = Array.from(new Set(transformedRows.map(r => r.sku)));
      for (const sku of uniqueSkus) {
        const { data: existing } = await supabase
          .from('products')
          .select('id')
          .eq('sku', sku)
          .maybeSingle();

        if (!existing) {
          const row = transformedRows.find(r => (r as any).sku === sku);
          if (row) {
            await supabase.from('products').insert({
              sku,
              product_name: (row as any).product_name,
              category: (row as any).family ?? (row as any).category,
              subcategory: (row as any).subfamily ?? (row as any).subcategory ?? '',
              unit_price: 0,
              user_id: user!.id,
            });
          }
        }
      }

      // Get product IDs
      const { data: products } = await supabase
        .from('products')
        .select('id, sku')
        .in('sku', uniqueSkus);

      const skuToId = Object.fromEntries((products || []).map(p => [p.sku, p.id]));

      // Insert sales history
      const salesRows = transformedRows.map(r => ({
        product_id: skuToId[r.sku],
        date: r.date,
        units_sold: r.units_sold,
        revenue: r.revenue,
        promotion_flag: r.promotion_flag,
        stockout_flag: r.stockout_flag,
      }));

      const { error: insertError } = await supabase
        .from('sales_history')
        .insert(salesRows);

      if (insertError) throw insertError;

      saveForecastPreferences(forecastPrefs);
      setStep('complete');
      toast.success(`${transformedRows.length} rows imported successfully`);
    } catch (error) {
      toast.error(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setImporting(false);
    }
  }

  function reset() {
    setStep('upload');
    setFile(null);
    setFileColumns([]);
    setColumnMapping({});
    setValidationErrors([]);
    setValidatedRows([]);
  }

  const STEPS: { id: Step; label: string }[] = [
    { id: 'upload', label: 'Upload' },
    { id: 'mapping', label: 'Map Columns' },
    { id: 'validation', label: 'Validate' },
    { id: 'preview', label: 'Preview' },
    { id: 'complete', label: 'Complete' },
  ];

  const stepIndex = STEPS.findIndex(s => s.id === step);
  const errorCount = validationErrors.filter(e => e.severity === 'error').length;
  const warningCount = validationErrors.filter(e => e.severity === 'warning').length;

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold">Import Data</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Upload sales history from CSV or Excel — AI-powered column mapping</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <div className={cn(
              'flex items-center gap-2 text-sm font-medium',
              i < stepIndex ? 'text-emerald-400' : i === stepIndex ? 'text-primary' : 'text-muted-foreground'
            )}>
              <span className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                i < stepIndex ? 'bg-emerald-500/20 text-emerald-400' :
                i === stepIndex ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              )}>
                {i < stepIndex ? <CheckCircle className="w-3.5 h-3.5" /> : i + 1}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </div>
        ))}
      </div>

      {/* Step: Upload */}
      {step === 'upload' && (
        <div
          role="button"
          tabIndex={0}
          className={cn(
            'rounded-xl border-2 border-dashed p-12 text-center transition-colors cursor-pointer',
            dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/20'
          )}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={openFilePicker}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openFilePicker(); } }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only"
            onChange={handleFileInput}
          />
          <Upload className={cn('w-10 h-10 mx-auto mb-4', dragging ? 'text-primary' : 'text-muted-foreground')} />
          <h3 className="text-base font-semibold mb-2">Drop your file here</h3>
          <p className="text-sm text-muted-foreground mb-4">Supports CSV, XLSX, XLS — up to 100MB</p>
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer"
            onClick={e => { e.stopPropagation(); openFilePicker(); }}
          >
            Browse Files
          </Button>
          {(isDemoMode() || isDemo) && (
            <p className="text-xs text-amber-400/90 mt-4 max-w-md mx-auto">
              Mode démo : l&apos;import est enregistré localement dans le navigateur (pas Supabase).
            </p>
          )}

          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-xl mx-auto">
            {EXPECTED_COLUMNS.map(col => (
              <div key={col} className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">{col}</div>
            ))}
          </div>
        </div>
      )}

      {/* Step: Mapping */}
      {step === 'mapping' && file && (
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-primary" />
            <div>
              <div className="text-sm font-semibold">{file.name}</div>
              <div className="text-xs text-muted-foreground">{file.rows.length.toLocaleString()} rows detected</div>
            </div>
            <button onClick={reset} className="ml-auto text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <h3 className="text-sm font-semibold">AI-Suggested Column Mapping</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Auto-detected from your file. Adjust if needed.</p>
            <div className="space-y-2">
              {EXPECTED_COLUMNS.map(col => (
                <div key={col} className="flex items-center gap-3">
                  <div className="w-40 text-sm font-medium shrink-0">{col}</div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  <Select
                    value={columnMapping[col] ?? UNMAPPED}
                    onValueChange={v =>
                      setColumnMapping(p => {
                        const next = { ...p };
                        if (v === UNMAPPED) delete next[col];
                        else next[col] = v;
                        return next;
                      })
                    }
                  >
                    <SelectTrigger className="flex-1 h-8 text-sm">
                      <SelectValue placeholder="Select column…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UNMAPPED}>— Non mappé —</SelectItem>
                      {fileColumns.map(fc => (
                        <SelectItem key={fc} value={fc}>{fc}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {columnMapping[col] && <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={reset}>Cancel</Button>
            <Button onClick={runValidation}>Validate Data</Button>
          </div>
        </div>
      )}

      {/* Step: Validation */}
      {step === 'validation' && (
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center gap-3 mb-4">
              {errorCount === 0 && warningCount === 0 ? (
                <div className="w-9 h-9 rounded-full bg-emerald-500/15 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                </div>
              ) : (
                <div className="w-9 h-9 rounded-full bg-amber-500/15 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-amber-400" />
                </div>
              )}
              <div>
                <div className="text-sm font-semibold">
                  {errorCount === 0 && warningCount === 0
                    ? 'Validation Passed — Ready to import'
                    : `Validation Complete — ${errorCount + warningCount} issues found`}
                </div>
                <div className="text-xs text-muted-foreground">
                  {validatedRows.length} valid rows · {errorCount} errors · {warningCount} warnings
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="rounded-lg p-3 bg-emerald-500/8 border border-emerald-500/20 text-center">
                <div className="text-xl font-bold text-emerald-400">{validatedRows.length}</div>
                <div className="text-xs text-muted-foreground">Valid rows</div>
              </div>
              {errorCount > 0 && (
                <div className="rounded-lg p-3 bg-rose-500/8 border border-rose-500/20 text-center">
                  <div className="text-xl font-bold text-rose-400">{errorCount}</div>
                  <div className="text-xs text-muted-foreground">Errors</div>
                </div>
              )}
              {warningCount > 0 && (
                <div className="rounded-lg p-3 bg-amber-500/8 border border-amber-500/20 text-center">
                  <div className="text-xl font-bold text-amber-400">{warningCount}</div>
                  <div className="text-xs text-muted-foreground">Warnings</div>
                </div>
              )}
            </div>

            {validationErrors.length > 0 && (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {validationErrors.slice(0, 10).map((err, i) => (
                  <div key={i} className={cn(
                    'flex items-start gap-3 p-2 rounded text-xs',
                    err.severity === 'error' ? 'bg-rose-500/8 border border-rose-500/15' : 'bg-amber-500/8 border border-amber-500/15'
                  )}>
                    <AlertCircle className={cn('w-3.5 h-3.5 shrink-0 mt-0.5', err.severity === 'error' ? 'text-rose-400' : 'text-amber-400')} />
                    <div>
                      <div className="font-medium">Row {err.row} — {err.column}</div>
                      <div className="text-muted-foreground">{err.message}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('mapping')}>Back</Button>
            <Button onClick={goToPreview} disabled={validatedRows.length === 0}>Preview Data</Button>
          </div>
        </div>
      )}

      {/* Step: Preview */}
      {step === 'preview' && (
        <div className="space-y-4">
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="px-5 py-3 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Table className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold">Data Preview (first 5 rows)</span>
              </div>
              <span className="text-xs text-muted-foreground">{validatedRows.length} rows ready to import</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/20">
                    {EXPECTED_COLUMNS.map(h => (
                      <th key={h} className="text-left px-4 py-2.5 font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {validatedRows.slice(0, 5).map((row: any, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      {EXPECTED_COLUMNS.map(col => (
                        <td key={col} className="px-4 py-2.5 whitespace-nowrap">
                          {row[columnMapping[col]]?.toString() || '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-5">
            <p className="text-sm font-semibold mb-3">Plan de prévision (après import)</p>
            <ForecastPlanSelector value={forecastPrefs} onChange={setForecastPrefs} compact />
            <p className="text-xs text-muted-foreground mt-3">
              Horizon API : {horizonToPeriods(forecastPrefs.horizonMonths, forecastPrefs.granularity)} périodes (
              {forecastPrefs.granularity})
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('validation')}>Back</Button>
            <Button onClick={runImport} disabled={importing} className="gap-2">
              {importing ? <RotateCcw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              {importing ? 'Importing…' : `Import ${validatedRows.length} Rows`}
            </Button>
          </div>
        </div>
      )}

      {/* Step: Complete */}
      {step === 'complete' && (
        <div className="rounded-xl border bg-card p-8 space-y-6">
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold mb-2">Import réussi</h3>
            <p className="text-muted-foreground">
              {validatedRows.length} lignes importées · Choisissez l&apos;horizon et la granularité pour les prévisions
            </p>
          </div>

          <ForecastPlanSelector
            value={forecastPrefs}
            onChange={prefs => {
              setForecastPrefs(prefs);
              saveForecastPreferences(prefs);
            }}
          />

          <div className="flex flex-wrap gap-2 justify-center pt-2">
            <Button variant="outline" onClick={reset} className="gap-2">
              <Upload className="w-3.5 h-3.5" />
              Importer un autre fichier
            </Button>
            <Button
              className="gap-2"
              onClick={() => {
                saveForecastPreferences(forecastPrefs);
                router.push('/dashboard/forecasting');
              }}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Lancer les prévisions
            </Button>
            <Button variant="secondary" onClick={() => router.push('/dashboard')}>
              Tableau de bord
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
