import React, { useState } from 'react';
import ChamberList from '../components/ChamberList';
import ChamberForm from '../components/ChamberForm';
import { Chamber } from '../types';
import { useAppSelector } from '../store/hooks'
import PageShell from '../components/PageShell';

const ChambersPage: React.FC = () => {
  const [formOpen, setFormOpen] = useState(false);
  const [selectedChamber, setSelectedChamber] = useState<Chamber | undefined>(undefined);
  const { chambers } = useAppSelector((state) => state.chambers)

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
    <PageShell title="环境箱管理">
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
