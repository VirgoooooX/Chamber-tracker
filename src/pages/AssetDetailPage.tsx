import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Chip,
  Grid,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import PhotoIcon from '@mui/icons-material/Photo'
import QrCode2Icon from '@mui/icons-material/QrCode2'
import BadgeIcon from '@mui/icons-material/Badge'
import BuildCircleIcon from '@mui/icons-material/BuildCircle'
import ListAltIcon from '@mui/icons-material/ListAlt'
import { alpha, useTheme } from '@mui/material/styles'
import PageShell from '../components/PageShell'
import TitleWithIcon from '../components/TitleWithIcon'
import AppCard from '../components/AppCard'
import ConfirmDialog from '../components/ConfirmDialog'
import ChamberForm from '../components/ChamberForm'
import UsageLogDetails from '../components/UsageLogDetails'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { fetchAssetsByType, deleteAsset } from '../store/assetsSlice'
import { fetchUsageLogs } from '../store/usageLogsSlice'
import { fetchRepairTickets } from '../store/repairTicketsSlice'
import { fetchProjects } from '../store/projectsSlice'
import { fetchTestProjects } from '../store/testProjectsSlice'
import { getEffectiveUsageLogStatus } from '../utils/statusHelpers'
import type { UsageLog } from '../types'

type Props = {
  mode: 'create' | 'view'
}

const getStatusLabel = (status: string) => {
  if (status === 'available') return '可用'
  if (status === 'in-use') return '使用中'
  if (status === 'maintenance') return '维护中'
  return status
}

const getStatusColor = (status: string): 'default' | 'success' | 'warning' | 'error' => {
  if (status === 'available') return 'success'
  if (status === 'in-use') return 'warning'
  if (status === 'maintenance') return 'error'
  return 'default'
}

const formatDateTime = (value?: string) => {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString()
}

const AssetDetailPage: React.FC<Props> = ({ mode }) => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const theme = useTheme()
  const { assetId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()

  const role = useAppSelector((s) => s.auth.user?.role)
  const isAdmin = role === 'admin'

  const assetsLoading = useAppSelector((s) => s.assets.loading)
  const assetsError = useAppSelector((s) => s.assets.error)
  const assets = useAppSelector((s) => s.assets.assets)

  const usageLogs = useAppSelector((s) => s.usageLogs.usageLogs)
  const usageLogsLoading = useAppSelector((s) => s.usageLogs.loading)
  const repairTickets = useAppSelector((s) => s.repairTickets.tickets)
  const repairLoading = useAppSelector((s) => s.repairTickets.loading)

  const projects = useAppSelector((s) => s.projects.projects)
  const testProjects = useAppSelector((s) => s.testProjects.testProjects)

  const [editOpen, setEditOpen] = useState(mode === 'create')
  const [pendingDelete, setPendingDelete] = useState(false)
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null)

  useEffect(() => {
    dispatch(fetchAssetsByType('chamber'))
    dispatch(fetchUsageLogs())
    dispatch(fetchRepairTickets(undefined))
    dispatch(fetchProjects())
    dispatch(fetchTestProjects())
  }, [dispatch])

  useEffect(() => {
    if (mode !== 'view') return
    if (!isAdmin) return
    const shouldOpen = searchParams.get('edit') === '1'
    setEditOpen(shouldOpen)
  }, [isAdmin, mode, searchParams])

  const asset = useMemo(() => {
    if (mode === 'create') return undefined
    if (!assetId) return undefined
    return assets.find((a) => a.id === assetId)
  }, [assetId, assets, mode])

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

  const relatedUsageLogs = useMemo(() => {
    if (!assetId || mode === 'create') return []
    return usageLogs
      .filter((l) => l.chamberId === assetId)
      .slice()
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
  }, [assetId, mode, usageLogs])

  const relatedRepairTickets = useMemo(() => {
    if (!assetId || mode === 'create') return []
    return repairTickets
      .filter((t) => t.assetId === assetId)
      .slice()
      .sort((a, b) => {
        const aTime = new Date(a.updatedAt ?? a.createdAt).getTime()
        const bTime = new Date(b.updatedAt ?? b.createdAt).getTime()
        return bTime - aTime
      })
  }, [assetId, mode, repairTickets])

  const handleCloseEdit = () => {
    setEditOpen(false)
    if (mode === 'view') {
      const next = new URLSearchParams(searchParams)
      next.delete('edit')
      setSearchParams(next, { replace: true })
    }
  }

  const handleSaved = (savedId: string) => {
    if (mode === 'create') {
      navigate(`/assets/${savedId}`, { replace: true })
      setEditOpen(false)
      return
    }
    handleCloseEdit()
  }

  const handleDelete = async () => {
    if (!assetId) return
    await dispatch(deleteAsset(assetId))
    navigate('/chambers')
  }

  const titleText = mode === 'create' ? '新增设备' : asset?.name ?? (assetId ? `设备 ${assetId.slice(0, 8)}` : '设备详情')

  return (
    <PageShell
      title={<TitleWithIcon icon={<BadgeIcon />}>{titleText}</TitleWithIcon>}
      maxWidth="xl"
      actions={
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Button size="small" variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)}>
            返回
          </Button>
          {mode === 'view' ? (
            <>
              <Chip
                size="small"
                label={asset ? getStatusLabel(asset.status) : '加载中'}
                color={asset ? getStatusColor(asset.status) : 'default'}
                variant={asset ? 'filled' : 'outlined'}
                sx={{ fontWeight: 800 }}
              />
              {isAdmin ? (
                <>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<EditIcon />}
                    onClick={() => {
                      const next = new URLSearchParams(searchParams)
                      next.set('edit', '1')
                      setSearchParams(next, { replace: true })
                      setEditOpen(true)
                    }}
                    disabled={!asset}
                  >
                    编辑
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => setPendingDelete(true)}
                    disabled={!asset}
                  >
                    删除
                  </Button>
                </>
              ) : null}
            </>
          ) : null}
        </Stack>
      }
    >
      {assetsLoading ? <LinearProgress sx={{ mb: 2 }} /> : null}
      {assetsError ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          加载设备失败：{assetsError}
        </Alert>
      ) : null}

      {mode === 'view' && !asset && !assetsLoading ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          未找到该设备，可能已被删除或无权限访问。
        </Alert>
      ) : null}

      <Grid container spacing={2}>
        <Grid item xs={12} lg={7}>
          <AppCard title="基础信息">
            {!asset && mode === 'view' ? (
              <Typography color="text.secondary">暂无数据</Typography>
            ) : (
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    设备种类
                  </Typography>
                  <Typography sx={{ fontWeight: 850 }}>{asset?.category || '环境箱'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    资产号
                  </Typography>
                  <Typography sx={{ fontWeight: 850 }}>{asset?.assetCode || '-'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    SN
                  </Typography>
                  <Typography sx={{ fontWeight: 850 }}>{asset?.serialNumber || '-'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    位置
                  </Typography>
                  <Typography>{asset?.location || '-'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    厂商 / 型号
                  </Typography>
                  <Typography>{`${asset?.manufacturer || '-'} / ${asset?.model || '-'}`}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    负责人
                  </Typography>
                  <Typography>{asset?.owner || '-'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    标签
                  </Typography>
                  <Typography>{asset?.tags?.length ? asset.tags.join('，') : '-'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    校验日期
                  </Typography>
                  <Typography>{formatDateTime(asset?.calibrationDate)}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    更新时间
                  </Typography>
                  <Typography>{formatDateTime(asset?.updatedAt)}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    描述
                  </Typography>
                  <Typography>{asset?.description || '-'}</Typography>
                </Grid>
              </Grid>
            )}
          </AppCard>
        </Grid>

        <Grid item xs={12} lg={5}>
          <Stack spacing={2}>
            <AppCard title={<TitleWithIcon icon={<PhotoIcon />}>设备照片</TitleWithIcon>}>
              {asset?.photoUrls?.length ? (
                <Grid container spacing={1}>
                  {asset.photoUrls.slice(0, 6).map((url) => (
                    <Grid item xs={6} key={url}>
                      <Box
                        component="img"
                        src={url}
                        alt="设备照片"
                        sx={{
                          width: '100%',
                          aspectRatio: '4 / 3',
                          objectFit: 'cover',
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: 'divider',
                          backgroundColor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.35 : 0.8),
                        }}
                      />
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Box
                  sx={{
                    border: '1px dashed',
                    borderColor: alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.22 : 0.18),
                    borderRadius: 2,
                    p: 2.25,
                    textAlign: 'center',
                    backgroundColor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.25 : 0.35),
                  }}
                >
                  <Typography sx={{ fontWeight: 850 }}>暂无照片</Typography>
                </Box>
              )}
            </AppCard>

            <AppCard title={<TitleWithIcon icon={<QrCode2Icon />}>铭牌</TitleWithIcon>}>
              {asset?.nameplateUrls?.length ? (
                <Grid container spacing={1}>
                  {asset.nameplateUrls.slice(0, 6).map((url) => (
                    <Grid item xs={6} key={url}>
                      <Box
                        component="img"
                        src={url}
                        alt="铭牌"
                        sx={{
                          width: '100%',
                          aspectRatio: '4 / 3',
                          objectFit: 'cover',
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: 'divider',
                          backgroundColor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.35 : 0.8),
                        }}
                      />
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Box
                  sx={{
                    border: '1px dashed',
                    borderColor: alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.22 : 0.18),
                    borderRadius: 2,
                    p: 2.25,
                    textAlign: 'center',
                    backgroundColor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.25 : 0.35),
                  }}
                >
                  <Typography sx={{ fontWeight: 850 }}>暂无铭牌信息</Typography>
                </Box>
              )}
            </AppCard>
          </Stack>
        </Grid>

        <Grid item xs={12} lg={6}>
          <AppCard
            title={<TitleWithIcon icon={<BuildCircleIcon />}>维修记录</TitleWithIcon>}
            actions={
              <Button size="small" variant="outlined" onClick={() => navigate('/repairs')} sx={{ whiteSpace: 'nowrap' }}>
                打开维修管理
              </Button>
            }
          >
            {repairLoading ? (
              <LinearProgress />
            ) : relatedRepairTickets.length === 0 ? (
              <Typography color="text.secondary">暂无维修记录</Typography>
            ) : (
              <Stack spacing={1.25}>
                {relatedRepairTickets.slice(0, 8).map((t) => (
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
                      backgroundColor: (theme) => alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.35 : 0.6),
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 850 }} noWrap>
                        {t.problemDesc || '维修工单'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        更新时间：{formatDateTime(t.updatedAt ?? t.createdAt)}
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      label={t.status === 'quote-pending' ? '未询价' : t.status === 'repair-pending' ? '待维修' : '已完成'}
                      color={t.status === 'completed' ? 'success' : t.status === 'quote-pending' ? 'warning' : 'info'}
                    />
                  </Box>
                ))}
              </Stack>
            )}
          </AppCard>
        </Grid>

        <Grid item xs={12} lg={6}>
          <AppCard title={<TitleWithIcon icon={<ListAltIcon />}>使用记录</TitleWithIcon>}>
            {usageLogsLoading ? (
              <LinearProgress />
            ) : relatedUsageLogs.length === 0 ? (
              <Typography color="text.secondary">暂无使用记录</Typography>
            ) : (
              <Stack spacing={1.25}>
                {relatedUsageLogs.slice(0, 8).map((log) => {
                  const effectiveStatus = getEffectiveUsageLogStatus(log)
                  const projectName = log.projectId ? projectNameById.get(log.projectId) : undefined
                  const testProjectName = log.testProjectId ? testProjectNameById.get(log.testProjectId) : undefined
                  const label =
                    effectiveStatus === 'completed'
                      ? '已完成'
                      : effectiveStatus === 'in-progress'
                        ? '使用中'
                        : effectiveStatus === 'overdue'
                          ? '逾期'
                          : '未开始'

                  const color =
                    effectiveStatus === 'completed'
                      ? 'success'
                      : effectiveStatus === 'in-progress'
                        ? 'warning'
                        : effectiveStatus === 'overdue'
                          ? 'error'
                          : 'info'

                  return (
                    <Box
                      key={log.id}
                      onClick={() => setSelectedLogId(log.id)}
                      sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 2,
                        p: 1.25,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 1.5,
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.10 : 0.06),
                          borderColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.32 : 0.22),
                        },
                      }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 850 }} noWrap>
                          {projectName ?? testProjectName ?? '未关联项目'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {formatDateTime(log.startTime)} → {formatDateTime(log.endTime)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" noWrap>
                          使用人：{log.user || '-'}
                        </Typography>
                      </Box>
                      <Chip size="small" label={label} color={color as any} />
                    </Box>
                  )
                })}
              </Stack>
            )}
          </AppCard>
        </Grid>
      </Grid>

      <ChamberForm
        open={editOpen}
        onClose={handleCloseEdit}
        chamber={asset}
        onSaved={(saved) => handleSaved(saved.id)}
      />

      <UsageLogDetails open={Boolean(selectedLogId)} onClose={() => setSelectedLogId(null)} logId={selectedLogId} />

      <ConfirmDialog
        open={pendingDelete}
        title="确认删除"
        description="您确定要删除这个设备吗？此操作无法撤销。"
        onClose={() => setPendingDelete(false)}
        onConfirm={handleDelete}
      />
    </PageShell>
  )
}

export default AssetDetailPage
