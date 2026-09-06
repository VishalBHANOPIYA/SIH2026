import { api } from './client';
import type { ShareItem, SharedDocumentItem, SharePermission } from '../types';

export interface CreateShareInput {
  document_id?: number;
  recipient_id?: number;
  recipient_department?: string;
  permission_level: SharePermission;
  expires_at?: string;
}

export const sharesApi = {
  createShare: (caseId: number, data: CreateShareInput) => {
    return api.post<ShareItem>(`/cases/${caseId}/share`, data);
  },

  getMySharedDocuments: () => {
    return api.get<SharedDocumentItem[]>('/shares/my-shares');
  },

  getDocumentShares: (documentId: number) => {
    return api.get<ShareItem[]>(`/shares/document/${documentId}`);
  },

  revokeShare: (shareId: number) => {
    return api.delete<{ message: string; id: number }>(`/shares/${shareId}`);
  },
};
