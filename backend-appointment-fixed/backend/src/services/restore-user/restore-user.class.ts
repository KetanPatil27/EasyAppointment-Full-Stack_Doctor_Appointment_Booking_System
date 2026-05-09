import { BadRequest, Forbidden, NotFound } from '@feathersjs/errors'
import type { Application } from '../../declarations'

const RESTORE_WINDOW_DAYS = 30

/**
 * POST /restore-user { userId }
 * Admin-only. Restores a soft-deleted user that was deleted within the last
 * 30 days. Slots are flipped back to 'active' so the doctor's calendar comes
 * back online; appointments that were cancelled stay cancelled (those patients
 * already moved on).
 *
 * This deliberately does NOT live as a method on the users service — it's a
 * separate endpoint to keep the audit-log/restore semantics distinct from
 * a normal patch.
 */
export class RestoreUserService {
  constructor(private app: Application) {}

  async create(data: any, params: any) {
    if (params?.user?.role !== 'admin') {
      throw new Forbidden('Only admins can restore users')
    }
    const userId: string = data?.userId
    if (!userId) throw new BadRequest('userId is required')

    const usersService = this.app.service('users')
    const slotsService = this.app.service('slots')
    const auditLogs = this.app.service('audit-logs')

    const target = await usersService.get(userId, { provider: undefined } as any).catch(() => null)
    if (!target) throw new NotFound('User not found')
    if (!target.isDeleted) throw new BadRequest('User is not in a deleted state')

    if (target.deletedAt) {
      const deletedAt = new Date(target.deletedAt).getTime()
      const ageDays = (Date.now() - deletedAt) / (1000 * 60 * 60 * 24)
      if (ageDays > RESTORE_WINDOW_DAYS) {
        throw new BadRequest(
          `Restore window (${RESTORE_WINDOW_DAYS} days) has passed. This account can no longer be restored.`
        )
      }
    }

    const now = new Date().toISOString()
    await usersService.patch(
      userId,
      {
        isDeleted: false,
        deletedAt: null,
        deletedReason: null,
        status: 'active',
        updatedAt: now
      } as any,
      { provider: undefined }
    )

    if (target.role === 'doctor') {
      // Reactivate slots so the doctor's calendar is available again.
      try {
        const dbPromise = this.app.get('mongodbClient')
        const db = await dbPromise
        await db.collection('slots').updateMany(
          { doctorId: userId, status: 'deleted' },
          { $set: { status: 'active' } }
        )
      } catch (err) {
        console.error('[RestoreUser] Failed to reactivate slots', { userId, error: (err as Error).message })
      }
    }

    try {
      await auditLogs.create(
        {
          action: 'restore',
          targetUserId: userId,
          targetUserRole: target.role,
          targetUserEmail: target.email,
          actorId: params.user._id.toString(),
          reason: data?.reason || '',
          timestamp: now
        },
        { provider: undefined }
      )
    } catch {
      /* audit log is best-effort */
    }

    return {
      message: 'User restored successfully',
      userId,
      restoredAt: now
    }
  }
}
