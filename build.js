#!/usr/bin/env bun
import { build } from 'bun';

async function main() {
  const result = await build({
    entrypoints: ['./src/index.ts'],
    outdir: './dist',
    target: 'node',
    minify: true,
    splitting: false,
  });

  console.log(
    'Build completed:',
    result.outputs.map((o) => o.path),
  );
}

main().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
