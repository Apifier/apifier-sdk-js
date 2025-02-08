import { access } from 'node:fs/promises';

let _cgroupsVersion: 'V1' | 'V2';
/**
 * gets the cgroups version by checking for a file at /sys/fs/cgroup/memory
 * @returns "V1" or "V2" for the version
 */
export async function getCgroupsVersion() {
    if (_cgroupsVersion) {
        return _cgroupsVersion;
    }
    _cgroupsVersion = 'V1';
    try {
        // If this directory does not exists, assume the container is using cgroups V2
        await access('/sys/fs/cgroup/memory/');
    } catch {
        _cgroupsVersion = 'V2';
    }
    return _cgroupsVersion;
}
