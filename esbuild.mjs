import { build } from 'esbuild';

build({
    entryPoints: ['src/main.ts'],
    bundle: true,
    outfile: 'build/main.js',
    minify: true,
    sourcemap: true,
    logLevel: 'info',
    platform: 'node',
    define: {
        NODE_ENV: 'production',
    },
}).catch(() => process.exit(1));
