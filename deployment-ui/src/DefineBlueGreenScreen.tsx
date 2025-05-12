import React, { useState } from 'react';
import { Box, Card, CardContent, Typography, Autocomplete, TextField, Button, Stack, Snackbar, Alert } from '@mui/material';

type ServiceOption = { label: string; value: string; disabled?: boolean };

const k8sServices: ServiceOption[] = [
  { label: 'service-a', value: 'service-a' },
  { label: 'service-b', value: 'service-b' },
  { label: 'service-c', value: 'service-c' },
];

export default function DefineBlueGreenScreen() {
  const [blueService, setBlueService] = useState<string | null>(null);
  const [greenService, setGreenService] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  // Filter options to prevent selecting the same service for both
  const blueOptions: ServiceOption[] = k8sServices.map(s => ({ ...s, disabled: s.value === greenService }));
  const greenOptions: ServiceOption[] = k8sServices.map(s => ({ ...s, disabled: s.value === blueService }));

  const handleSave = () => {
    if (!blueService || !greenService) {
      setSnackbar({ open: true, message: 'Please select both Blue and Green services.', severity: 'error' });
      return;
    }
    // TODO: Call backend to save mapping
    setSnackbar({ open: true, message: 'Mappings saved successfully!', severity: 'success' });
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Define Blue/Green Environments</Typography>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={4}>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="h6" color="primary">Blue Environment</Typography>
            <Autocomplete
              options={blueOptions}
              getOptionDisabled={option => !!option.disabled}
              value={k8sServices.find(s => s.value === blueService) || null}
              onChange={(_, newValue) => setBlueService(newValue ? newValue.value : null)}
              renderInput={(params) => <TextField {...params} label="Kubernetes Service" variant="outlined" />}
              sx={{ mt: 2 }}
            />
            <Typography variant="body2" sx={{ mt: 2 }}>Current: {blueService || 'Not set'}</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="h6" color="success.main">Green Environment</Typography>
            <Autocomplete
              options={greenOptions}
              getOptionDisabled={option => !!option.disabled}
              value={k8sServices.find(s => s.value === greenService) || null}
              onChange={(_, newValue) => setGreenService(newValue ? newValue.value : null)}
              renderInput={(params) => <TextField {...params} label="Kubernetes Service" variant="outlined" />}
              sx={{ mt: 2 }}
            />
            <Typography variant="body2" sx={{ mt: 2 }}>Current: {greenService || 'Not set'}</Typography>
          </CardContent>
        </Card>
      </Stack>
      <Box sx={{ mt: 4, textAlign: 'right' }}>
        <Button variant="contained" color="primary" onClick={handleSave}>Save</Button>
      </Box>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
} 