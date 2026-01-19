// src/components/UsageLogDetails.tsx
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Divider, Chip, CircularProgress, List, ListItem, ListItemText as MuiListItemText,
  Paper, Tooltip, Alert,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import type { ChipProps } from '@mui/material';
import { UsageLog, Project, TestProject, Config as ConfigType } from '../types';
import { format, parseISO, isValid as isValidDate } from 'date-fns';
import { zhCN } from 'date-fns/locale';

import { fetchAssetsByType } from '../store/assetsSlice'
import { fetchProjects } from '../store/projectsSlice';
import { fetchTestProjects } from '../store/testProjectsSlice';
import { fetchUsageLogs, markLogAsCompleted } from '../store/usageLogsSlice';
import { getEffectiveUsageLogStatus } from '../utils/statusHelpers';
import { useAppDispatch, useAppSelector } from '../store/hooks'

interface UsageLogDetailsProps {
  open: boolean;
  onClose: () => void;
  logId: string | null;
}

const UsageLogDetails: React.FC<UsageLogDetailsProps> = ({ open, onClose, logId }) => {
  const dispatch = useAppDispatch()

  const { usageLogs, loading: loadingUsageLogsGlobal, error: errorUsageLogs } = useAppSelector((state) => state.usageLogs)
  const { assets: chambers, loading: loadingChambersGlobal, error: errorChambers } = useAppSelector((state) => state.assets)
  const { projects, loading: loadingProjectsGlobal, error: errorProjects } = useAppSelector((state) => state.projects)
  const { testProjects, loading: loadingTestProjectsGlobal, error: errorTestProjects } = useAppSelector((state) => state.testProjects)

  const [currentLog, setCurrentLog] = useState<UsageLog | null>(null);
  const [chamberName, setChamberName] = useState<string>('');
  const [linkedProject, setLinkedProject] = useState<Project | null>(null);
  const [linkedTestProject, setLinkedTestProject] = useState<TestProject | null>(null);
  const [selectedConfigsDetails, setSelectedConfigsDetails] = useState<ConfigType[]>([]);
  const [internalProcessing, setInternalProcessing] = useState<boolean>(false);
  const [effectiveStatus, setEffectiveStatus] = useState<UsageLog['status'] | null>(null);
  const [displayError, setDisplayError] = useState<string | null>(null);

  // Effect 1: Trigger data fetching for the specific log and auxiliary data
  useEffect(() => {
    if (open && logId) {
      const logExistsInStore = usageLogs.some(l => l.id === logId);

      if ((usageLogs.length === 0 || !logExistsInStore) && !loadingUsageLogsGlobal) {
        dispatch(fetchUsageLogs());
      }

      if (chambers.length === 0 && !loadingChambersGlobal) {
        dispatch(fetchAssetsByType('chamber'));
      }
      if (projects.length === 0 && !loadingProjectsGlobal) {
        dispatch(fetchProjects());
      }
      if (testProjects.length === 0 && !loadingTestProjectsGlobal) {
        dispatch(fetchTestProjects());
      }
    }
  }, [
    open,
    logId,
    dispatch,
    usageLogs, // Keep usageLogs to re-check logExistsInStore if usageLogs array changes
    chambers.length, projects.length, testProjects.length, // Check if empty
    loadingUsageLogsGlobal, loadingChambersGlobal, loadingProjectsGlobal, loadingTestProjectsGlobal
  ]);

  // Effect 2: Process data and set local state
  useEffect(() => {
    if (!open || !logId) {
      // Reset states if dialog is closed or no logId
      setCurrentLog(null); setEffectiveStatus(null); setChamberName('');
      setLinkedProject(null); setLinkedTestProject(null); setSelectedConfigsDetails([]);
      setInternalProcessing(false); setDisplayError(null);
      return;
    }

    const anyGlobalDataLoading = loadingUsageLogsGlobal || loadingChambersGlobal || loadingProjectsGlobal || loadingTestProjectsGlobal;

    if (anyGlobalDataLoading) {
      setInternalProcessing(true);
      return;
    }

    // All global loads are false.
    setInternalProcessing(true);
    setDisplayError(null);

    const foundLog = usageLogs.find(l => l.id === logId);

    if (foundLog) {
      setCurrentLog(foundLog);
      setEffectiveStatus(getEffectiveUsageLogStatus(foundLog));
      // ... (rest of the logic to find chamber, project, testProject, configs)
        const foundChamber = chambers.find(c => c.id === foundLog.chamberId);
        setChamberName(foundChamber ? foundChamber.name : (foundLog.chamberId ? `ID: ${foundLog.chamberId}`: '未知'));

        if (foundLog.projectId) {
            const foundProject = projects.find(p => p.id === foundLog.projectId);
            setLinkedProject(foundProject || null);
            if (foundProject && foundLog.selectedConfigIds && foundLog.selectedConfigIds.length > 0) {
                const configsFromProject = foundProject.configs || [];
                setSelectedConfigsDetails(
                    foundLog.selectedConfigIds
                        .map(configId => configsFromProject.find(c => c.id === configId))
                        .filter((c): c is ConfigType => c !== undefined)
                );
            } else {
                setSelectedConfigsDetails([]);
            }
        } else {
            setLinkedProject(null);
            setSelectedConfigsDetails([]);
        }

        if (foundLog.testProjectId) {
            const foundTestProject = testProjects.find(tp => tp.id === foundLog.testProjectId);
            setLinkedTestProject(foundTestProject || null);
        } else {
            setLinkedTestProject(null);
        }
    } else {
      // Log not found, but global loading is complete for usageLogs.
      if (!loadingUsageLogsGlobal) { // Double check usageLogs are not still loading
          setCurrentLog(null); setEffectiveStatus(null); setChamberName('');
          setLinkedProject(null); setLinkedTestProject(null); setSelectedConfigsDetails([]);
          setDisplayError(`未找到记录 (ID: ${logId})。`);
      } else {
          // This case implies usageLogs are still loading, so the outer 'anyGlobalDataLoading' should have caught it.
          // However, as a fallback, keep internalProcessing true.
          // console.log("[DetailsEffect2] Log not found, but usageLogsGlobal still loading? This shouldn't happen often here.");
      }
    }
    setInternalProcessing(false);

  }, [
    open, logId,
    usageLogs, chambers, projects, testProjects, // Data arrays themselves
    loadingUsageLogsGlobal, loadingChambersGlobal, loadingProjectsGlobal, loadingTestProjectsGlobal
  ]);

  // ... (formatDate, getStatusChipProperties, handleMarkAsCompleted)
  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return 'N/A';
    const date = parseISO(dateString);
    return isValidDate(date) ? format(date, 'yyyy-MM-dd HH:mm', { locale: zhCN }) : '无效日期';
  };

  const getStatusChipProperties = (status: UsageLog['status'] | null): { label: string; color: ChipProps['color'] } => {
    if (!status && open && internalProcessing) return { label: '处理中...', color: 'default' };
    if (!status) return {label: '', color: 'default'};
    switch (status) {
      case 'completed': return { label: '已完成', color: 'success' };
      case 'in-progress': return { label: '进行中', color: 'warning' };
      case 'not-started': return { label: '未开始', color: 'primary' };
      case 'overdue': return { label: '已超时', color: 'error' };
      default: return { label: '未知', color: 'default' };
    }
  };

  const handleMarkAsCompleted = () => {
    if (currentLog && currentLog.id) {
      if (window.confirm(`确定要将此记录标记为 "已完成" 吗？`)) {
        dispatch(markLogAsCompleted(currentLog.id));
      }
    }
  };

  const anyGlobalError = errorUsageLogs || errorChambers || errorProjects || errorTestProjects;
  const showLoadingSpinner = open && (loadingUsageLogsGlobal || loadingChambersGlobal || loadingProjectsGlobal || loadingTestProjectsGlobal || internalProcessing);

  let dialogInnerContent;
    // ... (render logic for dialogInnerContent based on showLoadingSpinner, anyGlobalError, displayError, currentLog - kept similar to your last version)
   if (showLoadingSpinner) {
    dialogInnerContent = ( <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}> <CircularProgress /> <Typography sx={{ ml: 2 }}>正在加载详情...</Typography> </Box> );
  } else if (open && (anyGlobalError || displayError)) {
    dialogInnerContent = ( <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '300px', p:2, textAlign: 'center' }}> <Alert severity="error" sx={{mb: 2}}>加载详情时出错。</Alert> <Typography variant="body2" color="text.secondary"> {anyGlobalError || displayError} </Typography> </Box> );
  } else if (open && !currentLog && logId) {
    dialogInnerContent = ( <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}> <Typography color="text.secondary">未找到指定的记录 (ID: {logId})。</Typography> </Box> );
  } else if (currentLog && effectiveStatus) {
    const statusProps = getStatusChipProperties(effectiveStatus);
    dialogInnerContent = ( /* ... your existing JSX for displaying log details ... */ <Box p={2}> <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}> <Box sx={{ width: '100%' }}> <Box display="flex" justifyContent="space-between" alignItems="center"> <Typography variant="h5" component="div">{chamberName}</Typography> <Chip label={statusProps.label} color={statusProps.color} /> </Box> </Box> <Box sx={{ width: '100%' }}><Divider /></Box> <Box sx={{ width: '100%', maxWidth: { xs: '100%', sm: '48%' } }}> <Typography variant="subtitle2" gutterBottom>使用人</Typography> <Typography variant="body1">{currentLog.user}</Typography> </Box> <Box sx={{ width: '100%', maxWidth: { xs: '100%', sm: '48%' } }}> <Typography variant="subtitle2" gutterBottom>使用时间</Typography> <Typography variant="body1"> {`${formatDate(currentLog.startTime)} 至 ${formatDate(currentLog.endTime)}`} </Typography> </Box> </Box> <Paper elevation={1} sx={{ p: 2, mb: 2 }}> <Typography variant="h6" gutterBottom> 关联项目: {linkedProject ? linkedProject.name : (currentLog.projectId ? `ID: ${currentLog.projectId}` : '无')} </Typography> {linkedProject?.customerName && ( <Typography variant="body2" color="textSecondary" gutterBottom>客户: {linkedProject.customerName}</Typography> )} </Paper> <Paper elevation={1} sx={{ p: 2, mb: 2 }}> <Typography variant="h6" gutterBottom>使用的 Config(s)</Typography> {selectedConfigsDetails.length > 0 ? ( <List dense disablePadding> {selectedConfigsDetails.map((config) => ( <ListItem key={config.id} disableGutters dense sx={{ pt: 0, pb: 0.5 }}> <MuiListItemText primary={config.name} secondary={config.remark || '无备注'} primaryTypographyProps={{ variant: 'body2', fontWeight: 'medium' }} secondaryTypographyProps={{ variant: 'caption' }} /> </ListItem> ))} </List> ) : ( <Typography variant="body2" color="text.secondary">此记录未指定 Config。</Typography> )} </Paper> <Paper elevation={1} sx={{ p: 2, mb: 2 }}> <Typography variant="h6" gutterBottom>使用的 WaterFall</Typography> {currentLog.selectedWaterfall ? ( <Chip label={currentLog.selectedWaterfall} size="small" color="secondary" variant="outlined"/> ) : ( <Typography variant="body2" color="text.secondary">此记录未指定 WaterFall。</Typography> )} </Paper> <Paper elevation={1} sx={{ p: 2, mb: 2 }}> <Typography variant="h6" gutterBottom> 关联测试项目: {linkedTestProject ? linkedTestProject.name : (currentLog.testProjectId ? `ID: ${currentLog.testProjectId}` : '无')} </Typography> {linkedTestProject && ( <> <Divider sx={{ my: 1 }} /> <Typography variant="subtitle1" gutterBottom sx={{ mt: 1 }}>测试参数:</Typography> <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1 }}> <Box sx={{ flexBasis: 'calc(33.33% - 16px)'}}> <Typography variant="subtitle2">温度:</Typography> <Typography variant="body1">{linkedTestProject.temperature}°C</Typography> </Box> <Box sx={{ flexBasis: 'calc(33.33% - 16px)'}}> <Typography variant="subtitle2">湿度:</Typography> <Typography variant="body1">{linkedTestProject.humidity}%</Typography> </Box> <Box sx={{ flexBasis: 'calc(33.33% - 16px)'}}> <Typography variant="subtitle2">持续时间:</Typography> <Typography variant="body1">{linkedTestProject.duration}小时</Typography> </Box> </Box> </> )} </Paper> {currentLog.notes ? ( <Paper elevation={1} sx={{ p: 2, mt: 2 }}> <Typography variant="subtitle2" gutterBottom>使用记录备注</Typography> <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}> {currentLog.notes} </Typography> </Paper> ) : ( <Typography variant="body2" color="text.secondary" sx={{mt: 2}}>无使用记录备注。</Typography> )} </Box> );
  } else {
    if (open && !logId) { dialogInnerContent = <Typography sx={{p:2}}>错误：未提供记录ID。</Typography>; }
    else if (open) { dialogInnerContent = <Typography sx={{p:2}}>数据准备中或记录不存在...</Typography>; }
    else { dialogInnerContent = null; }
  }


  if (!open) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
       <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
         使用记录详情
         {currentLog && (effectiveStatus === 'in-progress' || effectiveStatus === 'overdue') && (
            <Tooltip title="标记为已完成">
              <Button variant="outlined" color="success" startIcon={<CheckCircleOutlineIcon />} onClick={handleMarkAsCompleted} size="small" >
                标记完成
              </Button>
            </Tooltip>
          )}
       </DialogTitle>
       <DialogContent dividers>
         {dialogInnerContent}
       </DialogContent>
       <DialogActions>
         <Button onClick={onClose} color="primary">关闭</Button>
       </DialogActions>
    </Dialog>
  );
};

export default UsageLogDetails;
