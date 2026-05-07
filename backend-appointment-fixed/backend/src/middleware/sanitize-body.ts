import type { Request, Response, NextFunction } from 'express'

/**
 * NoSQL operator-injection protection.
 *
 * Recursively walks `req.body` and `req.params` and removes any object key
 * that starts with `$` or contains `.` — these are MongoDB operators a
 * malicious client could inject to subvert query intent. For example:
 *
 *   POST /authentication { "email": { "$ne": null }, "password": "" }
 *
 * Without sanitization, that body would be passed into a Mongo query as
 * `{ email: { $ne: null } }` — which matches the first user in the database
 * and bypasses the password check.
 *
 * IMPORTANT: we deliberately do NOT touch `req.query`. Feathers uses keys
 * like `$limit`, `$skip`, `$sort`, `$or` as legitimate query operators in
 * URLs (e.g. `?$limit=10`) — stripping them would break pagination, sorting,
 * and filtering across the entire API.
 *
 * Mitigation specifically for query strings: every Feathers service should
 * already restrict which `$`-operators are allowed via the service's
 * `filters`/`operators` options or via auth/role hooks that overwrite
 * client-supplied query filters.
 */
const stripOperators = (value: any): any => {
  if (value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map(stripOperators)

  const cleaned: Record<string, any> = {}
  for (const key of Object.keys(value)) {
    if (key.startsWith('$') || key.includes('.')) {
      // Drop the dangerous key entirely. The rest of the object remains usable.
      continue
    }
    cleaned[key] = stripOperators(value[key])
  }
  return cleaned
}

export const sanitizeBody = (req: Request, _res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === 'object') {
    req.body = stripOperators(req.body)
  }
  if (req.params && typeof req.params === 'object') {
    req.params = stripOperators(req.params)
  }
  next()
}
