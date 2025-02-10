import log from '@apify/log';
import { betterClearInterval, betterSetInterval } from '@apify/utilities';
import { getCpuInfo, getMemoryInfo } from '@crawlee/utils';

import { EventManager, EventType } from './event_manager';
import type { SystemInfo } from '../autoscaling';

export class LocalEventManager extends EventManager {

    /**
     * Initializes the EventManager and sets up periodic `systemInfo` and `persistState` events.
     * This is automatically called at the beginning of `crawler.run()`.
     */
    override async init() {
        if (this.initialized) {
            return;
        }

        await super.init();

        const systemInfoIntervalMillis = this.config.get('systemInfoIntervalMillis')!;
        this.emitSystemInfoEvent = this.emitSystemInfoEvent.bind(this);
        this.intervals.systemInfo = betterSetInterval(this.emitSystemInfoEvent.bind(this), systemInfoIntervalMillis);
    }

    /**
     * @inheritDoc
     */
    override async close() {
        if (!this.initialized) {
            return;
        }

        await super.close();
        betterClearInterval(this.intervals.systemInfo!);
    }

    /**
     * @internal
     */
    async emitSystemInfoEvent(intervalCallback: () => unknown) {
        const info = await this.createSystemInfo({
            maxUsedCpuRatio: this.config.get('maxUsedCpuRatio'),
        });
        this.events.emit(EventType.SYSTEM_INFO, info);
        intervalCallback();
    }

    /**
     * Creates a SystemInfo object based on local metrics.
     */
    private async createSystemInfo(options: { maxUsedCpuRatio: number }) {
        return {
            createdAt: new Date(),
            ...(await this.createCpuInfo(options)),
            ...(await this.createMemoryInfo()),
        } as SystemInfo;
    }

    private async createCpuInfo(options: { maxUsedCpuRatio: number }) {
        try {
            const usedCpuRatio = await this._getCpuInfo();

            return {
                cpuCurrentUsage: usedCpuRatio * 100,
                isCpuOverloaded: usedCpuRatio > options.maxUsedCpuRatio,
            };
        } catch (err) {
            log.exception(err as Error, 'Cpu snapshot failed.');
            return {};
        }
    }

    /**
     * Helper method for easier mocking.
     */
    private async _getCpuInfo() {
        return getCpuInfo();
    }

    private async createMemoryInfo() {
        try {
            const memInfo = await this._getMemoryInfo();
            const { mainProcessBytes, childProcessesBytes } = memInfo;

            return {
                memCurrentBytes: mainProcessBytes + childProcessesBytes,
            };
        } catch (err) {
            log.exception(err as Error, 'Memory snapshot failed.');
            return {};
        }
    }

    /**
     * Helper method for easier mocking.
     */
    private async _getMemoryInfo() {
        return getMemoryInfo();
    }
}
