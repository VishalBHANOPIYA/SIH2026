import { api } from './client';
import type { DocumentItem } from '../types';

export const documentsApi = {
  getCaseDocuments: (caseId: number | string) => {
    return api.get<DocumentItem[]>(`/cases/${caseId}/documents`);
  },

  uploadDocument: (caseId: number | string, formData: FormData) => {
    const token = localStorage.getItem('access_token');
    return fetch(`/api/cases/${caseId}/documents`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    }).then(async (res) => {
      if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: 'Upload failed' }));
        throw new Error(error.detail || 'Upload failed');
      }
      return res.json() as Promise<DocumentItem>;
    });
  },

  uploadDocumentVersion: (documentId: number | string, formData: FormData) => {
    const token = localStorage.getItem('access_token');
    return fetch(`/api/documents/${documentId}/versions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    }).then(async (res) => {
      if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: 'Upload version failed' }));
        throw new Error(error.detail || 'Upload version failed');
      }
      return res.json() as Promise<DocumentItem>;
    });
  },

  downloadVersion: async (documentId: number | string, versionId: number | string, filename: string) => {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`/api/documents/${documentId}/versions/${versionId}/download`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Download failed' }));
      throw new Error(err.detail || 'Download failed');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
};
