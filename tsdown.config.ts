/**
 * Build configuration for the two halves of the dsh-lumina bundle.
 *
 * The client half has a hard output contract that the runtime depends on. The
 * client fetches `/plugins/<package>/client.js` and evaluates it as a script;
 * the file must call `window.__ModuleLoader__.load({ id, factory })` and the
 * factory must return `module.exports`. Returning the `module` object instead
 * leaves the module unmaterialized and the plugin silently inactive — the
 * single most damaging mistake this build can make.
 *
 * The `external` list is the loader's module table. Anything listed there is
 * resolved at runtime through the `require` the factory receives; anything not
 * listed is bundled into this file. React and the client primitives are
 * platform modules: the client ships one copy of each, and a second copy
 * inside this bundle would break hooks and context.
 */

import { defineConfig } from 'tsdown'

/** The npm package name; also the client module id the loader keys on. */
const PACKAGE_ID = 'dsh-lumina'

/**
 * Module-table specifiers that stay external.
 *
 * Mirrors the client's `PLATFORM_MODULES` plus its preloaded runtime row.
 */
const CLIENT_EXTERNALS = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-runtime/client',
] as const

export default defineConfig([
  {
    // Host half: the Cordis identity the patch row points at.
    name: `${PACKAGE_ID}/host`,
    entry: { index: 'src/index.ts' },
    outDir: 'lib',
    format: ['esm'],
    platform: 'node',
    target: 'es2024',
    dts: false,
    // The package manifest points at lib/index.js, not lib/index.mjs.
    fixedExtension: false,
    clean: false,
    sourcemap: true,
    deps: {
      neverBundle: ['@deepseek-ai/cordis', '@deepseek-ai/dsh'],
    },
  },
  {
    // Browser half: the lazy-CJS factory artifact.
    name: `${PACKAGE_ID}/client`,
    entry: { client: 'src/client/index.ts' },
    outDir: 'lib',
    format: 'cjs',
    platform: 'browser',
    target: 'es2024',
    dts: false,
    // The host half writes into the same lib/ directory; a default clean
    // would wipe it.
    clean: false,
    sourcemap: true,
    deps: {
      // Everything in the loader's module table stays a runtime require;
      // everything else is bundled into this file.
      neverBundle: [...CLIENT_EXTERNALS],
    },
    outputOptions: {
      // The client fetches the artifact by this exact name.
      entryFileNames: 'client.js',
      // The factory wrapper. The banner opens the arrow function the footer
      // closes, so the `return` inside the footer is a function return, not a
      // module return.
      banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(PACKAGE_ID)}, factory: (require) => {`,
      intro: 'var module = { exports: {} }; var exports = module.exports;',
      footer: 'return module.exports; } });',
    },
  },
])
