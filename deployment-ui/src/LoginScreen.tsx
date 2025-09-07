import React, { useState } from 'react';
import { Box, Button, Card, CardContent, TextField, Typography, Snackbar, Alert } from '@mui/material';
import { useAuth } from './auth/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function LoginScreen() {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const { setAuthToken } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      setError('Token is required');
      return;
    }
    setAuthToken(token);
    localStorage.setItem('kubeconfigToken', token);
    navigate('/define');
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
      <Card sx={{ minWidth: 400 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>Login with Kubeconfig Token</Typography>
          <form onSubmit={handleSubmit}>
            <TextField
              label="Kubeconfig Token"
              variant="outlined"
              fullWidth
              value={token}
              onChange={e => setToken(e.target.value)}
              margin="normal"
              type="password"
              autoFocus
            />
            <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 2 }}>Login</Button>
          </form>
          <Snackbar open={!!error} autoHideDuration={3000} onClose={() => setError('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
            <Alert severity="error" sx={{ width: '100%' }}>{error}</Alert>
          </Snackbar>
        </CardContent>
      </Card>
    </Box>
  );
} 