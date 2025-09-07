import React from 'react';
import { Box, Card, CardContent, Typography, Divider } from '@mui/material';
import { ROUTE_NAMESPACE, ROUTE_NAME } from './@deployment-ui/config/routing';

export default function SettingsScreen() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>Settings</Typography>
      <Card sx={{ maxWidth: 500 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Configuration</Typography>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="subtitle1">Namespace</Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>{ROUTE_NAMESPACE}</Typography>
          <Typography variant="subtitle1">Route Name</Typography>
          <Typography variant="body1">{ROUTE_NAME}</Typography>
        </CardContent>
      </Card>
    </Box>
  );
} 