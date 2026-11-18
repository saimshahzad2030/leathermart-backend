import { prisma } from '../lib/prisma.js';

async function main() {
  const columns = await prisma.$queryRaw`
    SELECT table_name, column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name LIKE 'navigation_%'
    ORDER BY table_name, ordinal_position;
  `;
  console.log('--- NAVIGATION TABLES IN DB ---');
  console.log(JSON.stringify(columns, null, 2));

  const tables = await prisma.$queryRaw`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name LIKE 'navigation_%';
  `;
  console.log('--- TABLES LIST ---');
  console.log(JSON.stringify(tables, null, 2));

  const existingRows = await prisma.$queryRaw`
    SELECT id, menu_key, length(payload::text) as payload_length
    FROM navigation_menus;
  `;
  console.log('--- EXISTING NAVIGATION MENUS ROWS ---');
  console.log(JSON.stringify(existingRows, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
