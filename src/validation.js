const { GraphQLError } = require('graphql');
const { z } = require('zod');

const roleEnum = z.enum(['VIEWER', 'ANALYST', 'ADMIN']);
const statusEnum = z.enum(['ACTIVE', 'INACTIVE']);
const recordTypeEnum = z.enum(['INCOME', 'EXPENSE']);

const createUserSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  password: z.string().min(8).max(100),
  role: roleEnum,
  status: statusEnum.optional(),
});

const updateUserSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    email: z.string().trim().email().optional(),
    password: z.string().min(8).max(100).optional(),
    role: roleEnum.optional(),
    status: statusEnum.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided for update.',
  });

const createRecordSchema = z.object({
  amount: z.number().positive(),
  type: recordTypeEnum,
  category: z.string().trim().min(2).max(100),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().trim().max(500).optional().nullable(),
});

const updateRecordSchema = z
  .object({
    amount: z.number().positive().optional(),
    type: recordTypeEnum.optional(),
    category: z.string().trim().min(2).max(100).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    notes: z.string().trim().max(500).optional().nullable(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided for update.',
  });

const recordFilterSchema = z.object({
  type: recordTypeEnum.optional(),
  category: z.string().trim().min(1).max(100).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).max(10000).optional(),
});

function validate(schema, input) {
  const result = schema.safeParse(input || {});

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.') || 'input'}: ${issue.message}`)
      .join('; ');

    throw new GraphQLError(`Validation failed: ${details}`, {
      extensions: {
        code: 'BAD_USER_INPUT',
      },
    });
  }

  return result.data;
}

module.exports = {
  createUserSchema,
  updateUserSchema,
  createRecordSchema,
  updateRecordSchema,
  recordFilterSchema,
  validate,
};
