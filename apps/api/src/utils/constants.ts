// ─── Application Constants ──────────────────────────────────────────────────

export const MAX_UPLOAD_SIZE_MB = Number(process.env.UPLOAD_MAX_SIZE_MB) || 50;
export const MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024;

export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/webm',
  'video/3gpp',
];

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
];

export const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/webm',
  'video/3gpp',
];

export const RISK_THRESHOLDS = {
  LOW: { min: 0, max: 30 },
  MEDIUM: { min: 31, max: 60 },
  HIGH: { min: 61, max: 80 },
  CRITICAL: { min: 81, max: 100 },
} as const;

export const JWT_COOKIE_NAME = 'refreshToken';

export const OTP_EXPIRY_MINUTES = 10;
export const OTP_LENGTH = 6;

export const BCRYPT_ROUNDS = 12;

export const PAGINATION_DEFAULTS = {
  page: 1,
  limit: 10,
  maxLimit: 100,
};

export const LOAN_NUMBER_PREFIX = 'LL';

export const AI_PROCESSING_DELAY_MS = {
  min: 2000,
  max: 3500,
};

export const FIREBASE_UPLOAD_PATHS = {
  uploads: 'uploads',
  thumbnails: 'thumbnails',
  reports: 'reports',
  profiles: 'profiles',
};

export const DETECTED_OBJECT_LABELS = [
  'Tractor',
  'Motorcycle',
  'Commercial Vehicle',
  'Generator',
  'Machinery',
  'Shop Inventory',
  'Furniture',
  'Electronics',
  'Livestock',
  'Agricultural Equipment',
  'Building Materials',
  'Business Assets',
];

export const FRAUD_FLAG_TYPES = [
  'DUPLICATE_IMAGE',
  'EDITED_IMAGE',
  'METADATA_TAMPERED',
  'LOW_QUALITY',
  'STOCK_IMAGE',
] as const;

export const NOTIFICATION_MESSAGES = {
  UPLOAD_RECEIVED: {
    title: 'Upload Received',
    message: 'Your document upload has been received and is being processed.',
  },
  AI_COMPLETE: {
    title: 'AI Analysis Complete',
    message: 'AI analysis of your uploaded document is complete.',
  },
  VERIFICATION_APPROVED: {
    title: 'Verification Approved',
    message: 'Your loan verification has been approved.',
  },
  VERIFICATION_REJECTED: {
    title: 'Verification Rejected',
    message: 'Your loan verification has been rejected.',
  },
  MORE_EVIDENCE_REQUIRED: {
    title: 'More Evidence Required',
    message: 'Additional evidence is required for your loan verification.',
  },
};

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export const RATE_LIMIT = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  auth: {
    windowMs: 15 * 60 * 1000,
    max: 20,
  },
};
