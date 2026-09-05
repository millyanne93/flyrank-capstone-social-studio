import { seedConstraintProfiles } from '../src/repositories/constraintProfiles.repository';
import { closePool } from '../src/db/client';

async function seed() {
  console.log('Seeding constraint profiles...');
  await seedConstraintProfiles();
  console.log('Constraint profiles seeded.');
  await closePool();
}

seed().catch(console.error);
