import { seedDatabaseFull } from '@/lib/db/seed-database'

seedDatabaseFull()
  .then(() => {
    console.log('Demo data loaded (tables must already exist).')
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })