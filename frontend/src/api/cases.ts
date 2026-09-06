import { api } from './client';
import type { Case, CreateCaseInput, User } from '../types';

export interface GetCasesParams {
  status?: string;
  classification?: string;
  assigned_to_me?: boolean;
  search?: string;
}

export const casesApi = {
  getCases: (params?: GetCasesParams) => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.classification) query.append('classification', params.classification);
    if (params?.assigned_to_me) query.append('assigned_to_me', 'true');
    if (params?.search) query.append('search', params.search);

    const queryString = query.toString();
    return api.get<Case[]>(`/cases${queryString ? `?${queryString}` : ''}`);
  },

  getCaseById: (id: number | string) => {
    return api.get<Case>(`/cases/${id}`);
  },

  createCase: (data: CreateCaseInput) => {
    return api.post<Case>('/cases', data);
  },

  updateCaseStatus: (id: number | string, status: string) => {
    return api.patch<Case>(`/cases/${id}/status`, { status });
  },

  getAssignableUsers: () => {
    return api.get<User[]>('/cases/users/assignable');
  },

  assignUser: (caseId: number | string, userId: number, assignedRole: string) => {
    return api.post<Case>(`/cases/${caseId}/assignments`, {
      user_id: userId,
      assigned_role: assignedRole,
    });
  },

  removeUser: (caseId: number | string, userId: number) => {
    return api.delete<Case>(`/cases/${caseId}/assignments/${userId}`);
  },
};
