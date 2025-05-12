import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Select,
  MenuItem,
  IconButton,
  Button,
  LinearProgress,
  Snackbar,
  Alert,
  Tooltip,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import UndoIcon from '@mui/icons-material/Undo';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { LineChart } from '@mui/x-charts/LineChart';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import { headerMappings } from './@deployment-ui/config/headers';
import { getHTTPRoute, patchHTTPRoute, HTTPRoute } from './api/apigateway';

// Stub: initial rules
const initialRules = [
  { id: 1, header: 'user-id', value: '123', target: 'blue' },
  { id: 2, header: 'host', value: 'example.com', target: 'green' },
];

// Stub: metrics data
const timeLabels = ['10:00', '10:05', '10:10', '10:15', '10:20'];
const blueRequests = [100, 120, 110, 130, 125];
const greenRequests = [80, 90, 95, 100, 105];
const blueErrors = [1, 2, 1, 0, 1];
const greenErrors = [0, 1, 0, 1, 0];

// Mock Prometheus metrics for requests
const blueRequestsTotal = 1200;
const greenRequestsTotal = 800;
const totalRequests = blueRequestsTotal + greenRequestsTotal;
const greenTrafficPercent = totalRequests > 0 ? Math.round((greenRequestsTotal / totalRequests) * 100) : 0;
const blueTrafficPercent = 100 - greenTrafficPercent;

export default function RoutingControlScreen() {
  const [rules, setRules] = useState(initialRules);
  const [newRule, setNewRule] = useState({ header: '', value: '', target: 'blue' });
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  const [defaultRoute, setDefaultRoute] = useState<'blue' | 'green'>('blue');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [rollbackOpen, setRollbackOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getHTTPRoute('default', 'sample-route')
      .then((data) => {
        setDefaultRoute((data.spec.rules?.[0]?.backendRefs?.[0]?.name === 'green' ? 'green' : 'blue') as 'blue' | 'green');
        setRules(
          (data.spec.rules || []).map((r, i) => ({
            id: i + 1,
            header: r.matches?.[0]?.headers?.[0]?.name || '',
            value: r.matches?.[0]?.headers?.[0]?.value || '',
            target: r.backendRefs?.[0]?.name || '',
          }))
        );
      })
      .catch((e) => setSnackbar({ open: true, message: e.message, severity: 'error' }))
      .finally(() => setLoading(false));
  }, []);

  const syncRulesToBackend = async (newRules: typeof rules, newDefault: 'blue' | 'green') => {
    setLoading(true);
    try {
      await patchHTTPRoute('default', 'sample-route', {
        rules: newRules.map(r => ({
          matches: [
            {
              headers: [
                {
                  name: headerMappings.find(m => m.logical === r.header)?.actual || r.header,
                  value: r.value,
                },
              ],
            },
          ],
          backendRefs: [
            { name: r.target, port: 80 },
          ],
        })),
      }, 'frontend-user');
      setSnackbar({ open: true, message: 'Routing updated', severity: 'success' });
    } catch (e: any) {
      setSnackbar({ open: true, message: e.message, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleRuleChange = (id: number, field: string, value: string) => {
    const updated = rules.map(rule => rule.id === id ? { ...rule, [field]: value } : rule);
    setRules(updated);
    syncRulesToBackend(updated, defaultRoute);
  };

  const handleDeleteRule = (id: number) => {
    const updated = rules.filter(rule => rule.id !== id);
    setRules(updated);
    syncRulesToBackend(updated, defaultRoute);
  };

  const handleAddRule = () => {
    if (!newRule.header || !newRule.value) {
      setSnackbar({ open: true, message: 'Header and value required', severity: 'error' });
      return;
    }
    const updated = [...rules, { ...newRule, id: Date.now() }];
    setRules(updated);
    setNewRule({ header: '', value: '', target: 'blue' });
    setSnackbar({ open: true, message: 'Rule added', severity: 'success' });
    syncRulesToBackend(updated, defaultRoute);
  };

  const handleSwitchAllToGreen = () => {
    setRules([]);
    setDefaultRoute('green');
    syncRulesToBackend([], 'green');
    setConfirmOpen(false);
  };

  const handleRollbackToBlue = () => {
    setDefaultRoute('blue');
    syncRulesToBackend(rules, 'blue');
    setRollbackOpen(false);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Routing Control</Typography>
      <Card elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Routing Rules
        </Typography>
        <Divider sx={{ mb: 2 }} />
        {/* Default route row with accent and chip */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            bgcolor: defaultRoute === 'blue' ? 'primary.50' : 'success.50',
            borderRadius: 2,
            p: 2,
            mb: 2,
            borderLeft: 6,
            borderColor: defaultRoute === 'blue' ? 'primary.main' : 'success.main',
          }}
        >
          <Chip label="Default" color={defaultRoute === 'blue' ? 'primary' : 'success'} sx={{ mr: 2 }} />
          <Typography sx={{ flex: 1, fontWeight: 500 }}>All</Typography>
          <Typography sx={{ flex: 1, fontWeight: 600 }}>
            {defaultRoute === 'blue' ? 'Blue' : 'Green'}
          </Typography>
        </Box>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          Rules to Green
        </Typography>
        {/* Rules Table */}
        <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
          <Table size="small" aria-label="rules table">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.100' }}>
                <TableCell sx={{ fontWeight: 600 }}>Header</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Value</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Target</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rules.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ color: 'grey.500' }}>
                    No rules defined
                  </TableCell>
                </TableRow>
              )}
              {rules.map((rule, idx) => (
                <TableRow key={rule.id} sx={{ bgcolor: idx % 2 === 0 ? 'grey.50' : 'background.paper' }}>
                  <TableCell>
                    <Typography>
                      {rule.header}
                      <span style={{ color: '#888', marginLeft: 8 }}>
                        ({
                          headerMappings.find((m: { logical: string }) => m.logical === rule.header)?.actual || rule.header
                        })
                      </span>
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography>{rule.value}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label="Green" color="success" size="small" />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Delete rule">
                      <IconButton onClick={() => handleDeleteRule(rule.id)} color="error" size="small">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {/* Add new rule row */}
              <TableRow>
                <TableCell>
                  <Select
                    value={newRule.header}
                    onChange={e => setNewRule({ ...newRule, header: e.target.value })}
                    size="small"
                    fullWidth
                    displayEmpty
                  >
                    <MenuItem value="" disabled>Select header</MenuItem>
                    <MenuItem value="user-id">user-id</MenuItem>
                    <MenuItem value="host">host</MenuItem>
                    <MenuItem value="group">group</MenuItem>
                    <MenuItem value="device-type">device-type</MenuItem>
                  </Select>
                </TableCell>
                <TableCell>
                  <TextField
                    value={newRule.value}
                    onChange={e => setNewRule({ ...newRule, value: e.target.value })}
                    size="small"
                    fullWidth
                    placeholder="Value"
                  />
                </TableCell>
                <TableCell>
                  <Chip label="Green" color="success" size="small" />
                </TableCell>
                <TableCell align="center">
                  <Tooltip title="Add rule">
                    <IconButton onClick={handleAddRule} color="primary" size="small">
                      <AddIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
        <Divider sx={{ my: 2 }} />
        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Tooltip title="Send all traffic to Green (removes all rules)">
            <span>
              <Button
                variant="contained"
                color="success"
                startIcon={<SwapHorizIcon />}
                onClick={handleSwitchAllToGreen}
                sx={{ minWidth: 180 }}
              >
                Switch All Traffic to Green
              </Button>
            </span>
          </Tooltip>
          <Tooltip title="Rollback default route to Blue">
            <span>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<UndoIcon />}
                onClick={handleRollbackToBlue}
                disabled={defaultRoute === 'blue'}
                sx={{ minWidth: 160 }}
              >
                Rollback to Blue
              </Button>
            </span>
          </Tooltip>
        </Box>
      </Card>

      {/* Live Traffic Split Section */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Live Traffic Split</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Box sx={{ width: '100%', mr: 2 }}>
              <LinearProgress variant="determinate" value={blueTrafficPercent} sx={{ height: 10, borderRadius: 5, bgcolor: '#e3eafc', '& .MuiLinearProgress-bar': { bgcolor: '#1976d2' } }} />
            </Box>
            <Typography color="primary">Blue: {blueTrafficPercent}%</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ width: '100%', mr: 2 }}>
              <LinearProgress variant="determinate" value={greenTrafficPercent} sx={{ height: 10, borderRadius: 5, bgcolor: '#e8f5e9', '& .MuiLinearProgress-bar': { bgcolor: '#43a047' } }} />
            </Box>
            <Typography color="success.main">Green: {greenTrafficPercent}%</Typography>
          </Box>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              (Mocked from Prometheus: blue={blueRequestsTotal} reqs, green={greenRequestsTotal} reqs)
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Metrics Section */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Prometheus Metrics</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            <Box sx={{ flex: 1, minWidth: 350 }}>
              <Typography variant="subtitle1">Requests Over Time</Typography>
              <LineChart
                xAxis={[{ scaleType: 'point', data: timeLabels }]}
                series={[
                  { data: blueRequests, label: 'Blue', color: '#1976d2' },
                  { data: greenRequests, label: 'Green', color: '#43a047' },
                ]}
                width={400}
                height={200}
              />
            </Box>
            <Box sx={{ flex: 1, minWidth: 350 }}>
              <Typography variant="subtitle1">Error Rate Over Time</Typography>
              <LineChart
                xAxis={[{ scaleType: 'point', data: timeLabels }]}
                series={[
                  { data: blueErrors, label: 'Blue', color: '#1976d2' },
                  { data: greenErrors, label: 'Green', color: '#43a047' },
                ]}
                width={400}
                height={200}
              />
            </Box>
          </Box>
        </CardContent>
      </Card>
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
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Switch All Traffic to Green?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will remove all routing rules and send 100% of traffic to Green. This action cannot be undone. Are you sure you want to proceed?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} color="inherit">Cancel</Button>
          <Button onClick={handleSwitchAllToGreen} color="success" variant="contained" autoFocus>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={rollbackOpen} onClose={() => setRollbackOpen(false)}>
        <DialogTitle>Rollback to Blue?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will set the default route back to Blue. No previous rules will be restored. Are you sure you want to proceed?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRollbackOpen(false)} color="inherit">Cancel</Button>
          <Button onClick={handleRollbackToBlue} color="primary" variant="contained" autoFocus>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 