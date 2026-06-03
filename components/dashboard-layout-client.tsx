'use client';

import { AppShell } from '@/components/app-shell';
import { ImportDataProvider } from '@/lib/import-data-context';

export function DashboardLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <ImportDataProvider>
      <AppShell>{children}</AppShell>
    </ImportDataProvider>
  );
}
