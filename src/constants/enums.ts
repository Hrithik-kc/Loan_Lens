// src/constants/enums.ts
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
  AGRICULTURAL: 'AGRICULTURAL',
  MACHINERY: 'MACHINERY',
  VEHICLE: 'VEHICLE',
  BUSINESS: 'BUSINESS',
  INFRASTRUCTURE: 'INFRASTRUCTURE',
  LIVESTOCK: 'LIVESTOCK',
  CONSTRUCTION: 'CONSTRUCTION',
  EDUCATION: 'EDUCATION',
  PERSONAL: 'PERSONAL',
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

export const RiskLevel = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;
export type RiskLevel = typeof RiskLevel[keyof typeof RiskLevel];

export const UploadType = {
  IMAGE: 'IMAGE',
  VIDEO: 'VIDEO',
} as const;
export type UploadType = typeof UploadType[keyof typeof UploadType];

export const NotificationType = {
  UPLOAD_RECEIVED: 'UPLOAD_RECEIVED',
  AI_COMPLETE: 'AI_COMPLETE',
  VERIFICATION_APPROVED: 'VERIFICATION_APPROVED',
  VERIFICATION_REJECTED: 'VERIFICATION_REJECTED',
  MORE_EVIDENCE_REQUIRED: 'MORE_EVIDENCE_REQUIRED',
  SYSTEM: 'SYSTEM',
  ALERT: 'ALERT',
} as const;
export type NotificationType = typeof NotificationType[keyof typeof NotificationType];

export const AuditAction = {
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  REGISTER: 'REGISTER',
  UPLOAD: 'UPLOAD',
  APPROVAL: 'APPROVAL',
  REJECTION: 'REJECTION',
  DOWNLOAD: 'DOWNLOAD',
  AI_PROCESSING: 'AI_PROCESSING',
  LOCATION_ACCESS: 'LOCATION_ACCESS',
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DELETED: 'USER_DELETED',
  LOAN_CREATED: 'LOAN_CREATED',
  LOAN_UPDATED: 'LOAN_UPDATED',
  REPORT_GENERATED: 'REPORT_GENERATED',
  SETTINGS_CHANGED: 'SETTINGS_CHANGED',
} as const;
export type AuditAction = typeof AuditAction[keyof typeof AuditAction];
