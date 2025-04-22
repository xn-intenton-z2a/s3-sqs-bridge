# VITEST_DOC

## Crawl Summary
Vitest is a Vite-native testing framework supporting ESM, TypeScript, and JSX. Key installation commands (npm install -D vitest, yarn add -D vitest, etc.) are provided along with requirements (Vite >=5.0.0 and Node >=18.0.0). Detailed instructions cover writing tests with examples, configuring via vitest.config.ts or merging with vite.config, and CLI usage including options --config, --globals, and watch mode. Workspaces, dependency optimization, and comprehensive test configuration options (include, exclude, environment, pool, server.deps, deps.optimizer) are fully specified with defaults and detailed parameter types.

## Normalised Extract
Table of Contents:
  1. Installation and Setup
    - Install commands: npm install -D vitest, yarn add -D vitest, pnpm add -D vitest, bun add -D vitest
    - Requirements: Vite >=5.0.0, Node >=18.0.0
  2. Writing Tests
    - Example function (sum) and test file using import { expect, test } from 'vitest'
    - Package.json test script: { "scripts": { "test": "vitest" } }
  3. Configuration
    - Using vitest.config.ts with defineConfig from 'vitest/config' or merging with vite.config
    - Reference directive: /// <reference types="vitest/config" />
    - Example merging: import { defineConfig, mergeConfig } from 'vitest/config'; mergeConfig(viteConfig, defineConfig({ test: { ... } }))
  4. Command Line Interface
    - Commands: npx vitest, vitest run, CLI options such as --config, --globals, --watch
    - Default scripts: { "test": "vitest", "coverage": "vitest run --coverage" }
  5. Workspaces
    - Define workspace file (vitest.workspace.ts) using defineWorkspace with config arrays and inline configuration for multiple environments
  6. Detailed Options
    - Test file patterns (include, exclude), globals flag, environment setting (node, jsdom, happy-dom), pool selection (threads, forks, vmThreads, vmForks)
    - Server options: server.deps.external (default: [/\/node_modules\//]), inline modules, fallbackCJS
    - Dependency optimization options: deps.optimizer with ssr and web modes, transformAssets, transformCss, interopDefault
Detailed Information:
Installation: Use provided commands. Writing Tests: Function sum and corresponding test file must be created. Configuration: Use defineConfig in vitest.config.ts with potential merge using mergeConfig. CLI: Use options such as --config to specify alternate config paths and --globals to activate global APIs.
Dependency Handling: Externalize node_modules by default; inline modules via server.deps.inline; optimize dependencies using deps.optimizer settings. Advanced troubleshooting: Use VITEST_SKIP_INSTALL_CHECKS to disable dependency install prompts, check CLI output for configuration mismatches.

## Supplementary Details
Installation Commands:
  npm install -D vitest
  yarn add -D vitest
  pnpm add -D vitest
  bun add -D vitest
Requirements:
  Vite >= 5.0.0
  Node >= 18.0.0

Test Example (sum.js):
  export function sum(a, b) {
    return a + b
  }

Test Example (sum.test.js):
  import { expect, test } from 'vitest'
  import { sum } from './sum.js'

  test('adds 1 + 2 to equal 3', () => {
    expect(sum(1, 2)).toBe(3)
  })

Configuration Example (vitest.config.ts):
  /// <reference types="vitest/config" />
  import { defineConfig } from 'vite'

  export default defineConfig({
    test: {
      include: ['**/*.{test,spec}.?(c|m)[jt]s?(x)'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/cypress/**', '**/.{idea,git,cache,output,temp}/**', '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*'],
      globals: false,
      environment: 'node',
      pool: 'forks'
    }
  })

Merging Config Example:
  import { defineConfig, mergeConfig } from 'vitest/config'
  import viteConfig from './vite.config.mjs'

  export default mergeConfig(viteConfig, defineConfig({
    test: {
      exclude: ['packages/template/*']
    }
  }))

CLI Usage:
  npx vitest           (Runs local tests if binary found)
  vitest run           (Runs tests once without watch)
  vitest --config ./path/to/vitest.config.ts
  vitest --globals     (Enables global API exposure)

Workspaces Example (vitest.workspace.ts):
  import { defineWorkspace } from 'vitest/config'

  export default defineWorkspace([
    'packages/*',
    'tests/*/vitest.config.{e2e,unit}.ts',
    { test: { name: 'happy-dom', root: './shared_tests', environment: 'happy-dom', setupFiles: ['./setup.happy-dom.ts'] } },
    { test: { name: 'node', root: './shared_tests', environment: 'node', setupFiles: ['./setup.node.ts'] } }
  ])

Dependency Configuration:
  server.deps.external: [ /\/node_modules\// ]
  server.deps.inline: [] or true to inline all modules
  server.deps.fallbackCJS: false

Dependency Optimization (deps.optimizer):
  For web: { transformAssets: true, transformCss: true }
  For ssr: options applied accordingly

Troubleshooting:
  - If tests do not find the vitest binary, use npx vitest
  - Check configuration file paths when using --config
  - Use VITEST_SKIP_INSTALL_CHECKS=1 to disable automatic dependency prompts
  - Validate environment settings and alias resolution if modules fail to load.


## Reference Details
API Specifications and SDK Method Signatures:

1. Installation API:
   - npm install -D vitest
   - yarn add -D vitest
   - pnpm add -D vitest
   - bun add -D vitest

2. Test Function Signature:
   test(name: string, fn: () => any): void
   expect(received).toBe(expected): void

3. Configuration Function:
   defineConfig({ test: { include?: string[], exclude?: string[], globals?: boolean, environment?: 'node'|'jsdom'|'happy-dom'|string, pool?: 'threads'|'forks'|'vmThreads'|'vmForks' } }): Config

   Example:
   import { defineConfig } from 'vitest/config'
   export default defineConfig({
     test: {
       include: ['**/*.{test,spec}.?(c|m)[jt]s?(x)'],
       exclude: ['**/node_modules/**', '**/dist/**', '**/cypress/**', '**/.{idea,git,cache,output,temp}/**', '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*'],
       globals: false,
       environment: 'node',
       pool: 'forks'
     }
   })

4. Merging Configurations:
   mergeConfig(viteConfig: object, vitestConfig: object): object
   Example usage with mergeConfig from 'vitest/config'

5. CLI Options:
   --config <path> : Specify configuration file
   --globals : Enable global API injection
   --port <number> : Specify port number
   --https : Enable HTTPS
   --watch : Enable watch mode
   --update or -u : Update snapshot files

6. Dependency Options (server.deps):
   external: Array<string|RegExp> = [/\/node_modules\//]
   inline: Array<string|RegExp> | true = []
   fallbackCJS: boolean = false
   cacheDir: string = 'node_modules/.vite'

7. Dependency Optimization (deps.optimizer):
   Example: deps.optimizer: { ssr?: object, web?: { transformAssets?: boolean, transformCss?: boolean } }

8. Workspaces Definition:
   defineWorkspace(configs: Array<string | { test: object }>): WorkspaceConfig
   Example as provided in vitest.workspace.ts

9. Benchmark Options:
   benchmark: {
     include: string[] = ['**/*.{bench,benchmark}.?(c|m)[jt]s?(x)'],
     exclude: string[] = ['node_modules', 'dist', '.idea', '.git', '.cache'],
     reporters: Array<string|Reporter> = 'default',
     outputJson?: string,
     compare?: string
   }

Troubleshooting Commands:
   - To run tests once: vitest run
   - To update snapshots: vitest --update
   - To get help: npx vitest --help

Full Code Example for a Basic Test:

File: sum.js
   export function sum(a, b) {
     return a + b
   }

File: sum.test.js
   import { expect, test } from 'vitest'
   import { sum } from './sum.js'

   test('adds 1 + 2 to equal 3', () => {
     expect(sum(1, 2)).toBe(3)
   })

Package.json snippet:
   {
     "scripts": {
       "test": "vitest",
       "coverage": "vitest run --coverage"
     }
   }

The above specifications include all parameters, return types and method signatures as outlined in the Vitest documentation.

## Information Dense Extract
Vitest; requires Vite>=5.0.0, Node>=18.0.0. Installation commands: npm install -D vitest, yarn add -D vitest, pnpm add -D vitest, bun add -D vitest. Test Example: function sum(a, b){return a+b} with test file using import { expect, test } from 'vitest'; package.json script test: "vitest". Config: defineConfig({ test: { include: ["**/*.{test,spec}.?(c|m)[jt]s?(x)"], exclude: ["**/node_modules/**", "**/dist/**", "**/cypress/**", "**/.{idea,git,cache,output,temp}/**", "**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*"], globals: false, environment: "node", pool: "forks" } }). Merge config via mergeConfig(viteConfig, vitestConfig). CLI options: --config, --globals, --watch, --update, --port, --https. Workspaces via defineWorkspace([...]) with inline object config. Server deps: external defaults [/\/node_modules\//], inline: [] or true, fallbackCJS false, cacheDir 'node_modules/.vite'. deps.optimizer with web mode options (transformAssets: true, transformCss: true) and ssr options. Benchmark options: include, exclude, reporters, outputJson, compare. API: test(name: string, fn:()=>any), expect(...). Full code examples provided as seen. Troubleshooting: use npx vitest --help, vitest run, VITEST_SKIP_INSTALL_CHECKS=1.

## Sanitised Extract
Table of Contents:
  1. Installation and Setup
    - Install commands: npm install -D vitest, yarn add -D vitest, pnpm add -D vitest, bun add -D vitest
    - Requirements: Vite >=5.0.0, Node >=18.0.0
  2. Writing Tests
    - Example function (sum) and test file using import { expect, test } from 'vitest'
    - Package.json test script: { 'scripts': { 'test': 'vitest' } }
  3. Configuration
    - Using vitest.config.ts with defineConfig from 'vitest/config' or merging with vite.config
    - Reference directive: /// <reference types='vitest/config' />
    - Example merging: import { defineConfig, mergeConfig } from 'vitest/config'; mergeConfig(viteConfig, defineConfig({ test: { ... } }))
  4. Command Line Interface
    - Commands: npx vitest, vitest run, CLI options such as --config, --globals, --watch
    - Default scripts: { 'test': 'vitest', 'coverage': 'vitest run --coverage' }
  5. Workspaces
    - Define workspace file (vitest.workspace.ts) using defineWorkspace with config arrays and inline configuration for multiple environments
  6. Detailed Options
    - Test file patterns (include, exclude), globals flag, environment setting (node, jsdom, happy-dom), pool selection (threads, forks, vmThreads, vmForks)
    - Server options: server.deps.external (default: [/'/node_modules'//]), inline modules, fallbackCJS
    - Dependency optimization options: deps.optimizer with ssr and web modes, transformAssets, transformCss, interopDefault
Detailed Information:
Installation: Use provided commands. Writing Tests: Function sum and corresponding test file must be created. Configuration: Use defineConfig in vitest.config.ts with potential merge using mergeConfig. CLI: Use options such as --config to specify alternate config paths and --globals to activate global APIs.
Dependency Handling: Externalize node_modules by default; inline modules via server.deps.inline; optimize dependencies using deps.optimizer settings. Advanced troubleshooting: Use VITEST_SKIP_INSTALL_CHECKS to disable dependency install prompts, check CLI output for configuration mismatches.

## Original Source
Testing Tools Documentation
https://vitest.dev/

## Digest of VITEST_DOC

# Vitest

Retrieved Date: 2023-10-XX

## Getting Started

Vitest is a next generation testing framework powered by Vite. It includes support for ESM, TypeScript, and JSX with esbuild. Vitest requires Vite >= v5.0.0 and Node >= v18.0.0.

## Installation

Install via one of the following commands:
- npm: npm install -D vitest
- yarn: yarn add -D vitest
- pnpm: pnpm add -D vitest
- bun: bun add -D vitest

You can also run tests directly via npx vitest.

## Writing Tests

Example of a simple test:

File: sum.js

export function sum(a, b) {
  return a + b
}

File: sum.test.js

import { expect, test } from 'vitest'
import { sum } from './sum.js'

test('adds 1 + 2 to equal 3', () => {
  expect(sum(1, 2)).toBe(3)
})

A tip is to name test files with .test. or .spec. in the filename. Add a test script in package.json:

{
  "scripts": {
    "test": "vitest"
  }
}

## Configuring Vitest

Vitest can use the unified configuration with Vite. If a root vite.config.ts exists, Vitest will use its plugins and alias settings. For custom test configuration, you can create a vitest.config.ts file:

Example:

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // specify test options here
  }
})

Alternatively, if using Vite and Vitest in one file, add a reference to Vitest types at the top:

/// <reference types="vitest/config" />
import { defineConfig } from 'vite'

export default defineConfig({
  test: {
    // specify options
  }
})

There are method options to merge configurations:

import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.mjs'

export default mergeConfig(viteConfig, defineConfig({
  test: {
    // custom test options
  }
}))

## Command Line Interface

Vitest can be run from the CLI using:

- vitest run (to run tests once)
- vitest --config <path> (to specify configuration file)

Default package.json scripts can be:

{
  "scripts": {
    "test": "vitest",
    "coverage": "vitest run --coverage"
  }
}

Additional CLI options include --globals to enable global APIs, --port, --https, and --watch mode.

## Workspaces Support

Vitest workspaces allow running different configuration setups within the same project. Example vitest.workspace.ts:

import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  'packages/*',
  'tests/*/vitest.config.{e2e,unit}.ts',
  {
    test: {
      name: 'happy-dom',
      root: './shared_tests',
      environment: 'happy-dom',
      setupFiles: ['./setup.happy-dom.ts']
    }
  },
  {
    test: {
      name: 'node',
      root: './shared_tests',
      environment: 'node',
      setupFiles: ['./setup.node.ts']
    }
  }
])

## Detailed Test Configuration Options

Options are defined within the test property of the configuration and include:

- include: Glob patterns for test files. Default: ["**/*.{test,spec}.?(c|m)[jt]s?(x)"]
- exclude: Glob patterns to be skipped. Default: ['**/node_modules/**', '**/dist/**', '**/cypress/**', '**/.{idea,git,cache,output,temp}/**', '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*']
- globals: Boolean flag to enable global APIs. Default: false
- environment: Set test environment, e.g. 'node', 'jsdom', 'happy-dom'. Default: 'node'
- pool: Test runner pool selection: 'threads', 'forks', 'vmThreads', 'vmForks'. Default: 'forks'

Other advanced options are provided for dependency handling under server.deps and optimization options under deps.optimizer.

## Dependency and Asset Handling

Server options include:

- server.deps.external: Array of dependencies to externalize. Default: [/\/node_modules\//]
- server.deps.inline: Array or true to inline modules. Default: []
- server.deps.fallbackCJS: Boolean to attempt guessing CJS version. Default: false
- deps.optimizer: Options to enable dependency optimization including modes for web or ssr with options like transformAssets and transformCss.

## Best Practices and Troubleshooting

Best practices include keeping configuration unified (using a single file for both Vite and Vitest) and ensuring test file naming conventions. Troubleshooting steps include checking the CLI output for errors (e.g. missing dependencies if npx vitest fails), verifying configuration file paths, and using environment variables like VITEST_SKIP_INSTALL_CHECKS to disable automatic dependency installation prompts.

Attribution: Vitest official documentation, Data Size: 33668002 bytes

## Attribution
- Source: Testing Tools Documentation
- URL: https://vitest.dev/
- License: License: MIT (Vitest), MIT (Supertest)
- Crawl Date: 2025-04-22T04:48:31.894Z
- Data Size: 33668002 bytes
- Links Found: 24937

## Retrieved
2025-04-22
