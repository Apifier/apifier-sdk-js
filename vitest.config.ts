import { resolve } from 'node:path';

import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [tsconfigPaths()],
    esbuild: {
        target: 'es2021',
        keepNames: true,
    },
    test: {
        globals: true,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'lcov', 'cobertura'],
            exclude: [
                '**/node_modules/**',
                '**/dist/**',
                '**/test/**',
            ],
        },
        restoreMocks: true,
        // TODO: We were recommended to turn this to false if we do not rely on global state, as it will speed up tests even more
        // but that said, not sure if it WILL work in our system, so if tests crap the bed, try turning this off first.
        isolate: false,
        // minThreads: 1,
        // maxThreads: 3,
        testTimeout: 60_000,
        alias: [
            { find: 'crawlee', replacement: resolve(__dirname, './packages/crawlee/src') },
            { find: '@crawlee/basic', replacement: resolve(__dirname, './packages/basic-crawler/src') },
            { find: '@crawlee/browser', replacement: resolve(__dirname, './packages/browser-crawler/src') },
            { find: '@crawlee/http', replacement: resolve(__dirname, './packages/http-crawler/src') },
            { find: '@crawlee/linkedom', replacement: resolve(__dirname, './packages/linkedom-crawler/src') },
            { find: '@crawlee/jsdom', replacement: resolve(__dirname, './packages/jsdom-crawler/src') },
            { find: '@crawlee/cheerio', replacement: resolve(__dirname, './packages/cheerio-crawler/src') },
            { find: '@crawlee/playwright', replacement: resolve(__dirname, './packages/playwright-crawler/src') },
            { find: '@crawlee/puppeteer', replacement: resolve(__dirname, './packages/puppeteer-crawler/src') },
            { find: /^@crawlee\/(.*)\/(.*)$/, replacement: resolve(__dirname, './packages/$1/$2') },
            { find: /^@crawlee\/(.*)$/, replacement: resolve(__dirname, './packages/$1/src') },
            { find: /^test\/(.*)$/, replacement: resolve(__dirname, './test/$1') },
        ],
    },
});