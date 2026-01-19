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
  Stack,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'; // 新增
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'; // 新增
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'; // 新增
import { zhCN } from 'date-fns/locale'; // 新增
import { Asset, AssetStatus } from '../types'
import { addAsset, updateAsset } from '../store/assetsSlice'
import { useAppDispatch } from '../store/hooks'

interface ChamberFormProps {
  open: boolean;
  onClose: () => void;
  chamber?: Asset;
}

const ChamberForm: React.FC<ChamberFormProps> = ({ open, onClose, chamber }) => {
  const dispatch = useAppDispatch()
  const [assetCode, setAssetCode] = useState('')
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<AssetStatus>('available')
  const [manufacturer, setManufacturer] = useState(''); // 新增
  const [model, setModel] = useState(''); // 新增
  const [calibrationDate, setCalibrationDate] = useState<Date | null>(null); // 新增
  const [location, setLocation] = useState('')

  // 表单验证
  const [errors, setErrors] = useState({
    assetCode: false,
    name: false,
    manufacturer: false, // 新增
    model: false,       // 新增
    location: false,
  });

  useEffect(() => {
    if (chamber) {
      setAssetCode(chamber.assetCode || '')
      setName(chamber.name);
      setDescription(chamber.description || '');
      setStatus(chamber.status);
      setManufacturer(chamber.manufacturer || '');
      setModel(chamber.model || '');
      // Parse date strings back to Date objects
      setCalibrationDate(chamber.calibrationDate ? new Date(chamber.calibrationDate) : null);
      setLocation(chamber.location || '')
    } else {
      // 重置表单
      setAssetCode('')
      setName('');
      setDescription('');
      setStatus('available');
      setManufacturer(''); // 新增
      setModel(''); // 新增
      setCalibrationDate(null); // 新增
      setLocation('')
      setErrors({ assetCode: false, name: false, manufacturer: false, model: false, location: false }); // 重置错误状态
    }
  }, [chamber, open]);

  const validateForm = () => { // 新增验证逻辑
    const newErrors = {
      assetCode: !assetCode.trim(),
      name: !name,
      manufacturer: !manufacturer,
      model: !model,
      location: !location.trim(),
    };
    setErrors(newErrors);
    return !(newErrors.assetCode || newErrors.name || newErrors.manufacturer || newErrors.model || newErrors.location);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) { // 更新验证调用
      return;
    }
    
    const chamberData: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'> = {
      type: 'chamber',
      assetCode: assetCode.trim(),
      name,
      description: description || undefined,
      status,
      location: location.trim(),
      manufacturer, // 新增
      model, // 新增
      // Convert dates to ISO strings for serialization
      calibrationDate: calibrationDate ? calibrationDate.toISOString() : undefined,
    };
    
    if (chamber && chamber.id) {
      dispatch(
        updateAsset({
          id: chamber.id,
          changes: {
            assetCode: chamberData.assetCode,
            name: chamberData.name,
            description: chamberData.description,
            status: chamberData.status,
            location: chamberData.location,
            manufacturer: chamberData.manufacturer,
            model: chamberData.model,
            calibrationDate: chamberData.calibrationDate,
          },
        })
      )
    } else {
      dispatch(addAsset(chamberData))
    }
    
    onClose();
  };

  const handleStatusChange = (event: SelectChangeEvent) => {
    setStatus(event.target.value as AssetStatus)
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth> {/* 调整宽度以容纳更多字段 */}
      <DialogTitle>{chamber ? '编辑设备' : '新增设备'}</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent dividers>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={zhCN}> {/* 新增 */}
            <Stack spacing={2.5} sx={{ pt: 1 }}>
              <TextField
                label="资产号"
                value={assetCode}
                onChange={(e) => setAssetCode(e.target.value)}
                fullWidth
                required
                error={errors.assetCode}
                helperText={errors.assetCode ? '请输入资产号' : ''}
              />
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
                label="位置"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                fullWidth
                required
                error={errors.location}
                helperText={errors.location ? '请输入位置' : ''}
              />
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
            </Stack>
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
