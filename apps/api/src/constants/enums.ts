export const Role = {
  BENEFICIARY: 'BENEFICIARY',
  LOAN_OFFICER: 'LOAN_OFFICER',
  ADMIN: 'ADMIN',
} as const;
export type Role = typeof Role[keyof typeof Role];

export const LoanStatus = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
  CLOSED: 'CLOSED',
} as const;
export type LoanStatus = typeof LoanStatus[keyof typeof LoanStatus];

export const LoanType = {
  PERSONAL: 'PERSONAL',
  BUSINESS: 'BUSINESS',
  MORTGAGE: 'MORTGAGE',
} as const;
export type LoanType = typeof LoanType[keyof typeof LoanType];

export const VerificationStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  AI_COMPLETE: 'AI_COMPLETE',
  UNDER_REVIEW: 'UNDER_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  MORE_EVIDENCE_REQUIRED: 'MORE_EVIDENCE_REQUIRED',
} as const;
export type VerificationStatus = typeof VerificationStatus[keyof typeof VerificationStatus];

export const AuditAction = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  READ: 'READ',
} as const;
export type AuditAction = typeof AuditAction[keyof typeof AuditAction];

export const RiskLevel = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;
export type RiskLevel = typeof RiskLevel[keyof typeof RiskLevel];
