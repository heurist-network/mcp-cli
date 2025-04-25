import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node18',
  minify: true,
  treeShaking: true,
  outfile: 'dist/index.cjs',
  define: {
    'import.meta.url': 'import_meta_url',
  },
  inject: ['./build/import-meta-url-shim.mjs'],
});
