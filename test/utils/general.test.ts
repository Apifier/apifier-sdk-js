import asyncFs from 'node:fs/promises';

import { getCgroupsVersion , isDocker, isContainerised, weightedAvg, sleep, snakeCaseToCamelCase } from '@crawlee/utils';

describe('isDocker()', () => {
    test('works for dockerenv && cgroup', async () => {
        const statMock = vitest.spyOn(asyncFs, 'stat').mockImplementationOnce(async () => null as any);
        const readMock = vitest
            .spyOn(asyncFs, 'readFile')
            .mockImplementationOnce(async () => Promise.resolve('something ... docker ... something'));

        const is = await isDocker(true);

        expect(is).toBe(true);
    });

    test('works for dockerenv', async () => {
        const statMock = vitest.spyOn(asyncFs, 'stat').mockImplementationOnce(async () => null as any);
        const readMock = vitest
            .spyOn(asyncFs, 'readFile')
            .mockImplementationOnce(async () => Promise.resolve('something ... ... something'));

        const is = await isDocker(true);

        expect(is).toBe(true);
    });

    test('works for cgroup', async () => {
        const statMock = vitest
            .spyOn(asyncFs, 'stat')
            .mockImplementationOnce(async () => Promise.reject(new Error('no.')));
        const readMock = vitest
            .spyOn(asyncFs, 'readFile')
            .mockImplementationOnce(async () => Promise.resolve('something ... docker ... something'));

        const is = await isDocker(true);

        expect(is).toBe(true);
    });

    test('works for nothing', async () => {
        const statMock = vitest
            .spyOn(asyncFs, 'stat')
            .mockImplementationOnce(async () => Promise.reject(new Error('no.')));
        const readMock = vitest
            .spyOn(asyncFs, 'readFile')
            .mockImplementationOnce(async () => Promise.resolve('something ... ... something'));

        const is = await isDocker(true);

        expect(is).toBe(false);
    });
});

describe('weightedAvg()', () => {
    test('works', () => {
        expect(weightedAvg([10, 10, 10], [1, 1, 1])).toBe(10);
        expect(weightedAvg([5, 10, 15], [1, 1, 1])).toBe(10);
        expect(weightedAvg([10, 10, 10], [0.5, 1, 1.5])).toBe(10);
        expect(weightedAvg([29, 35, 89], [13, 91, 3])).toEqual((29 * 13 + 35 * 91 + 89 * 3) / (13 + 91 + 3));
        expect(weightedAvg([], [])).toEqual(NaN);
        expect(weightedAvg([1], [0])).toEqual(NaN);
        expect(weightedAvg([], [1])).toEqual(NaN);
    });
});

describe('sleep()', () => {
    test('works', async () => {
        await Promise.resolve();
        await sleep(0);
        await sleep();
        // @ts-expect-error invalid input type
        await sleep(null);
        await sleep(-1);

        const timeBefore = Date.now();
        await sleep(100);
        const timeAfter = Date.now();

        expect(timeAfter - timeBefore).toBeGreaterThanOrEqual(95);
    });
});

describe('snakeCaseToCamelCase()', () => {
    test('should camel case all sneaky cases of snake case', () => {
        const tests = {
            'aaa_bbb_': 'aaaBbb',
            '': '',
            'AaA_bBb_cCc': 'aaaBbbCcc',
            'a_1_b_1a': 'a1B1a',
        };

        Object.entries(tests).forEach(([snakeCase, camelCase]) => {
            expect(snakeCaseToCamelCase(snakeCase)).toEqual(camelCase);
        });
    });
});

describe('isContainerised()', () => {

    afterEach(() => {
        vitest.restoreAllMocks();
        delete process.env.KUBERNETES_SERVICE_HOST;
        delete process.env.CRAWLEE_CONTAINERISED;
    });

    test('returns true when isDocker returns true', async () => {
        // make isDocker return true
        const statMock = vitest.spyOn(asyncFs, 'stat').mockImplementationOnce(async () => null as any);
        const result = await isContainerised(true);
        expect(result).toBe(true);
    });

    test('returns true when KUBERNETES_SERVICE_HOST environment variable is set', async () => {
        process.env.KUBERNETES_SERVICE_HOST = 'some-host';
        const result = await isContainerised(true);
        expect(result).toBe(true);
    });

    test('returns true when CRAWLEE_CONTAINERISED environment variable is set', async () => {
        process.env.CRAWLEE_CONTAINERISED = '1';
        const result = await isContainerised(true);
        expect(result).toBe(true);
    });

    test('returns false when neither isDocker returns true nor env variables are set', async () => {
        const result = await isContainerised(true);
        expect(result).toBe(false);
    });
});

describe('getCgroupsVersion()', () => {
    // Reset the module cache so that _cgroupsVersion is not retained across tests.
    beforeEach(() => {
        vitest.resetModules();
    });

    test('returns V1 when access to /sys/fs/cgroup/memory/ succeeds', async () => {
        vitest.spyOn(asyncFs, 'access').mockResolvedValue();
        const version = await getCgroupsVersion();
        expect(version).toBe('V1');
    });

    test('returns V2 when access to /sys/fs/cgroup/memory/ fails', async () => {
        vitest.spyOn(asyncFs, 'access').mockRejectedValue(new Error('Not found'));
        const version = await getCgroupsVersion();
        expect(version).toBe('V2');
    });
});
