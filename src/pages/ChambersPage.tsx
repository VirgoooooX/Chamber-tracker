import React, { useState } from 'react';
import ChamberList from '../components/ChamberList';
import ChamberForm from '../components/ChamberForm';
import { Asset } from '../types'
import { useAppSelector } from '../store/hooks'
import PageShell from '../components/PageShell';
import { Alert } from '@mui/material'
import AcUnitIcon from '@mui/icons-material/AcUnit'
import TitleWithIcon from '../components/TitleWithIcon'

const ChambersPage: React.FC = () => {
  const [formOpen, setFormOpen] = useState(false);
  const [selectedChamber, setSelectedChamber] = useState<Asset | undefined>(undefined)
  const { assets: chambers } = useAppSelector((state) => state.assets)
  const fallbackSource = useAppSelector((state) => state.assets.fallbackSource)

  const handleAddNew = () => {
    setSelectedChamber(undefined);
    setFormOpen(true);
  };

  const handleEdit = (id: string) => {
    const chamber = chambers.find(c => c.id === id);
    if (chamber) {
      setSelectedChamber(chamber);
      setFormOpen(true);
    }
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setSelectedChamber(undefined);
  };

  return (
    <PageShell title={<TitleWithIcon icon={<AcUnitIcon />}>设备台账</TitleWithIcon>}>
      {fallbackSource === 'chambers' ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          当前正在从旧的 chambers 集合读取数据（assets 尚未迁移）。建议到“设置 → 数据迁移”执行一键迁移。
        </Alert>
      ) : null}
      <ChamberList 
        onEdit={handleEdit}
        onAddNew={handleAddNew}
      />
      
      <ChamberForm 
        open={formOpen}
        onClose={handleCloseForm}
        chamber={selectedChamber}
      />
    </PageShell>
  );
};

export default ChambersPage;
