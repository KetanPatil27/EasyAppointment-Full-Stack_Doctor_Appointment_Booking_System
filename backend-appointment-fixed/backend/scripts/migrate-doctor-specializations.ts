/**
 * One-time migration: convert single-string `specialization` field on doctor
 * documents into the canonical array form `specializations: [oldValue]`.
 *
 * Run with:
 *     npm run migrate:specializations
 *
 * Properties:
 *   - Idempotent: skips documents that already have a non-empty `specializations`
 *     array. Safe to run repeatedly.
 *   - Non-destructive in dry-run mode: pass `--dry-run` to print what would
 *     change without writing anything.
 *   - Removes the legacy `specialization` field on each migrated doc, so a
 *     subsequent run finds nothing to do.
 *   - Exits with code 0 on success, 1 on any error.
 */
import 'dotenv/config'
import { MongoClient, ObjectId } from 'mongodb'

const DRY_RUN = process.argv.includes('--dry-run')

async function main() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.error('MONGODB_URI not set in environment')
    process.exit(1)
  }

  const dbName = new URL(uri).pathname.substring(1) || 'easyappointment'

  console.log(`Connecting to ${dbName}…`)
  const client = new MongoClient(uri)
  await client.connect()
  const db = client.db(dbName)
  const doctors = db.collection('doctors')

  // Find every doc that still has a legacy `specialization` string AND either
  // no `specializations` array OR an empty one. That set is what needs migration.
  const cursor = doctors.find({
    specialization: { $exists: true, $type: 'string', $ne: '' },
    $or: [
      { specializations: { $exists: false } },
      { specializations: { $size: 0 } }
    ]
  })

  let scanned = 0
  let migrated = 0
  let skipped = 0
  const failures: { _id: string; error: string }[] = []

  for await (const doc of cursor) {
    scanned++
    const oldValue = (doc as any).specialization as string

    if (!oldValue?.trim()) {
      skipped++
      continue
    }

    const newArray = [oldValue.trim()]
    const _id = doc._id as ObjectId

    if (DRY_RUN) {
      console.log(`[dry-run] doctor ${_id}: "${oldValue}" → ${JSON.stringify(newArray)}`)
      migrated++
      continue
    }

    try {
      await doctors.updateOne(
        { _id },
        {
          $set: { specializations: newArray },
          $unset: { specialization: '' }
        }
      )
      migrated++
    } catch (err) {
      failures.push({ _id: _id.toString(), error: (err as Error).message })
    }
  }

  // Also report any docs that already have BOTH fields — those were probably
  // partially migrated. Report-only; not modified by this run.
  const bothFieldsCount = await doctors.countDocuments({
    specialization: { $exists: true },
    specializations: { $exists: true, $not: { $size: 0 } }
  })

  console.log('')
  console.log('───────────────────────────')
  console.log(`Mode:           ${DRY_RUN ? 'DRY RUN (no writes)' : 'WRITE'}`)
  console.log(`Scanned:        ${scanned}`)
  console.log(`Migrated:       ${migrated}`)
  console.log(`Skipped:        ${skipped}`)
  console.log(`Already partial:${bothFieldsCount} (have BOTH fields — ` +
              'verify and clean up manually if needed)')
  console.log(`Failures:       ${failures.length}`)
  if (failures.length > 0) {
    failures.forEach((f) => console.log(`   - ${f._id}: ${f.error}`))
  }
  console.log('───────────────────────────')

  await client.close()
  process.exit(failures.length > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
