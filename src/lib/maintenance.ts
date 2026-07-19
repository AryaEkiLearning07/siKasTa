import { prisma } from './prisma'

const MAINTENANCE_KEY = 'maintenance'

export type MaintenanceState = {
  enabled: boolean
  reason?: string
  jobId?: string
  startedAt?: string
}

const disabledState: MaintenanceState = { enabled: false }

export async function getMaintenanceState(): Promise<MaintenanceState> {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: MAINTENANCE_KEY },
    select: { value: true },
  })

  if (!setting || typeof setting.value !== 'object' || setting.value === null || Array.isArray(setting.value)) {
    return disabledState
  }

  const value = setting.value as Record<string, unknown>

  return {
    enabled: value.enabled === true,
    reason: typeof value.reason === 'string' ? value.reason : undefined,
    jobId: typeof value.jobId === 'string' ? value.jobId : undefined,
    startedAt: typeof value.startedAt === 'string' ? value.startedAt : undefined,
  }
}

export async function setMaintenanceState(state: MaintenanceState) {
  await prisma.systemSetting.upsert({
    where: { key: MAINTENANCE_KEY },
    create: { key: MAINTENANCE_KEY, value: state },
    update: { value: state },
  })
}
