import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Box, CssBaseline, Drawer, List, ListItem, ListItemIcon, ListItemText, Toolbar, AppBar, Typography, ListItemButton, Tooltip, IconButton } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import RouteIcon from '@mui/icons-material/AltRoute';
import LogoutIcon from '@mui/icons-material/Logout';
import DefineBlueGreenScreen from './DefineBlueGreenScreen';
import RoutingControlScreen from './RoutingControlScreen';
import SettingsScreen from './SettingsScreen';
import LoginScreen from './LoginScreen';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { ROUTE_NAMESPACE, ROUTE_NAME } from './@deployment-ui/config/routing';

const drawerWidth = 240;

// Helper to parse JWT and extract claims
function parseJwt(token: string): { sub?: string; aud?: string | string[] } {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    return { sub: payload.sub, aud: payload.aud };
  } catch (e) {
    return {};
  }
}

function ProtectedApp() {
  const { authToken, setAuthToken } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  if (!authToken) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  const handleLogout = () => {
    setAuthToken(null);
    navigate('/login', { replace: true });
  };
  const claims = authToken ? parseJwt(authToken) : {};
  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Deployment Dashboard
          </Typography>
          {authToken && (
            <>
              <Tooltip
                title={
                  claims.sub || claims.aud
                    ? `sub: ${claims.sub || 'N/A'}\naud: ${Array.isArray(claims.aud) ? claims.aud.join(', ') : claims.aud || 'N/A'}`
                    : 'Invalid token'
                }
                arrow
              >
                <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
                  <Typography variant="body2" sx={{ bgcolor: '#eee', color: '#333', px: 1.5, py: 0.5, borderRadius: 1, fontFamily: 'monospace', mr: 1 }}>
                    sub: {claims.sub || 'N/A'}
                  </Typography>
                  <Typography variant="body2" sx={{ bgcolor: '#eee', color: '#333', px: 1.5, py: 0.5, borderRadius: 1, fontFamily: 'monospace' }}>
                    aud: {Array.isArray(claims.aud) ? claims.aud.join(', ') : claims.aud || 'N/A'}
                  </Typography>
                </Box>
              </Tooltip>
              <Tooltip title="Logout">
                <IconButton color="inherit" onClick={handleLogout} sx={{ ml: 2 }}>
                  <LogoutIcon />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Toolbar>
      </AppBar>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto' }}>
          <List>
            <ListItem disablePadding>
              <ListItemButton component={Link} to="/define">
                <ListItemIcon><SwapHorizIcon /></ListItemIcon>
                <ListItemText primary="Define Blue/Green" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton component={Link} to="/routing">
                <ListItemIcon><RouteIcon /></ListItemIcon>
                <ListItemText primary="Routing Control" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton component={Link} to="/settings">
                <ListItemIcon><SettingsIcon /></ListItemIcon>
                <ListItemText primary="Settings" />
              </ListItemButton>
            </ListItem>
          </List>
        </Box>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, bgcolor: 'background.default', p: 3 }}>
        <Toolbar />
        <Routes>
          <Route path="/define" element={<DefineBlueGreenScreen />} />
          <Route path="/routing" element={<RoutingControlScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="*" element={<Navigate to="/define" replace />} />
        </Routes>
      </Box>
    </Box>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/*" element={<ProtectedApp />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
