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
