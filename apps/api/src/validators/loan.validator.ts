import { z } from 'zod';

export const createLoanSchema = z.object({
  body: z.object({
    loanNumber: z.string().min(3, 'Loan number is required'),
    borrowerId: z.string().uuid('Invalid borrower ID'),
    officerId: z.string().uuid('Invalid officer ID').optional(),
    purpose: z.string().min(10, 'Purpose description must be at least 10 characters'),
    amount: z.number().positive('Amount must be greater than 0'),
    loanType: z.enum(['AGRICULTURAL', 'MACHINERY', 'VEHICLE', 'BUSINESS', 'INFRASTRUCTURE', 'LIVESTOCK', 'CONSTRUCTION', 'EDUCATION', 'PERSONAL']),
    sanctionDate: z.string().transform((val) => new Date(val)).optional(),
    dueDate: z.string().transform((val) => new Date(val)).optional(),
    bankName: z.string().optional(),
    branchName: z.string().optional(),
    notes: z.string().optional(),
  }),
});

export const updateLoanSchema = z.object({
  body: z.object({
    purpose: z.string().min(10).optional(),
    amount: z.number().positive().optional(),
    status: z.enum(['PENDING', 'ACTIVE', 'VERIFIED', 'REJECTED', 'CLOSED']).optional(),
    officerId: z.string().uuid().nullable().optional(),
    notes: z.string().optional(),
    dueDate: z.string().transform((val) => new Date(val)).optional(),
  }),
});

