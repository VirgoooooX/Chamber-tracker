// src/components/UsageLogForm.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button,
  FormControl, InputLabel, Select, MenuItem, SelectChangeEvent, Box,
  FormHelperText, CircularProgress, Alert, Chip, OutlinedInput, Checkbox,
  ListItemText as MuiListItemText, // Renamed to avoid conflict
} from '@mui/material';
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { zhCN } from 'date-fns/locale';
import { addHours, parseISO, isValid as isValidDate } from 'date-fns';

import { UsageLog, Project, TestProject, Config as ConfigType, Chamber } from '../types';
import { addUsageLog, updateUsageLog } from '../store/usageLogsSlice';
import { fetchProjects } from '../store/projectsSlice';
import { fetchTestProjects } from '../store/testProjectsSlice';
import { fetchChambers } from '../store/chambersSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks'

// 重新添加 MenuProps 常量定义
const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

interface UsageLogFormProps {
  open: boolean;
  onClose: (success?: boolean) => void;
  log?: UsageLog;
  // initialChamberId?: string;
}

const UsageLogForm: React.FC<UsageLogFormProps> = ({ open, onClose, log }) => {
  const dispatch = useAppDispatch()

  const { projects, loading: loadingProjects, error: projectsError } = useAppSelector((state) => state.projects)
  const { testProjects, loading: loadingAllTestProjects, error: testProjectsError } = useAppSelector((state) => state.testProjects)
  const { chambers, loading: loadingChambers, error: chambersError } = useAppSelector((state) => state.chambers)

  // --- Form State ---
  const [selectedChamberId, setSelectedChamberId] = useState<string>('');
  const [actualProjectId, setActualProjectId] = useState<string>('');      
  const [actualTestProjectId, setActualTestProjectId] = useState<string>(''); 
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [user, setUser] = useState(''); 
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<UsageLog['status']>('not-started');
  const [tempSelectedProjectIdForCascading, setTempSelectedProjectIdForCascading] = useState<string>(''); 
  const [tempSelectedConfigs, setTempSelectedConfigs] = useState<string[]>([]); // 用于 UI 多选 Configs
  const [tempSelectedWaterfall, setTempSelectedWaterfall] = useState<string>('');   // 用于 UI 单选 Waterfall

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formSubmitError, setFormSubmitError] = useState<string | null>(null);

  const [availableConfigs, setAvailableConfigs] = useState<ConfigType[]>([]);
  const [availableWaterfalls, setAvailableWaterfalls] = useState<string[]>([]);

  // --- Data Fetching Effect ---
  useEffect(() => {
     if (open) {
      dispatch(fetchChambers());
      dispatch(fetchProjects());
      dispatch(fetchTestProjects());
    }
  }, [open, dispatch]);

  // --- Form Initialization & Reset ---
  useEffect(() => {
    if (open) {
      setFormSubmitError(null);
      setErrors({});
      if (log) { // Edit mode
        setSelectedChamberId(log.chamberId || (chambers.length > 0 ? chambers[0].id : ''));
        setTempSelectedProjectIdForCascading(log.projectId || ''); 
        setActualProjectId(log.projectId || '');
        setActualTestProjectId(log.testProjectId || ''); 
        setTempSelectedConfigs([]); 
        setTempSelectedWaterfall('');
        setStartTime(log.startTime ? parseISO(log.startTime) : new Date());
        setEndTime(log.endTime ? parseISO(log.endTime) : null);
        setUser(log.user || '');
        setNotes(log.notes || '');
        setStatus(log.status || 'not-started');
      } else { // Add mode
        setSelectedChamberId(chambers.length > 0 ? chambers[0].id : '');
        setTempSelectedProjectIdForCascading('');
        setActualProjectId('');
        setActualTestProjectId('');
        setTempSelectedConfigs([]);
        setTempSelectedWaterfall('');
        setStartTime(new Date());
        setEndTime(null);
        setUser(''); 
        setNotes('');
        setStatus('not-started');
      }
    }
  }, [log, open, chambers]);

  // --- Update dependent dropdown options ---
  useEffect(() => {
    if (tempSelectedProjectIdForCascading) {
      const currentProject = projects.find(p => p.id === tempSelectedProjectIdForCascading);
      if (currentProject) {
        setAvailableConfigs(currentProject.configs || []);
        setAvailableWaterfalls(currentProject.wfs || []);
      } else {
        setAvailableConfigs([]); setAvailableWaterfalls([]);
      }
      setTempSelectedConfigs([]); 
      setTempSelectedWaterfall('');
    } else {
      setAvailableConfigs([]);
      setAvailableWaterfalls([]);
      setTempSelectedConfigs([]); 
      setTempSelectedWaterfall('');
    }
  }, [tempSelectedProjectIdForCascading, projects]);

  // --- Auto-calculate End Time ---
  useEffect(() => {
    if (startTime && actualTestProjectId) {
      const testProject = testProjects.find(tp => tp.id === actualTestProjectId); 
      if (testProject && typeof testProject.duration === 'number' && testProject.duration > 0) {
        setEndTime(addHours(startTime, testProject.duration));
      } else {
         setEndTime(null);
      }
    } else if (!actualTestProjectId && startTime) {
        setEndTime(null);
    }
  }, [startTime, actualTestProjectId, testProjects]);

  // --- Event Handlers ---
  const handleProjectDropdownChange = (event: SelectChangeEvent<string>) => {
    const newProjectId = event.target.value;
    setTempSelectedProjectIdForCascading(newProjectId); 
    setActualProjectId(newProjectId);                
    setActualTestProjectId(''); // Reset test project when main project changes
    setEndTime(null);     
  };
  
  const handleTempConfigChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setTempSelectedConfigs(typeof value === 'string' ? value.split(',') : value);
  };

  // --- Validation ---
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!selectedChamberId) newErrors.chamberId = "请选择环境箱";
    if (!actualProjectId) newErrors.project = "请选择项目名（用于关联）"; 
    if (!startTime) newErrors.startTime = "请选择开始时间";
    if (!endTime) newErrors.endTime = "请选择或等待自动计算结束时间"; 
    if (startTime && endTime && endTime < startTime) newErrors.endTime = "结束时间不能早于开始时间";
    if (!user.trim()) newErrors.user = "请输入使用人";
    if (!status) newErrors.status = "请选择状态";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // --- Submission ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitError(null);
    if (!validateForm()) return;

    // Data to be saved, now including selectedConfigIds and selectedWaterfall
    const usageLogPayload: Omit<UsageLog, 'id' | 'createdAt'> = {
      chamberId: selectedChamberId,
      projectId: actualProjectId || undefined,
      testProjectId: actualTestProjectId || undefined,
      startTime: startTime!.toISOString(),
      endTime: endTime ? endTime.toISOString() : undefined,
      user: user.trim(),
      status,
      notes: notes.trim() || undefined,
      selectedConfigIds: tempSelectedConfigs.length > 0 ? tempSelectedConfigs : undefined, // Add this line
      selectedWaterfall: tempSelectedWaterfall || undefined, // Add this line
    };

    try {
      if (log && log.id) {
        await dispatch(updateUsageLog({ id: log.id, log: usageLogPayload })).unwrap();
      } else {
        await dispatch(addUsageLog(usageLogPayload)).unwrap();
      }
      onClose(true);
    } catch (error: any) {
      console.error('提交使用记录失败:', error);
      setFormSubmitError(error.message || '操作失败，请稍后再试。');
    }
  };

  const isLoadingInitialData = loadingChambers || loadingProjects || loadingAllTestProjects;

  return (
    <Dialog open={open} onClose={() => onClose()} maxWidth="sm" fullWidth>
      <DialogTitle>{log ? '编辑使用记录' : '登记使用记录'}</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent dividers>
          {isLoadingInitialData && open && (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}><CircularProgress size={24} /> 加载选项...</Box>
          )}
          <Box display="flex" flexDirection="column" gap={2.5} paddingTop={1}>
            {/* 1. 环境箱选择 */}
            <FormControl fullWidth required error={!!errors.chamberId} disabled={isLoadingInitialData}>
               <InputLabel id="chamber-select-label">环境箱</InputLabel>
               <Select
                   labelId="chamber-select-label"
                   value={selectedChamberId}
                   label="环境箱"
                   onChange={(e) => setSelectedChamberId(e.target.value)}
               >
                   {chambers.length === 0 && <MenuItem disabled>暂无环境箱</MenuItem>}
                   {chambers.map((c) => (<MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>))}
               </Select>
               {errors.chamberId && <FormHelperText>{errors.chamberId}</FormHelperText>}
               {chambersError && <FormHelperText error>加载环境箱失败: {chambersError}</FormHelperText>}
            </FormControl>

            {/* 2. 项目名 */}
            <FormControl fullWidth required error={!!errors.project} disabled={isLoadingInitialData}>
               <InputLabel id="project-name-label">项目名 (用于关联)</InputLabel>
               <Select
                   labelId="project-name-label"
                   value={actualProjectId} 
                   label="项目名 (用于关联)"
                   onChange={handleProjectDropdownChange} 
               >
                   <MenuItem value=""><em>请选择项目</em></MenuItem>
                   {projects.map((p) => (<MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>))}
               </Select>
               {errors.project && <FormHelperText>{errors.project}</FormHelperText>}
               {projectsError && <FormHelperText error>加载项目失败: {projectsError}</FormHelperText>}
            </FormControl>

            {/* 3. 测试项目名 */}
            <FormControl fullWidth disabled={isLoadingInitialData || testProjects.length === 0}>
               <InputLabel id="test-project-name-label">测试项目名 (可选)</InputLabel>
               <Select
                   labelId="test-project-name-label"
                   value={actualTestProjectId} 
                   label="测试项目名 (可选)"
                   onChange={(e) => setActualTestProjectId(e.target.value)}
               >
                  <MenuItem value=""><em>无</em></MenuItem> {/* 保持“无”选项 */}
                  {testProjects.map((tp) => (<MenuItem key={tp.id} value={tp.id}>{tp.name}</MenuItem>))}
               </Select>
               {testProjectsError && <FormHelperText error>加载测试项目失败: {testProjectsError}</FormHelperText>}
               {testProjects.length === 0 && !loadingAllTestProjects && <FormHelperText>暂无可用测试项目</FormHelperText>}
            </FormControl>

            {/* 4. Config (复选, 辅助信息) */}
            <FormControl fullWidth disabled={isLoadingInitialData || !tempSelectedProjectIdForCascading || availableConfigs.length === 0}>
              <InputLabel id="config-multiselect-label">Config (可选, 辅助信息)</InputLabel>
              <Select
                labelId="config-multiselect-label"
                multiple
                value={tempSelectedConfigs}
                onChange={(e) => setTempSelectedConfigs(e.target.value as string[])} // 使用回调
                input={<OutlinedInput label="Config (可选, 辅助信息)" />}
                // 修复 renderValue 中的 JSX
                renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => {
                          const config = availableConfigs.find(c => c.id === value);
                          return <Chip key={value} label={config?.name || value} size="small" />;
                      })}
                    </Box>
                )}
                MenuProps={MenuProps} // 使用 MenuProps
              >
                 {availableConfigs.length === 0 && tempSelectedProjectIdForCascading && <MenuItem disabled>此项目无可用Config</MenuItem>}
                {availableConfigs.map((config) => (
                  <MenuItem key={config.id} value={config.id}>
                    <Checkbox checked={tempSelectedConfigs.indexOf(config.id) > -1} />
                    <MuiListItemText primary={config.name} secondary={config.remark} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* 5. WaterFall (单选, 辅助信息) */}
            <FormControl fullWidth disabled={isLoadingInitialData || !tempSelectedProjectIdForCascading || availableWaterfalls.length === 0}>
              <InputLabel id="waterfall-select-label">WaterFall (可选, 辅助信息)</InputLabel>
              <Select
                labelId="waterfall-select-label"
                value={tempSelectedWaterfall}
                label="WaterFall (可选, 辅助信息)"
                onChange={(e) => setTempSelectedWaterfall(e.target.value)} // 使用回调
              >
                <MenuItem value=""><em>无</em></MenuItem>
                {availableWaterfalls.length === 0 && tempSelectedProjectIdForCascading && <MenuItem disabled>此项目无可用WaterFall</MenuItem>}
                {availableWaterfalls.map((wf) => (<MenuItem key={wf} value={wf}>{wf}</MenuItem>))}
              </Select>
            </FormControl>

            {/* 6. 开始时间 */}
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={zhCN}>
                <DateTimePicker
                    label="开始时间"
                    value={startTime}
                    onChange={(newValue) => setStartTime(newValue)}
                    slotProps={{ textField: { fullWidth: true, required: true, error: !!errors.startTime, helperText: errors.startTime } }}
                />
            {/* 7. 结束时间 */}
                <DateTimePicker
                    label="结束时间"
                    value={endTime}
                    onChange={(newValue) => setEndTime(newValue)}
                    minDateTime={startTime || undefined} 
                    slotProps={{ textField: { fullWidth: true, required: true, error: !!errors.endTime, helperText: errors.endTime } }}
                />
            </LocalizationProvider>
            
            {/* 8. 使用人 */}
            <TextField
                label="使用人"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                fullWidth
                required
                error={!!errors.user}
                helperText={errors.user}
            />
            
            <FormControl fullWidth required error={!!errors.status}>
              <InputLabel id="status-select-label">状态</InputLabel>
              <Select
                labelId="status-select-label"
                value={status}
                label="状态"
                onChange={(e) => setStatus(e.target.value as UsageLog['status'])}
              >
                <MenuItem value="not-started">未开始</MenuItem>
                <MenuItem value="in-progress">进行中</MenuItem>
                <MenuItem value="completed">已完成</MenuItem>
                <MenuItem value="overdue">已超时</MenuItem>
              </Select>
              {errors.status && <FormHelperText>{errors.status}</FormHelperText>}
            </FormControl>

            <TextField label="备注" value={notes} onChange={(e) => setNotes(e.target.value)} fullWidth multiline rows={3}/>
            
            {formSubmitError && (<Alert severity="error" sx={{ mt: 1 }}>{formSubmitError}</Alert>)}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => onClose()}>取消</Button>
          <Button type="submit" variant="contained" color="primary">
            {log ? '保存更改' : '登记记录'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default UsageLogForm;
