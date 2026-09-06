export interface User {
  id: number;
  full_name: string;
  email: string;
  department: string | null;
  role: 'officer' | 'investigator' | 'forensic' | 'legal' | 'admin';
  is_active: boolean;
}

export interface LoginResponse {
  mfa_required: boolean;
  mfa_setup_required: boolean;
  challenge_token: string;
  message: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface MFASetupResponse {
  secret: string;
  qr_code_base64: string;
  message: string;
}

export type NavItem = {
  label: string;
  path: string;
  icon: string;
  roles?: string[];  // if set, only these roles see it
};

export type CaseStatus = 'open' | 'under_investigation' | 'closed' | 'archived';
export type CaseClassification = 'confidential' | 'restricted' | 'internal';

export interface CaseAssignment {
  id: number;
  case_id: number;
  user_id: number;
  user: User;
  assigned_role: string;
  assigned_at: string;
}

export interface Case {
  id: number;
  case_number: string;
  title: string;
  case_type: string;
  status: CaseStatus;
  classification: CaseClassification;
  created_by: number;
  creator: User;
  created_at: string;
  assignments: CaseAssignment[];
  document_count: number;
}

export interface CreateCaseInput {
  case_number?: string;
  title: string;
  case_type: string;
  classification: CaseClassification;
  status?: CaseStatus;
}

