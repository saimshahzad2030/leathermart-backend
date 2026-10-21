import fs from 'fs';
import path from 'path';

const file = path.resolve('../leathermart/src/components/providers/StoreProvider.tsx');
let c = fs.readFileSync(file, 'utf8');
c = c.replace(/"use client";/g, '');
c = '"use client";\n\n' + c.trim() + '\n';
fs.writeFileSync(file, c, 'utf8');
console.log('Fixed StoreProvider.tsx');
