import { statfs } from 'fs/promises';

function formatMemoryUsage(data: number) {
  return `${Math.round((data / 1024 / 1024) * 100) / 100} MB`;
}

export async function getDiskUsage() {
  const diskUsage = await statfs('/');
  return {
    free: formatMemoryUsage(diskUsage.bsize * diskUsage.bfree),
    available: formatMemoryUsage(diskUsage.bsize * diskUsage.bavail),
  };
}

export function getMemoryUsage() {
  const memoryData = process.memoryUsage();

  const memoryUsage = {
    rss: formatMemoryUsage(memoryData.rss), // Resident Set Size - total memory allocated for the process execution
    heapTotal: formatMemoryUsage(memoryData.heapTotal), // total size of the allocated heap
    heapUsed: formatMemoryUsage(memoryData.heapUsed), // actual memory used during the execution
    external: formatMemoryUsage(memoryData.external), // V8 external memory
  };
  return memoryUsage;
}
