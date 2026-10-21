import 'dotenv/config';
import { AuthService } from '../services/auth.service.js';
import { prisma } from '../lib/prisma.js';
import { logger } from '../utils/logger.js';

async function runBootstrap() {
  console.log('\n============================================================');
  console.log(' Atelier Valenti Milano: Super Admin Bootstrap Flow');
  console.log('============================================================\n');

  const email = process.env.BOOTSTRAP_ADMIN_EMAIL || process.env.ADMIN_EMAIL;
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
  const firstName = process.env.BOOTSTRAP_ADMIN_FIRST_NAME || 'Alessandro';
  const lastName = process.env.BOOTSTRAP_ADMIN_LAST_NAME || 'Valenti';

  if (!email || !password) {
    console.error('[ERROR] Missing bootstrap credentials in environment variables.');
    console.error('\nPlease supply credentials using environment variables:');
    console.error('  PowerShell:');
    console.error('    $env:BOOTSTRAP_ADMIN_EMAIL="admin@ateliervalenti.com"');
    console.error('    $env:BOOTSTRAP_ADMIN_PASSWORD="YourSecurePassword2026!"');
    console.error('    npm run bootstrap:admin\n');
    console.error('  Bash / Linux:');
    console.error('    BOOTSTRAP_ADMIN_EMAIL="admin@ateliervalenti.com" \\');
    console.error('    BOOTSTRAP_ADMIN_PASSWORD="YourSecurePassword2026!" \\');
    console.error('    npm run bootstrap:admin\n');
    process.exit(1);
  }

  logger.info(`Initiating atomic bootstrap for email: ${email.toLowerCase().trim()}`);

  try {
    const user = await AuthService.bootstrapSuperAdmin({
      email,
      password,
      firstName,
      lastName,
    });

    console.log('\n------------------------------------------------------------');
    console.log(' [SUCCESS] First Super Admin Created Successfully');
    console.log('------------------------------------------------------------');
    console.log(`  ID:          ${user.id}`);
    console.log(`  Email:       ${user.email}`);
    console.log(`  Name:        ${user.firstName} ${user.lastName}`);
    console.log(`  Role:        ${user.role}`);
    console.log(`  Permissions: ${JSON.stringify(user.permissions)}`);
    console.log(`  Created At:  ${user.createdAt.toISOString()}`);
    console.log('------------------------------------------------------------\n');
    console.log('[SECURITY ACTION REQUIRED]');
    console.log('Remember to remove the temporary bootstrap password from your environment:');
    console.log('  PowerShell: Remove-Item env:BOOTSTRAP_ADMIN_PASSWORD');
    console.log('  Bash:       unset BOOTSTRAP_ADMIN_PASSWORD\n');
  } catch (err) {
    console.error(`\n[BOOTSTRAP ABORTED] ${err.message}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runBootstrap();
