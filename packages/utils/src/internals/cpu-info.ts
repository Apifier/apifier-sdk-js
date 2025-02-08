import { readFile } from 'node:fs/promises';
import { cpus } from 'node:os';

import { getCgroupsVersion } from './cGroupsVersion';
import { isContainerised } from './general';

const CPU_FILE_PATHS = {
    STAT: {
        V1: '/sys/fs/cgroup/cpuacct/cpuacct.usage',
        V2: '/sys/fs/cgroup/cpu.stat',
    },
    QUOTA: {
        V1: '/sys/fs/cgroup/cpu/cpu.cfs_quota_us',
        V2: '/sys/fs/cgroup/cpu.max',
    },
    PERIOD: {
        V1: '/sys/fs/cgroup/cpu/cpu.cfs_period_us',
        V2: '/sys/fs/cgroup/cpu.max',
    },
};

const CLOCK_TICKS_PER_SECOND = 100; // Typical Linux tick rate.
const NANOSECONDS_PER_SECOND = 1e9;

const previousTicks = { idle: 0, total: 0 };
/**
 * Gets the "bare metal" cpu load.
 * Used in
 *  - AWS Lambda
 *  - Containers without a cGroup quota
 *  - Uncontainerised enviroments
 * @returns
 */
function getCurrentCpuTicks() {
    const cpusCores = cpus();
    const ticks = cpusCores.reduce(
        (acc, cpu) => {
            const cpuTimes = Object.values(cpu.times);
            return {
                idle: acc.idle + cpu.times.idle,
                total: acc.total + cpuTimes.reduce((sum, num) => sum + num),
            };
        },
        { idle: 0, total: 0 },
    );
    const idleTicksDelta = ticks.idle - previousTicks!.idle;
    const totalTicksDelta = ticks.total - previousTicks!.total;
    return totalTicksDelta ? 1 - idleTicksDelta / totalTicksDelta : 0;
}

/**
 * Reads the cgroup CPU quota.
 * In V1, a quota of -1 means “unlimited.”
 * In V2, a first field of "max" means unlimited.
 * @param cgroupsVersion the cGroup version
 * @returns The Cpu Quota
 */
async function getCpuQuota(cgroupsVersion: string): Promise<number | null> {
    if (cgroupsVersion === 'V1') {
        const quotaStr = await readFile(CPU_FILE_PATHS.QUOTA.V1, 'utf8');
        const quota = parseInt(quotaStr.trim(), 10);
        return quota === -1 ? null : quota;
    }
    // cgroup v2
    const maxStr = await readFile(CPU_FILE_PATHS.QUOTA.V2, 'utf8');
    const parts = maxStr.trim().split(/\s+/);
    if (parts[0] === 'max') {
        return null;
    }
    return parseInt(parts[0], 10);
}

/**
 * Reads the cgroup CPU period.
 * @param cgroupsVersion the cGroup version
 * @returns The Cpu Quota
 */
async function getCpuPeriod(cgroupsVersion: string): Promise<number> {
    if (cgroupsVersion === 'V1') {
        const quotaStr = await readFile(CPU_FILE_PATHS.PERIOD.V1, 'utf8');
        const quota = parseInt(quotaStr.trim(), 10);
        return quota;
    }
    // cgroup v2
    const maxStr = await readFile(CPU_FILE_PATHS.PERIOD.V2, 'utf8');
    const parts = maxStr.trim().split(/\s+/);
    return parseInt(parts[1], 10);
}

/**
 * Reads the cpu usage of the container
 * @param cgroupsVersion the cGroup version
 * @returns the cpu usage
 */
async function getContainerCpuUsage(cgroupsVersion: string): Promise<number> {
    if (cgroupsVersion === 'V1') {
        const data = await readFile(CPU_FILE_PATHS.STAT.V1, 'utf8');
        return Number(data.trim());
    }
    // cgroup v2
    const data = await readFile(CPU_FILE_PATHS.STAT.V2, 'utf8');
    const lines = data.split('\n');
    let usageUsec = 0;
    for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts[0] === 'usage_usec') {
            usageUsec = Number(parts[1]);
            break;
        }
    }
    // Convert microseconds to nanoseconds.
    return usageUsec * 1000;
}

/**
 * Reads the cpu usage of the system from cgroup
 * @returns the cpu usage
 */
async function getSystemCpuUsage() {
    const statData = await readFile('/proc/stat', 'utf8');
    const lines = statData.split('\n');
    for (const line of lines) {
        if (line.startsWith('cpu ')) {
            // Split the line and extract the first seven numeric fields:
            // user, nice, system, idle, iowait, irq, softirq
            const parts = line.split(/\s+/).slice(1, 8);
            let totalTicks = 0;
            for (const part of parts) {
                totalTicks += Number(part);
            }
            // Convert clock ticks to nanoseconds.
            return (totalTicks * NANOSECONDS_PER_SECOND) / CLOCK_TICKS_PER_SECOND;
        }
    }
    throw new Error('no cpu line'); // shouldnt ever happen
}

interface CpuSample {
    containerUsage: number; // in nanoseconds
    systemUsage: number; // in nanoseconds
}

/**
 * Takes a CPU usage sample for both the container and the system.
 *
 * @returns An object containing the container and system CPU usage.
 */
async function sampleCpuUsage(cGroupsVersion: string): Promise<CpuSample> {
    const [containerUsage, systemUsage] = await Promise.all([
        getContainerCpuUsage(cGroupsVersion),
        getSystemCpuUsage(),
    ]);
    return { containerUsage, systemUsage };
}

let previousSample: CpuSample = { containerUsage: 0, systemUsage: 0 };

export async function getCpuInfo(): Promise<number> {
    const isLambdaEnvironment = process.platform === 'linux' && !!process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE;

    const isContainerisedVar = !isLambdaEnvironment && (await isContainerised());

    if (isLambdaEnvironment) {
        // AWS Lambda does not expose useful cgroup info for CPU;
        // so we fallback to the bare metal CPU ticks calculation.
        return getCurrentCpuTicks();
    }
    if (isContainerisedVar) {
        const cgroupsVersion = await getCgroupsVersion();
        // cgroup aware cpu limit. If no limits are set, default to returning getCurrentCpuTicks.
        const quota = await getCpuQuota(cgroupsVersion);
        if (quota === null) {
            // no cgroup limit, return host cpu load
            return getCurrentCpuTicks();
        }
        const period = await getCpuPeriod(cgroupsVersion);
        // eg. having a 200000us quots per 100000us means the cGroup can fully use 2 cores
        const cpuAllowance = quota / period;

        const sample = await sampleCpuUsage(cgroupsVersion);

        const containerDelta = sample.containerUsage - previousSample.containerUsage;
        const systemDelta = sample.systemUsage - previousSample.systemUsage;

        previousSample = sample;

        const numCpus = cpus().length;

        // Calculate the CPU usage percentage.
        return ((containerDelta / systemDelta) * numCpus * 100) / cpuAllowance;
    }
    // bare metal cpu limit
    return getCurrentCpuTicks();
}
