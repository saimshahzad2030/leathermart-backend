import { execSync } from 'child_process';
import path from 'path';

console.log('Checking leathermart-admin TypeScript...');
try {
  const out1 = execSync('npx tsc --noEmit', { cwd: path.resolve('../leathermart-admin') }).toString();
  console.log('Admin TSC PASSED:', out1 || 'Clean');
} catch (err) {
  console.error('Admin TSC Failed:\n', err.stdout?.toString() || err.message);
}

console.log('Checking leathermart storefront TypeScript...');
try {
  const out2 = execSync('npx tsc --noEmit', { cwd: path.resolve('../leathermart') }).toString();
  console.log('Storefront TSC PASSED:', out2 || 'Clean');
} catch (err) {
  console.error('Storefront TSC Failed:\n', err.stdout?.toString() || err.message);
}
