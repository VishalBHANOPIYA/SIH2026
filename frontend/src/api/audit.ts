import { api } from './client';
import type { AuditPaginatedResponse } from '../types';

export interface AuditFilterParams {
  case_id?: number;
  user_id?: number;
  action?: string;
  outcome?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export const auditApi = {
  getLogs: (params: AuditFilterParams = {}) => {
    const query = new URLSearchParams();
    if (params.case_id) query.append('case_id', params.case_id.toString());
    if (params.user_id) query.append('user_id', params.user_id.toString());
    if (params.action) query.append('action', params.action);
    if (params.outcome) query.append('outcome', params.outcome);
    if (params.from) query.append('from', params.from);
    if (params.to) query.append('to', params.to);
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());

    const queryString = query.toString();
    return api.get<AuditPaginatedResponse>(`/audit${queryString ? `?${queryString}` : ''}`);
  },

  exportCsvUrl: (params: AuditFilterParams = {}) => {
    const query = new URLSearchParams();
    if (params.case_id) query.append('case_id', params.case_id.toString());
    if (params.user_id) query.append('user_id', params.user_id.toString());
    if (params.action) query.append('action', params.action);
    if (params.outcome) query.append('outcome', params.outcome);
    if (params.from) query.append('from', params.from);
    if (params.to) query.append('to', params.to);
    const queryString = query.toString();
    return `/api/audit/export${queryString ? `?${queryString}` : ''}`;
  },
};
