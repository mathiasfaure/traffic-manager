import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { Box, CssBaseline, Drawer, List, ListItem, ListItemIcon, ListItemText, Toolbar, AppBar, Typography, ListItemButton } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import RouteIcon from '@mui/icons-material/AltRoute';
import DefineBlueGreenScreen from './DefineBlueGreenScreen';
import RoutingControlScreen from './RoutingControlScreen';

const drawerWidth = 240;

export default function App() {
  return (
    <Router>
      <Box sx={{ display: 'flex' }}>
        <CssBaseline />
        <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
          <Toolbar>
            <Typography variant="h6" noWrap component="div">
              Deployment Dashboard
            </Typography>
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
            <Route path="*" element={<Navigate to="/define" replace />} />
          </Routes>
        </Box>
      </Box>
    </Router>
  );
}
