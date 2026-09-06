import { api } from './client';
import type { User } from '../types';

export interface LedgerTransactionItem {
  id: number;
  document_version_id: number;
  data_hash: string;
  prev_hash: string | null;
  chain_hash: string;
  event_type: string;
  actor_id: number;
  actor: User;
  timestamp: string;
}

export interface VerifyChainResult {
  intact: boolean;
  total_blocks: number;
  genesis_hash?: string;
  latest_hash?: string;
  broken_index?: number;
  block_id?: number;
  event_type?: string;
  expected_chain_hash?: string;
  actual_chain_hash?: string;
  reason?: string;
  message?: string;
}

export interface SignatureItem {
  id: number;
  document_version_id: number;
  signer_id: number;
  signer: User;
  signature_value: string;
  certificate_ref: string | null;
  signed_at: string;
  signature_valid?: boolean;
}

export interface VerifyVersionResult {
  verified: boolean;
  hash_match: boolean;
  signatures_valid: boolean;
  version_id: number;
  stored_hash: string;
  computed_hash: string;
  signatures_count: number;
  signatures: SignatureItem[];
}

export const ledgerApi = {
  getLedgerChain: () => {
    return api.get<LedgerTransactionItem[]>('/ledger');
  },

  verifyChain: () => {
    return api.get<VerifyChainResult>('/ledger/verify-chain');
  },

  signVersion: (versionId: number | string) => {
    return api.post<SignatureItem>(`/documents/versions/${versionId}/sign`);
  },

  verifyVersion: (versionId: number | string) => {
    return api.post<VerifyVersionResult>(`/documents/versions/${versionId}/verify`);
  },
};
