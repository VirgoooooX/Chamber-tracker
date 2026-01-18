import React, { useState, useEffect } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'; // 新增
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'; // 新增
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'; // 新增
import { zhCN } from 'date-fns/locale'; // 新增
import { Chamber } from '../types';
import { addChamber, updateChamber } from '../store/chambersSlice';
import { useAppDispatch } from '../store/hooks'

interface ChamberFormProps {
  open: boolean;
  onClose: () => void;
  chamber?: Chamber;
}

const ChamberForm: React.FC<ChamberFormProps> = ({ open, onClose, chamber }) => {
  const dispatch = useAppDispatch()
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'available' | 'in-use' | 'maintenance'>('available');
  const [manufacturer, setManufacturer] = useState(''); // 新增
  const [model, setModel] = useState(''); // 新增
  const [calibrationDate, setCalibrationDate] = useState<Date | null>(null); // 新增
  // createdAt 通常在创建时由服务处理，或编辑时加载
  const [createdAt, setCreatedAt] = useState<Date>(new Date()); 

  // 表单验证
  const [errors, setErrors] = useState({
    name: false,
    manufacturer: false, // 新增
    model: false,       // 新增
  });

  useEffect(() => {
    if (chamber) {
      setName(chamber.name);
      setDescription(chamber.description || '');
      setStatus(chamber.status);
      setManufacturer(chamber.manufacturer || '');
      setModel(chamber.model || '');
      // Parse date strings back to Date objects
      setCalibrationDate(chamber.calibrationDate ? new Date(chamber.calibrationDate) : null);
      setCreatedAt(new Date(chamber.createdAt)); // createdAt will always be a string from the store
    } else {
      // 重置表单
      setName('');
      setDescription('');
      setStatus('available');
      setManufacturer(''); // 新增
      setModel(''); // 新增
      setCalibrationDate(null); // 新增
      setCreatedAt(new Date()); // 重置创建时间为当前
      setErrors({ name: false, manufacturer: false, model: false }); // 重置错误状态
    }
  }, [chamber, open]);

  const validateForm = () => { // 新增验证逻辑
    const newErrors = {
      name: !name,
      manufacturer: !manufacturer,
      model: !model,
    };
    setErrors(newErrors);
    return !(newErrors.name || newErrors.manufacturer || newErrors.model);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) { // 更新验证调用
      return;
    }
    
    const chamberData = {
      name,
      description: description || undefined,
      status,
      manufacturer, // 新增
      model, // 新增
      // Convert dates to ISO strings for serialization
      calibrationDate: calibrationDate ? calibrationDate.toISOString() : undefined,
      createdAt: (chamber ? createdAt : new Date()).toISOString(),
    };
    
    if (chamber && chamber.id) {
      dispatch(updateChamber({ id: chamber.id, chamber: chamberData as Partial<Chamber> }));
    } else {
      dispatch(addChamber(chamberData as Omit<Chamber, 'id'>));
    }
    
    onClose();
  };

  const handleStatusChange = (event: SelectChangeEvent) => {
    setStatus(event.target.value as 'available' | 'in-use' | 'maintenance');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth> {/* 调整宽度以容纳更多字段 */}
      <DialogTitle>{chamber ? '编辑环境箱' : '添加环境箱'}</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={zhCN}> {/* 新增 */}
            <Box display="flex" flexDirection="column" gap={3} paddingTop={1}> {/* 调整间距 */}
              <TextField
                label="名称"
                value={name}
                onChange={(e) => setName(e.target.value)}
                fullWidth
                required
                error={errors.name} // 新增
                helperText={errors.name ? '请输入名称' : ''} // 新增
              />
              
              <TextField
                label="描述"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                fullWidth
                multiline
                rows={3}
              />
              
              <FormControl fullWidth>
                <InputLabel>状态</InputLabel>
                <Select
                  value={status}
                  label="状态"
                  onChange={handleStatusChange}
                >
                  <MenuItem value="available">可用</MenuItem>
                  <MenuItem value="in-use">使用中</MenuItem>
                  <MenuItem value="maintenance">维护中</MenuItem>
                </Select>
              </FormControl>

              {/* 新增字段 */}
              <TextField
                label="厂商"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                fullWidth
                required
                error={errors.manufacturer}
                helperText={errors.manufacturer ? '请输入厂商' : ''}
              />
              <TextField
                label="型号"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                fullWidth
                required
                error={errors.model}
                helperText={errors.model ? '请输入型号' : ''}
              />
              <DateTimePicker
                label="校验日期"
                value={calibrationDate}
                onChange={(newValue) => setCalibrationDate(newValue)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                  }
                }}
              />
            </Box>
          </LocalizationProvider>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>取消</Button>
          <Button type="submit" variant="contained" color="primary">
            保存
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ChamberForm;
