import type { PublicVerificationResult } from '../types';

const API_BASE = '/api';

export const publicApi = {
  async verifyCode(code: string): Promise<PublicVerificationResult> {
    const response = await fetch(`${API_BASE}/public/verify?code=${encodeURIComponent(code.trim())}`);
    if (!response.ok) {
      return {
        verified: false,
        message: 'Network error or server unavailable',
      };
    }
    return response.json();
  },

  getQrImageUrl(code: string): string {
    return `${API_BASE}/public/verify/qr/${encodeURIComponent(code.trim())}`;
  },
};
