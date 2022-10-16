import { build } from 'esbuild';
import * as child_process from 'child_process';

const release = child_process
  .execSync('git describe --long --first-parent')
  .toString();
console.log('Using release')

build({
    entryPoints: ['src/main.ts'],
    bundle: true,
    outfile: 'build/main.js',
    minify: true,
    sourcemap: true,
    logLevel: 'info',
    platform: 'node',
    define: {
        'process.env.RELEASE': process.env.RELEASE || `"${release}"`,
        'process.env.NODE_ENV': process.env.NODE_ENV || '"production"',
        'process.env.SENTRY_URL': process.env.SENTRY_URL || '"https://87bc38b09f2a40c5a29892f0f5794a9f@o201424.ingest.sentry.io/4503993502728192"',
    },
}).catch(() => process.exit(1));
