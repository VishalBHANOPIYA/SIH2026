import { api } from './client';
import type { SearchResponse } from '../types';

export const searchApi = {
  search: (query: string, caseId?: number) => {
    const params = new URLSearchParams({ q: query });
    if (caseId) params.append('case_id', String(caseId));
    return api.get<SearchResponse>(`/search?${params.toString()}`);
  },
};
