import { z } from 'zod';

/**
 * @deprecated Legacy constant list of SRM Institute Departments.
 * Use the dynamic `/api/departments` backend API as the authoritative source of truth.
 * Retained temporarily for backward compatibility with unmigrated UI components.
 */
export const SRM_DEPARTMENTS = [
  'Computing Technologies (CSE / IT / Swe)',
  'Electronics & Communication Engineering (ECE)',
  'Electrical & Electronics Engineering (EEE)',
  'Biotechnology & Bioengineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Chemical Engineering',
  'Physics & Nanotechnology',
  'Chemistry & Materials Science',
  'Mathematics & Actuarial Science',
  'School of Management (SOM)',
  'Health Sciences & Research'
] as const;

// Helper to validate SRMIST emails (legacy compatibility)
export const isSrmEmail = (email: string): boolean => {
  return email.toLowerCase().endsWith('@srmist.edu.in');
};

/**
 * Validates whether an email belongs to an allowed domain.
 * Configurable via domain list (defaults to ['gmail.com']).
 */
export const isAllowedEmailDomain = (
  email: string,
  allowedDomains: string[] = ['gmail.com']
): boolean => {
  if (!email || !email.includes('@')) return false;
  const normalized = email.toLowerCase().trim();
  return allowedDomains.some((domain) => normalized.endsWith('@' + domain.trim().toLowerCase()));
};

// Zod Schemas shared between backend and frontend

// 1. Thread Creation Schema
export const CreateThreadSchema = z.object({
  title: z
    .string()
    .min(5, 'Title must be at least 5 characters')
    .max(100, 'Title cannot exceed 100 characters')
    .refine((val) => val.trim().length > 0, 'Title cannot be blank'),
  content: z
    .string()
    .min(10, 'Content must be at least 10 characters')
    .refine((val) => val.trim().length > 0, 'Content cannot be blank'),
  tags: z
    .array(z.string().min(1, 'Tag must not be empty'))
    .min(1, 'Please add at least one tag')
    .max(5, 'You can add up to 5 tags only'),
  type: z.enum(['TEXT', 'RESEARCH_UPDATE', 'DISCUSSION', 'QUESTION', 'ANNOUNCEMENT', 'PUBLICATION', 'ACHIEVEMENT', 'COLLABORATION_REQUEST']).optional(),
  isPaper: z.boolean().optional(),
  paperJournal: z.string().optional().nullable(),
  attachments: z.array(
    z.object({
      name: z.string(),
      url: z.string().url(),
      size: z.number(),
      type: z.enum(['PDF', 'IMAGE', 'VIDEO', 'DOCUMENT'])
    })
  ).optional()
});

// 2. Comment Creation Schema
export const CreateCommentSchema = z.object({
  content: z
    .string()
    .min(2, 'Comment must be at least 2 characters')
    .max(500, 'Comment cannot exceed 500 characters')
    .refine((val) => val.trim().length > 0, 'Comment cannot be empty'),
  threadId: z.string().cuid('Invalid thread identifier'),
  parentId: z.string().cuid('Invalid parent identifier').optional()
});

export const CreateOpportunitySchema = z.object({
  title: z
    .string()
    .min(5, 'Position title must be at least 5 characters')
    .max(150, 'Position title cannot exceed 150 characters'),
  description: z
    .string()
    .min(15, 'Opportunity description must be at least 15 characters'),
  department: z.string().optional(),
  departmentId: z.string().optional(),
  researchDomain: z
    .string()
    .min(2, 'Select or enter at least one research domain'),
  opportunityType: z.string().optional(),
  positionsCount: z.coerce.number().int().min(1, 'Positions available must be at least 1').optional().default(1),
  funding: z.string().optional().default('Fully Funded'),
  fundingDetails: z.string().optional(),
  eligibility: z.array(z.string()).optional().default([]),
  deadline: z.string().nullable().optional(),
  mode: z.string().optional().default('On Campus'),
  applicationMethod: z.string().optional().default('CuriousBees'),
  applicationUrl: z.string().optional().or(z.literal('')),
  applicationEmail: z.string().optional().or(z.literal(''))
});

// 4. User Profile Update Schema
export const UpdateProfileSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name cannot exceed 50 characters')
    .optional(),
  role: z.enum(['SUPERVISOR', 'SCHOLAR', 'INSTITUTE_ADMIN'], {
    errorMap: () => ({ message: 'Invalid role selection' })
  }).optional(),
  department: z.string().optional(),
  departmentId: z.string().optional(),
  bio: z
    .string()
    .max(250, 'Bio cannot exceed 250 characters')
    .optional(),
  interests: z
    .array(z.string().min(1, 'Interest name must be valid'))
    .max(8, 'You can select up to 8 interests')
    .optional()
});
