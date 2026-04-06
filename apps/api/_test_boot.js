// Quick boot test
process.on('uncaughtException', (e) => { console.error('UNCAUGHT:', e); });
process.on('unhandledRejection', (e) => { console.error('UNHANDLED:', e); });

console.log('>>> Step 1: loading dotenv');
require('dotenv').config({ path: '.env' });

console.log('>>> Step 2: loading tsconfig-paths');
const tsConfigPaths = require('tsconfig-paths');
const tsConfig = require('./tsconfig.json');
tsConfigPaths.register({
  baseUrl: '.',
  paths: tsConfig.compilerOptions.paths,
});

console.log('>>> Step 3: loading ts-node');
require('ts-node').register({ transpileOnly: true, project: './tsconfig.json' });

console.log('>>> Step 4: loading index.ts');
require('./src/index.ts');

console.log('>>> Step 5: index loaded (bootstrap is async)');
