import React, { useEffect, useMemo, useState } from 'react'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  LinearProgress,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import AssessmentIcon from '@mui/icons-material/Assessment'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import EventAvailableIcon from '@mui/icons-material/EventAvailable'
import BuildCircleIcon from '@mui/icons-material/BuildCircle'
import SpeedIcon from '@mui/icons-material/Speed'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { zhCN } from 'date-fns/locale'
import { startOfDay, subDays } from 'date-fns'
import AppCard from '../components/AppCard'
import PageShell from '../components/PageShell'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { fetchAssetsByType } from '../store/assetsSlice'
import { fetchUsageLogs } from '../store/usageLogsSlice'
import { selectDashboardKpis } from '../store/kpiSelectors'
import { setDashboardRangePreset } from '../store/settingsSlice'
import { Alert } from '@mui/material'
import TitleWithIcon from '../components/TitleWithIcon'
import DashboardIcon from '@mui/icons-material/Dashboard'
import { fetchRepairTickets } from '../store/repairTicketsSlice'
import { useNavigate } from 'react-router-dom'
import { fetchProjects } from '../store/projectsSlice'
import { fetchTestProjects } from '../store/testProjectsSlice'
import { isUsageLogOccupyingAsset } from '../utils/statusHelpers'
import type { Asset, UsageLog } from '../types'

type RangePreset = '7d' | '30d' | '90d' | 'custom'

const TOP_ROW_HEIGHT = 180

const formatPercent = (value: number) => `${Math.round(value * 100)}%`

const formatDateTime = (value?: string) => {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString()
}

const KpiTile: React.FC<{
  label: string
  value: React.ReactNode
  icon: React.ReactNode
  tone?: 'default' | 'success' | 'warning' | 'error'
  footer?: React.ReactNode
}> = ({ label, value, icon, tone = 'default', footer }) => {
  const theme = useTheme()
  const color =
    tone === 'success'
      ? theme.palette.success.main
      : tone === 'warning'
        ? theme.palette.warning.main
        : tone === 'error'
          ? theme.palette.error.main
          : theme.palette.primary.main

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: alpha(color, 0.22),
        background: `linear-gradient(180deg, ${alpha(color, 0.10)} 0%, ${alpha(theme.palette.background.paper, 1)} 56%)`,
        borderRadius: 2,
        p: 1.5,
        minHeight: 92,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
        <Stack spacing={0.25}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 750 }}>
            {label}
          </Typography>
          <Typography variant="h5" sx={{ lineHeight: 1.05, fontWeight: 900 }}>
            {value}
          </Typography>
        </Stack>
        <Box
          sx={{
            width: 38,
            height: 38,
            borderRadius: 2,
            display: 'grid',
            placeItems: 'center',
            backgroundColor: alpha(color, 0.14),
            color,
          }}
        >
          {icon}
        </Box>
      </Stack>
      {footer ? (
        <Box sx={{ mt: 1 }}>
          <Divider sx={{ mb: 1 }} />
          {footer}
        </Box>
      ) : null}
    </Box>
  )
}

const DashboardPage: React.FC = () => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const theme = useTheme()

  const assetsLoading = useAppSelector((s) => s.assets.loading)
  const usageLogsLoading = useAppSelector((s) => s.usageLogs.loading)
  const repairTicketsLoading = useAppSelector((s) => s.repairTickets.loading)
  const repairTickets = useAppSelector((s) => s.repairTickets.tickets)
  const assets = useAppSelector((s) => s.assets.assets)
  const usageLogs = useAppSelector((s) => s.usageLogs.usageLogs)
  const projects = useAppSelector((s) => s.projects.projects)
  const testProjects = useAppSelector((s) => s.testProjects.testProjects)
  const settings = useAppSelector((s) => s.settings)
  const fallbackSource = useAppSelector((s) => s.assets.fallbackSource)

  const [preset, setPreset] = useState<RangePreset>(settings.dashboard.rangePreset)
  const [customStart, setCustomStart] = useState<Date | null>(startOfDay(subDays(new Date(), 30)))
  const [customEnd, setCustomEnd] = useState<Date | null>(new Date())
  const calibrationDaysThreshold = settings.alerts.calibrationDaysThreshold

  useEffect(() => {
    if (preset !== 'custom') setPreset(settings.dashboard.rangePreset)
  }, [preset, settings.dashboard.rangePreset])

  useEffect(() => {
    dispatch(fetchAssetsByType('chamber'))
    dispatch(fetchUsageLogs())
    dispatch(fetchRepairTickets(undefined))
    dispatch(fetchProjects())
    dispatch(fetchTestProjects())
  }, [dispatch])

  const { startMs, endMs } = useMemo(() => {
    const now = new Date()
    if (preset === '7d') {
      return { startMs: startOfDay(subDays(now, 7)).getTime(), endMs: now.getTime() }
    }
    if (preset === '30d') {
      return { startMs: startOfDay(subDays(now, 30)).getTime(), endMs: now.getTime() }
    }
    if (preset === '90d') {
      return { startMs: startOfDay(subDays(now, 90)).getTime(), endMs: now.getTime() }
    }
    const start = customStart ?? startOfDay(subDays(now, 30))
    const end = customEnd ?? now
    return { startMs: start.getTime(), endMs: end.getTime() }
  }, [customEnd, customStart, preset])

  const nowMs = useMemo(() => Date.now(), [startMs, endMs])

  const kpis = useAppSelector((state) =>
    selectDashboardKpis(state, startMs, endMs, calibrationDaysThreshold, nowMs)
  )

  const isLoading = assetsLoading || usageLogsLoading
  const isRepairLoading = repairTicketsLoading
  const utilizationText = useMemo(() => formatPercent(kpis.utilization.ratio), [kpis.utilization.ratio])

  const repairStats = useMemo(() => {
    const quotePending = repairTickets.filter((t) => t.status === 'quote-pending').length
    const repairPending = repairTickets.filter((t) => t.status === 'repair-pending').length
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const completedThisWeek = repairTickets.filter((t) => {
      if (t.status !== 'completed' || !t.completedAt) return false
      const ms = new Date(t.completedAt).getTime()
      return !Number.isNaN(ms) && ms >= weekAgo
    }).length
    return { quotePending, repairPending, completedThisWeek }
  }, [repairTickets])

  const urgentOpenRepairs = useMemo(() => {
    const open = repairTickets.filter((t) => t.status !== 'completed')
    return open
      .slice()
      .sort((a, b) => {
        const aTime = new Date(a.updatedAt ?? a.createdAt).getTime()
        const bTime = new Date(b.updatedAt ?? b.createdAt).getTime()
        return bTime - aTime
      })
      .slice(0, 5)
  }, [repairTickets])

  const assetNameById = useMemo(() => {
    const map = new Map<string, string>()
    assets.forEach((a) => map.set(a.id, a.name))
    return map
  }, [assets])

  const projectNameById = useMemo(() => {
    const map = new Map<string, string>()
    projects.forEach((p) => map.set(p.id, p.name))
    return map
  }, [projects])

  const testProjectNameById = useMemo(() => {
    const map = new Map<string, string>()
    testProjects.forEach((p) => map.set(p.id, p.name))
    return map
  }, [testProjects])

  type ActiveOccupancy = {
    chamberId: string
    chamberName: string
    log: UsageLog
    activeCount: number
    startMs: number
    endMs: number
  }

  const activeOccupancies = useMemo<ActiveOccupancy[]>(() => {
    const now = new Date()
    const byChamber = new Map<string, UsageLog[]>()

    usageLogs.forEach((log) => {
      if (!isUsageLogOccupyingAsset(log, now)) return
      const list = byChamber.get(log.chamberId) ?? []
      list.push(log)
      byChamber.set(log.chamberId, list)
    })

    const parseMs = (value?: string, fallback: number = Number.POSITIVE_INFINITY) => {
      if (!value) return fallback
      const ms = new Date(value).getTime()
      return Number.isNaN(ms) ? fallback : ms
    }

    const pickBestLog = (logs: UsageLog[]) => {
      const nowMs = now.getTime()
      return logs
        .slice()
        .sort((a, b) => {
          const aEnd = parseMs(a.endTime)
          const bEnd = parseMs(b.endTime)
          if (aEnd !== bEnd) return aEnd - bEnd
          const aStart = parseMs(a.startTime, nowMs)
          const bStart = parseMs(b.startTime, nowMs)
          return bStart - aStart
        })[0]
    }

    const result: ActiveOccupancy[] = []
    byChamber.forEach((logs, chamberId) => {
      const best = pickBestLog(logs)
      const chamberName = assetNameById.get(chamberId) ?? chamberId.slice(0, 8)
      const startMs = parseMs(best.startTime, now.getTime())
      const endMs = parseMs(best.endTime)
      result.push({
        chamberId,
        chamberName,
        log: best,
        activeCount: logs.length,
        startMs,
        endMs,
      })
    })

    return result.sort((a, b) => {
      if (a.endMs !== b.endMs) return a.endMs - b.endMs
      if (a.startMs !== b.startMs) return b.startMs - a.startMs
      return a.chamberName.localeCompare(b.chamberName, 'zh-Hans-CN')
    })
  }, [assetNameById, usageLogs])

  const activeOccupancyByAssetId = useMemo(() => {
    const map = new Map<string, ActiveOccupancy>()
    activeOccupancies.forEach((o) => map.set(o.chamberId, o))
    return map
  }, [activeOccupancies])

  const assetsByCategory = useMemo(() => {
    const map = new Map<string, Asset[]>()
    assets.forEach((asset) => {
      const key = asset.category?.trim() || (asset.type === 'chamber' ? '环境箱' : asset.type)
      const list = map.get(key) ?? []
      list.push(asset)
      map.set(key, list)
    })
    map.forEach((list, key) =>
      map.set(
        key,
        list.slice().sort((a, b) => {
          const aName = a.name || ''
          const bName = b.name || ''
          return aName.localeCompare(bName, 'zh-Hans-CN')
        })
      )
    )
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], 'zh-Hans-CN'))
  }, [assets])

  return (
    <PageShell
      title={
        <TitleWithIcon icon={<DashboardIcon />}>设备总览</TitleWithIcon>
      }
      maxWidth="xl"
      actions={
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <ToggleButtonGroup
            value={preset}
            exclusive
            size="small"
            onChange={(_, value) => {
              if (!value) return
              if (value === 'custom') {
                setPreset('custom')
                return
              }
              dispatch(setDashboardRangePreset(value))
              setPreset(value)
            }}
          >
            <ToggleButton value="7d">7天</ToggleButton>
            <ToggleButton value="30d">30天</ToggleButton>
            <ToggleButton value="90d">90天</ToggleButton>
            <ToggleButton value="custom">自定义</ToggleButton>
          </ToggleButtonGroup>
          <Chip
            label={`校准提醒: ${calibrationDaysThreshold}天`}
            size="small"
            sx={{ fontWeight: 650 }}
          />
        </Stack>
      }
    >
      {fallbackSource === 'chambers' ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          当前正在从旧的 chambers 集合读取数据（assets 尚未迁移）。建议到“设置 → 数据迁移”执行一键迁移。
        </Alert>
      ) : null}
      {preset === 'custom' ? (
        <AppCard title="时间窗">
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={zhCN}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <DateTimePicker
                  label="开始时间"
                  value={customStart}
                  onChange={(v) => setCustomStart(v)}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <DateTimePicker
                  label="结束时间"
                  value={customEnd}
                  onChange={(v) => setCustomEnd(v)}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
            </Grid>
          </LocalizationProvider>
        </AppCard>
      ) : null}

      <Box
        sx={{
          mt: preset === 'custom' ? 2 : 0,
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(1, minmax(0, 1fr))',
            sm: 'repeat(2, minmax(0, 1fr))',
            md: 'repeat(3, minmax(0, 1fr))',
            lg: 'repeat(5, minmax(0, 1fr))',
          },
          gridAutoRows: `${TOP_ROW_HEIGHT}px`,
          gridAutoFlow: 'row',
          gap: 2,
          alignItems: 'stretch',
        }}
      >
        <Box sx={{ display: 'flex', minWidth: 0, height: '100%', alignItems: 'stretch' }}>
          <AppCard
            sx={{
              flex: 1,
              height: '100%',
              p: 0,
              border: 'none',
              boxShadow: 'none',
              backgroundColor: 'transparent',
            }}
            contentSx={{ mt: 0, height: '100%' }}
          >
            <Box sx={{ height: '100%', overflow: 'hidden' }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gridTemplateRows: 'repeat(2, auto)',
                  gap: 1.25,
                  minWidth: 0,
                  alignContent: 'start',
                }}
              >
                {([
                  {
                    label: '设备总数',
                    value: kpis.totalAssets,
                    color: theme.palette.primary.main,
                    icon: <AssessmentIcon fontSize="small" />,
                  },
                  {
                    label: '可用',
                    value: kpis.statusCounts.available,
                    color: theme.palette.success.main,
                    icon: <EventAvailableIcon fontSize="small" />,
                  },
                  {
                    label: '使用中',
                    value: kpis.statusCounts['in-use'],
                    color: theme.palette.warning.main,
                    icon: <SpeedIcon fontSize="small" />,
                  },
                  {
                    label: '维护中',
                    value: kpis.statusCounts.maintenance,
                    color: theme.palette.error.main,
                    icon: <BuildCircleIcon fontSize="small" />,
                  },
                ] as const).map((item) => (
                  <Box
                    key={item.label}
                    sx={{
                      border: '1px solid',
                      borderColor: alpha(item.color, 0.24),
                      background: `linear-gradient(180deg, ${alpha(item.color, 0.10)} 0%, ${alpha(theme.palette.background.paper, 1)} 74%)`,
                      borderRadius: 2,
                      p: 1.5,
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 1fr) auto',
                      alignItems: 'center',
                      gap: 1.25,
                      minWidth: 0,
                    }}
                  >
                    <Typography sx={{ fontWeight: 950, fontSize: 40, lineHeight: 1, letterSpacing: -0.9 }} noWrap>
                      {item.value}
                    </Typography>
                    <Stack spacing={0.35} alignItems="flex-end" justifyContent="center" sx={{ minWidth: 0 }}>
                      <Box
                        sx={{
                          width: 28,
                          height: 28,
                          borderRadius: 2,
                          display: 'grid',
                          placeItems: 'center',
                          backgroundColor: alpha(item.color, 0.14),
                          color: item.color,
                          flex: '0 0 auto',
                        }}
                      >
                        {item.icon}
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 900 }} noWrap>
                        {item.label}
                      </Typography>
                    </Stack>
                  </Box>
                ))}
              </Box>
            </Box>
          </AppCard>
        </Box>

        {([
          {
            title: '维修追踪',
            tone: 'warning' as const,
            value: isRepairLoading ? '-' : String(repairStats.quotePending + repairStats.repairPending),
            unit: '单',
            notes: [
              `未询价：${isRepairLoading ? '-' : repairStats.quotePending}`,
              `待维修：${isRepairLoading ? '-' : repairStats.repairPending}`,
              `本周完成：${isRepairLoading ? '-' : repairStats.completedThisWeek}`,
            ],
            cta: { label: '进入维修', onClick: () => navigate('/repairs') },
            chip: { label: '待处理', color: 'warning' as const },
          },
          {
            title: `校验提醒（≤${kpis.calibrationDueSoon.daysThreshold}天）`,
            tone: 'warning' as const,
            value: String(kpis.calibrationDueSoon.count),
            unit: '台',
            notes: [
              `阈值：≤${kpis.calibrationDueSoon.daysThreshold}天`,
              kpis.calibrationDueSoon.assets[0]?.name ? `最近到期：${kpis.calibrationDueSoon.assets[0].name}` : '最近到期：-',
              kpis.calibrationDueSoon.assets[0]?.calibrationDate
                ? `日期：${new Date(kpis.calibrationDueSoon.assets[0].calibrationDate).toLocaleString()}`
                : '日期：-',
            ],
            cta: { label: '查看设备', onClick: () => navigate('/chambers') },
            chip: { label: kpis.calibrationDueSoon.count > 0 ? '需处理' : '正常', color: kpis.calibrationDueSoon.count > 0 ? ('warning' as const) : ('success' as const) },
          },
          {
            title: '使用率',
            tone: 'primary' as const,
            value: utilizationText,
            unit: '',
            notes: [
              `时间窗：${preset === 'custom' ? '自定义' : preset === '7d' ? '7天' : preset === '30d' ? '30天' : '90天'}`,
              '口径：合并占用时段',
              `数据：${isLoading ? '加载中' : '已更新'}`,
            ],
            cta: { label: '打开时间线', onClick: () => navigate('/timeline') },
            chip: { label: '利用率', color: 'primary' as const },
          },
          {
            title: '超时/逾期',
            tone: 'error' as const,
            value: String(kpis.overdueActiveCount),
            unit: '条',
            notes: ['口径：时间窗内逾期记录', `时间窗：${preset === 'custom' ? '自定义' : preset === '7d' ? '7天' : preset === '30d' ? '30天' : '90天'}`, `数据：${isLoading ? '加载中' : '已更新'}`],
            cta: { label: '打开记录', onClick: () => navigate('/usage-logs') },
            chip: { label: kpis.overdueActiveCount > 0 ? '关注' : '正常', color: kpis.overdueActiveCount > 0 ? ('error' as const) : ('success' as const) },
          },
        ] as const).map((card) => {
          const accent =
            card.tone === 'warning'
              ? theme.palette.warning.main
              : card.tone === 'error'
                ? theme.palette.error.main
                : card.tone === 'primary'
                  ? theme.palette.primary.main
                  : theme.palette.info.main

          return (
            <Box key={card.title} sx={{ display: 'flex', minWidth: 0, height: '100%', alignItems: 'stretch' }}>
              <AppCard
                sx={{
                  flex: 1,
                  height: '100%',
                  p: 0,
                  border: 'none',
                  boxShadow: 'none',
                  backgroundColor: 'transparent',
                }}
                contentSx={{ mt: 0 }}
              >
                <Box
                  sx={{
                    height: '100%',
                    border: '1px solid',
                    borderColor: alpha(accent, 0.24),
                    background: `linear-gradient(180deg, ${alpha(accent, 0.12)} 0%, ${alpha(theme.palette.background.paper, 1)} 68%)`,
                    borderRadius: 2,
                    p: 1.25,
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: 950, lineHeight: 1.15, mb: 1, fontSize: { xs: 16, sm: 17 } }} noWrap>
                    {card.title}
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 1.25, alignItems: 'start' }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Stack direction="row" spacing={1} alignItems="baseline" sx={{ flexWrap: 'wrap' }}>
                        <Typography sx={{ fontWeight: 950, fontSize: 52, lineHeight: 1, letterSpacing: -1.1 }} noWrap>
                          {card.value}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 850 }}>
                          {card.unit || ' '}
                        </Typography>
                      </Stack>
                    </Box>

                    <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                      {card.notes.map((t) => (
                        <Typography key={t} variant="caption" color="text.secondary" noWrap>
                          {t}
                        </Typography>
                      ))}
                    </Stack>
                  </Box>

                  <Box sx={{ mt: 'auto', pt: 1.25, minHeight: 34, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                    <Button size="small" variant="outlined" onClick={card.cta.onClick} sx={{ whiteSpace: 'nowrap' }}>
                      {card.cta.label}
                    </Button>
                    <Chip
                      size="small"
                      label={card.chip.label}
                      color={card.chip.color}
                      variant="filled"
                      sx={{
                        fontWeight: 900,
                        pointerEvents: 'none',
                        border: '1px solid',
                        borderColor: alpha(accent, 0.22),
                        backgroundColor: alpha(accent, theme.palette.mode === 'dark' ? 0.16 : 0.10),
                        color: alpha(accent, theme.palette.mode === 'dark' ? 0.95 : 0.90),
                      }}
                    />
                  </Box>
                </Box>
              </AppCard>
            </Box>
          )
        })}
      </Box>

      <AppCard
        title="设备状态总览"
        actions={
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="outlined" onClick={() => navigate('/chambers')} sx={{ whiteSpace: 'nowrap' }}>
              设备台账
            </Button>
            <Button size="small" variant="outlined" onClick={() => navigate('/timeline')} sx={{ whiteSpace: 'nowrap' }}>
              时间线
            </Button>
          </Stack>
        }
        sx={{ mt: 2 }}
        contentSx={{ mx: -2.5, mb: -2.5 }}
      >
        {isLoading ? (
          <Box sx={{ p: 2.5 }}>
            <LinearProgress />
          </Box>
        ) : assetsByCategory.length === 0 ? (
          <Box sx={{ p: 2.5 }}>
            <Typography color="text.secondary">暂无设备</Typography>
          </Box>
        ) : (
          <Box sx={{ px: 2.5, pb: 2.5 }}>
            <Stack spacing={1.25}>
              {assetsByCategory.map(([category, list]) => {
                const statusCounts = list.reduce(
                  (acc, a) => {
                    if (a.status === 'available') acc.available += 1
                    else if (a.status === 'in-use') acc.inUse += 1
                    else if (a.status === 'maintenance') acc.maintenance += 1
                    return acc
                  },
                  { available: 0, inUse: 0, maintenance: 0 }
                )

                return (
                  <Accordion key={category} defaultExpanded disableGutters elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Stack direction="row" spacing={1.25} alignItems="center" sx={{ width: '100%', pr: 1 }}>
                        <Typography sx={{ fontWeight: 900 }}>{category}</Typography>
                        <Chip size="small" label={`共 ${list.length}`} variant="outlined" sx={{ fontWeight: 800 }} />
                        <Box sx={{ flex: 1 }} />
                        <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
                          <Chip size="small" label={`可用 ${statusCounts.available}`} color="success" variant="outlined" />
                          <Chip size="small" label={`使用中 ${statusCounts.inUse}`} color="warning" variant="outlined" />
                          <Chip size="small" label={`维护 ${statusCounts.maintenance}`} color="error" variant="outlined" />
                        </Stack>
                      </Stack>
                    </AccordionSummary>
                    <AccordionDetails sx={{ pt: 0 }}>
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: {
                            xs: 'repeat(2, minmax(0, 1fr))',
                            sm: 'repeat(3, minmax(0, 1fr))',
                            md: 'repeat(4, minmax(0, 1fr))',
                            lg: 'repeat(6, minmax(0, 1fr))',
                            xl: 'repeat(8, minmax(0, 1fr))',
                          },
                          gap: 1.25,
                        }}
                      >
                        {list.map((asset) => {
                          const color =
                            asset.status === 'available'
                              ? theme.palette.success.main
                              : asset.status === 'in-use'
                                ? theme.palette.warning.main
                                : theme.palette.error.main

                          const occupancy = activeOccupancyByAssetId.get(asset.id)
                          const projectName = occupancy?.log.projectId ? projectNameById.get(occupancy.log.projectId) : undefined
                          const testProjectName = occupancy?.log.testProjectId ? testProjectNameById.get(occupancy.log.testProjectId) : undefined
                          const endText = occupancy ? formatDateTime(occupancy.log.endTime) : undefined
                          const nowMs = Date.now()
                          const isOverdue = occupancy ? Number.isFinite(occupancy.endMs) && occupancy.endMs < nowMs : false

                          const tooltip = occupancy ? (
                            <Box sx={{ p: 0.25 }}>
                              <Typography sx={{ fontWeight: 900 }}>{asset.name}</Typography>
                              <Typography variant="body2" sx={{ mt: 0.5 }}>
                                项目：{projectName ?? testProjectName ?? '-'}
                              </Typography>
                              <Typography variant="body2">使用人：{occupancy.log.user || '-'}</Typography>
                              <Typography variant="body2">开始：{formatDateTime(occupancy.log.startTime)}</Typography>
                              <Typography variant="body2">结束：{endText}</Typography>
                              {occupancy.log.notes ? (
                                <Typography variant="body2" sx={{ mt: 0.5, maxWidth: 360 }}>
                                  备注：{occupancy.log.notes}
                                </Typography>
                              ) : null}
                            </Box>
                          ) : null

                          const card = (
                            <Box
                              onClick={() => navigate(`/assets/${asset.id}`)}
                              sx={{
                                border: '1px solid',
                                borderColor: alpha(color, 0.26),
                                borderRadius: 2,
                                p: 1.1,
                                cursor: 'pointer',
                                height: 74,
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                backgroundColor: alpha(color, theme.palette.mode === 'dark' ? 0.22 : 0.14),
                                '&:hover': {
                                  borderColor: alpha(color, 0.48),
                                  boxShadow: `0 10px 22px ${alpha(color, theme.palette.mode === 'dark' ? 0.22 : 0.12)}`,
                                },
                              }}
                            >
                              <Typography sx={{ fontWeight: 950 }} noWrap>
                                  {asset.name}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                noWrap
                                sx={{
                                  mt: 0.25,
                                  visibility: occupancy && asset.status === 'in-use' ? 'visible' : 'hidden',
                                }}
                              >
                                {occupancy ? `结束：${endText}` : '占位'}
                              </Typography>
                            </Box>
                          )

                          return (
                            <Box key={asset.id}>
                              {tooltip ? (
                                <Tooltip
                                  title={tooltip}
                                  arrow
                                  placement="top-start"
                                  componentsProps={{
                                    tooltip: {
                                      sx: {
                                        bgcolor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.98 : 0.96),
                                        color: 'text.primary',
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        boxShadow: (theme) =>
                                          `0 12px 28px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.48 : 0.22)}`,
                                      },
                                    },
                                  }}
                                >
                                  {card}
                                </Tooltip>
                              ) : (
                                card
                              )}
                            </Box>
                          )
                        })}
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                )
              })}
            </Stack>
          </Box>
        )}
      </AppCard>
    </PageShell>
  )
}

export default DashboardPage
