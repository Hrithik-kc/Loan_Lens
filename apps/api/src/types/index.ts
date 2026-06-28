import { Request } from 'express';
import { User, Loan, Upload, Verification, AiResult, Location, Report, Notification, AuditLog } from '@prisma/client';

export const Role = {
  BENEFICIARY: 'BENEFICIARY',
  LOAN_OFFICER: 'LOAN_OFFICER',
  ADMIN: 'ADMIN',
} as const;
export type Role = keyof typeof Role;

export const LoanStatus = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
  CLOSED: 'CLOSED',
} as const;
export type LoanStatus = keyof typeof LoanStatus;

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
export type LoanType = keyof typeof LoanType;

export const VerificationStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  AI_COMPLETE: 'AI_COMPLETE',
  UNDER_REVIEW: 'UNDER_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  MORE_EVIDENCE_REQUIRED: 'MORE_EVIDENCE_REQUIRED',
} as const;
export type VerificationStatus = keyof typeof VerificationStatus;

export const RiskLevel = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;
export type RiskLevel = keyof typeof RiskLevel;

export const UploadType = {
  IMAGE: 'IMAGE',
  VIDEO: 'VIDEO',
} as const;
export type UploadType = keyof typeof UploadType;

export const NotificationType = {
  UPLOAD_RECEIVED: 'UPLOAD_RECEIVED',
  AI_COMPLETE: 'AI_COMPLETE',
  VERIFICATION_APPROVED: 'VERIFICATION_APPROVED',
  VERIFICATION_REJECTED: 'VERIFICATION_REJECTED',
  MORE_EVIDENCE_REQUIRED: 'MORE_EVIDENCE_REQUIRED',
  SYSTEM: 'SYSTEM',
  ALERT: 'ALERT',
} as const;
export type NotificationType = keyof typeof NotificationType;

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
export type AuditAction = keyof typeof AuditAction;

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: any[];
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Re-export Prisma types for convenience across controllers/services
export {
  User,
  Loan,
  Upload,
  Verification,
  AiResult,
  Location,
  Report,
  Notification,
  AuditLog
};
