import { api } from './client';

export interface CaseStatusCount {
  status: string;
  label: string;
  count: number;
}

export interface DocTypeCount {
  doc_type: string;
  label: string;
  count: number;
}

export interface AuditDailyActivity {
  date: string;
  display_date: string;
  count: number;
  success: number;
  denied: number;
}

export interface SecurityAlert {
  id: string;
  severity: 'high' | 'medium' | 'info';
  type: string;
  title: string;
  description: string;
  timestamp: string;
}

export interface TotalsSummary {
  cases: number;
  documents: number;
  signatures: number;
  audit_events: number;
  active_shares: number;
}

export interface DashboardStatsResponse {
  cases_by_status: CaseStatusCount[];
  documents_by_type: DocTypeCount[];
  audit_activity_7d: AuditDailyActivity[];
  security_alerts: SecurityAlert[];
  totals: TotalsSummary;
}

export const dashboardApi = {
  getStats: () => {
    return api.get<DashboardStatsResponse>('/dashboard/stats');
  },
};
