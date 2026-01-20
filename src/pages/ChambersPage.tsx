import React from 'react';
import ChamberList from '../components/ChamberList';
import { useAppSelector } from '../store/hooks'
import PageShell from '../components/PageShell';
import { Alert } from '@mui/material'
import AcUnitIcon from '@mui/icons-material/AcUnit'
import TitleWithIcon from '../components/TitleWithIcon'
import { useNavigate } from 'react-router-dom'

const ChambersPage: React.FC = () => {
  const navigate = useNavigate()
  const fallbackSource = useAppSelector((state) => state.assets.fallbackSource)

  return (
    <PageShell title={<TitleWithIcon icon={<AcUnitIcon />}>设备台账</TitleWithIcon>}>
      {fallbackSource === 'chambers' ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          当前正在从旧的 chambers 集合读取数据（assets 尚未迁移）。建议到“设置 → 数据迁移”执行一键迁移。
        </Alert>
      ) : null}
      <ChamberList 
        onView={(id) => navigate(`/assets/${id}`)}
        onEdit={(id) => navigate(`/assets/${id}?edit=1`)}
        onAddNew={() => navigate('/assets/new')}
      />
    </PageShell>
  );
};

export default ChambersPage;
