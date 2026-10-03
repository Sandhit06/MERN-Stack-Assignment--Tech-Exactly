const { z } = require('zod');
const email = z.email().trim().toLowerCase().max(254);
const password = z
  .string()
  .min(10, 'Use at least 10 characters.')
  .max(72)
  .refine((v) => Buffer.byteLength(v, 'utf8') <= 72, 'Password must be at most 72 UTF-8 bytes.');
exports.register = z.object({ name: z.string().trim().min(2).max(60), email, password }).strict();
exports.login = z.object({ email, password: z.string().min(1).max(200) }).strict();
exports.post = z
  .object({
    title: z.string().trim().min(3).max(160),
    content: z.string().trim().min(20).max(50000),
  })
  .strict();
exports.comment = z.object({ content: z.string().trim().min(1).max(2000) }).strict();
exports.userUpdate = z
  .object({
    role: z.enum(['user', 'admin']).optional(),
    status: z.enum(['active', 'disabled']).optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, 'Provide role or status.');
exports.page = z
  .object({
    page: z.coerce.number().int().min(1).max(10000).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(9),
    mine: z.enum(['true', 'false']).optional(),
    deleted: z.enum(['true', 'false']).optional(),
  })
  .strict();
exports.validate = (schema) => (req, _res, next) => {
  req.input = schema.parse(req.body);
  next();
};
exports.pagination = (req, _res, next) => {
  req.paging = exports.page.parse(req.query);
  next();
};
exports.idParam = (req, _res, next) => {
  for (const key of ['id', 'postId'])
    if (req.params[key])
      z.string()
        .regex(/^[a-f\d]{24}$/i, 'Invalid resource ID.')
        .parse(req.params[key]);
  next();
};
