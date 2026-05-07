import DOMPurify from 'isomorphic-dompurify'
import type { HookContext } from '@feathersjs/feathers'

/**
 * XSS protection — strips ALL HTML tags from string inputs before they reach
 * the database, so any later render (web page, email, mobile app) is safe by
 * default.
 *
 * `ALLOWED_TAGS: []` and `ALLOWED_ATTR: []` mean we keep the visible text but
 * remove every tag and attribute. So:
 *   "Dr. <script>steal()</script> Smith"  →  "Dr.  Smith"
 *   "Hello <b>world</b>"                   →  "Hello world"
 *   "<img onerror=alert(1) src=x>"         →  ""
 *
 * Service paths in SKIP_PATHS bypass sanitization entirely. Currently only
 * `authentication` is skipped — its body contains `password`, which may
 * legitimately contain characters DOMPurify would mangle (e.g. `<3pa$$word`).
 *
 * Field names in SKIP_FIELDS bypass sanitization at any depth. This protects:
 *   - credentials (passwords) being mutated into different strings
 *   - large binary blobs (base64 images) from wasting CPU
 */
const SKIP_PATHS = new Set<string>(['authentication'])

const SKIP_FIELDS = new Set<string>([
  'password',
  'currentPassword',
  'newPassword',
  'oldPassword',
  'imageData',
  'avatar',
  'profilePicture'
])

const sanitizeValue = (value: any): any => {
  if (value === null || value === undefined) return value
  if (typeof value === 'string') {
    return DOMPurify.sanitize(value, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
  }
  if (Array.isArray(value)) return value.map(sanitizeValue)
  if (typeof value === 'object') {
    const out: Record<string, any> = {}
    for (const key of Object.keys(value)) {
      out[key] = SKIP_FIELDS.has(key) ? value[key] : sanitizeValue(value[key])
    }
    return out
  }
  return value
}

export const sanitizeStrings = async (context: HookContext) => {
  if (SKIP_PATHS.has(context.path)) return context
  if (context.data) {
    context.data = sanitizeValue(context.data)
  }
  return context
}
