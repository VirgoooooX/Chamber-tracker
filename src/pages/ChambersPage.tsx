import React, { useState } from 'react';
import { Container, Box, Typography } from '@mui/material';
import ChamberList from '../components/ChamberList';
import ChamberForm from '../components/ChamberForm';
import { Chamber } from '../types';
import { useAppSelector } from '../store/hooks'

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
    <Container maxWidth="lg">
      <Box py={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          环境箱管理
        </Typography>
        
        <ChamberList 
          onEdit={handleEdit}
          onAddNew={handleAddNew}
        />
        
        <ChamberForm 
          open={formOpen}
          onClose={handleCloseForm}
          chamber={selectedChamber}
        />
      </Box>
    </Container>
  );
};

export default ChambersPage;
