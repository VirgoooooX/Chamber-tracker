import * as XLSX from 'xlsx'
import { format, isValid, parseISO } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import type { Chamber, Project, TestProject, UsageLog } from '../types'
import { getEffectiveUsageLogStatus } from './statusHelpers'

const formatDateTime = (value: string | undefined) => {
  if (!value) return ''
  const date = parseISO(value)
  if (!isValid(date)) return value
  return format(date, 'yyyy-MM-dd HH:mm', { locale: zhCN })
}

const buildConfigNameMapByProjectId = (projects: Project[]) => {
  const map = new Map<string, Map<string, string>>()
  projects.forEach((p) => {
    const configMap = new Map<string, string>()
    ;(p.configs || []).forEach((c) => configMap.set(c.id, c.name))
    map.set(p.id, configMap)
  })
  return map
}

export const exportUsageLogsToXlsx = (params: {
  usageLogs: UsageLog[]
  chambers: Chamber[]
  projects: Project[]
  testProjects: TestProject[]
  fileNamePrefix?: string
}) => {
  const { usageLogs, chambers, projects, testProjects, fileNamePrefix = 'usage-logs' } = params

  const chamberNameById = new Map(chambers.map((c) => [c.id, c.name] as const))
  const projectById = new Map(projects.map((p) => [p.id, p] as const))
  const testProjectNameById = new Map(testProjects.map((tp) => [tp.id, tp.name] as const))
  const configNameByProjectId = buildConfigNameMapByProjectId(projects)

  const rows = usageLogs.map((log) => {
    const effectiveStatus = getEffectiveUsageLogStatus(log)
    const chamberName = chamberNameById.get(log.chamberId) || log.chamberId
    const project = log.projectId ? projectById.get(log.projectId) : undefined
    const projectName = project?.name || (log.projectId || '')
    const testProjectName = log.testProjectId ? (testProjectNameById.get(log.testProjectId) || log.testProjectId) : ''

    const configNames =
      log.projectId && log.selectedConfigIds && log.selectedConfigIds.length > 0
        ? log.selectedConfigIds
            .map((id) => configNameByProjectId.get(log.projectId!)?.get(id) || id)
            .join('，')
        : ''

    return {
      使用记录ID: log.id,
      环境箱: chamberName,
      项目: projectName,
      测试项目: testProjectName,
      配置: configNames,
      WF: log.selectedWaterfall || '',
      用户: log.user,
      开始时间: formatDateTime(log.startTime),
      结束时间: formatDateTime(log.endTime),
      存储状态: log.status,
      有效状态: effectiveStatus,
      备注: log.notes || '',
      创建时间: formatDateTime(log.createdAt),
    }
  })

  const worksheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '使用记录')

  const arrayBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([arrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })

  const fileName = `${fileNamePrefix}_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}

