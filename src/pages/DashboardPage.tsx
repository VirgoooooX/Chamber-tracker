import React, { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  LinearProgress,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import AssessmentIcon from '@mui/icons-material/Assessment'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import EventAvailableIcon from '@mui/icons-material/EventAvailable'
import BuildCircleIcon from '@mui/icons-material/BuildCircle'
import SpeedIcon from '@mui/icons-material/Speed'
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

type RangePreset = '7d' | '30d' | '90d' | 'custom'

const formatPercent = (value: number) => `${Math.round(value * 100)}%`

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
        p: 2,
        minHeight: 110,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
        <Stack spacing={0.25}>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 650 }}>
            {label}
          </Typography>
          <Typography variant="h4" sx={{ lineHeight: 1.05 }}>
            {value}
          </Typography>
        </Stack>
        <Box
          sx={{
            width: 44,
            height: 44,
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

      <Grid container spacing={2} sx={{ mt: preset === 'custom' ? 2 : 0 }}>
        <Grid item xs={12} sm={6} md={3}>
          <KpiTile label="设备总数" value={kpis.totalAssets} icon={<AssessmentIcon />} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiTile label="可用" value={kpis.statusCounts.available} icon={<EventAvailableIcon />} tone="success" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiTile label="使用中" value={kpis.statusCounts['in-use']} icon={<SpeedIcon />} tone="warning" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiTile label="维护中" value={kpis.statusCounts.maintenance} icon={<BuildCircleIcon />} tone="error" />
        </Grid>

        <Grid item xs={12} md={6}>
          <KpiTile
            label="使用率"
            value={utilizationText}
            icon={<SpeedIcon />}
            footer={
              <Box>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, Math.round(kpis.utilization.ratio * 100))}
                  sx={{
                    height: 8,
                    borderRadius: 999,
                    backgroundColor: alpha(theme.palette.primary.main, 0.14),
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 999,
                    },
                  }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                  统计口径：按设备合并占用时段后计算
                </Typography>
              </Box>
            }
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <KpiTile
            label="超时/逾期"
            value={kpis.overdueActiveCount}
            icon={<ErrorOutlineIcon />}
            tone={kpis.overdueActiveCount > 0 ? 'error' : 'default'}
            footer={
              <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary">
                  时间窗内出现的逾期记录数量
                </Typography>
                <Chip
                  size="small"
                  label={isLoading ? '加载中' : '已更新'}
                  color={isLoading ? 'default' : 'success'}
                  variant={isLoading ? 'outlined' : 'filled'}
                />
              </Stack>
            }
          />
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mt: 2 }}>
        <Grid item xs={12} md={6}>
          <AppCard
            title="维修追踪"
            actions={
              <Button
                size="small"
                variant="outlined"
                onClick={() => navigate('/repairs')}
                sx={{ whiteSpace: 'nowrap' }}
              >
                进入维修管理
              </Button>
            }
          >
            <Stack spacing={1.25}>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Chip
                  label={isRepairLoading ? '未询价: 加载中' : `未询价: ${repairStats.quotePending}`}
                  color={repairStats.quotePending > 0 ? 'warning' : 'default'}
                  sx={{ fontWeight: 650 }}
                />
                <Chip
                  label={isRepairLoading ? '待维修: 加载中' : `待维修: ${repairStats.repairPending}`}
                  color={repairStats.repairPending > 0 ? 'info' : 'default'}
                  sx={{ fontWeight: 650 }}
                />
                <Chip
                  label={isRepairLoading ? '本周完成: 加载中' : `本周完成: ${repairStats.completedThisWeek}`}
                  variant="outlined"
                  sx={{ fontWeight: 650 }}
                />
              </Stack>

              {isRepairLoading ? (
                <LinearProgress />
              ) : urgentOpenRepairs.length === 0 ? (
                <Typography color="text.secondary">暂无待处理的维修工单</Typography>
              ) : (
                urgentOpenRepairs.map((t) => (
                  <Box
                    key={t.id}
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                      p: 1.25,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 1.5,
                      backgroundColor: (theme) =>
                        alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.35 : 0.6),
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 800 }} noWrap>
                        {assetNameById.get(t.assetId) || t.assetId.slice(0, 8)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {t.problemDesc || '-'}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip
                        size="small"
                        label={t.status === 'quote-pending' ? '未询价' : '待维修'}
                        color={t.status === 'quote-pending' ? 'warning' : 'info'}
                      />
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => navigate('/repairs')}
                        sx={{ whiteSpace: 'nowrap' }}
                      >
                        处理
                      </Button>
                    </Stack>
                  </Box>
                ))
              )}
            </Stack>
          </AppCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <AppCard title={`校准到期提醒（≤${kpis.calibrationDueSoon.daysThreshold}天）`}>
            <Stack spacing={1}>
              {kpis.calibrationDueSoon.count === 0 ? (
                <Typography color="text.secondary">暂无即将到期的校准</Typography>
              ) : (
                kpis.calibrationDueSoon.assets.map((asset) => (
                  <Box
                    key={asset.id}
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                      p: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 1.5,
                    }}
                  >
                    <Box>
                      <Typography sx={{ fontWeight: 750 }}>{asset.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {asset.calibrationDate ? new Date(asset.calibrationDate).toLocaleString() : '未知'}
                      </Typography>
                    </Box>
                    <Chip size="small" label="需处理" color="warning" />
                  </Box>
                ))
              )}
            </Stack>
          </AppCard>
        </Grid>
      </Grid>
    </PageShell>
  )
}

export default DashboardPage
