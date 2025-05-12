export interface HeaderMapping {
  logical: string;
  actual: string;
  description?: string;
}

export const headerMappings: HeaderMapping[] = [
  {
    logical: 'user-id',
    actual: 'x-nexus-user-id',
    description: 'User identifier for routing'
  },
  {
    logical: 'group',
    actual: 'x-nexus-group',
    description: 'User group for routing'
  },
  {
    logical: 'host',
    actual: 'host',
    description: 'Host header for routing'
  },
  {
    logical: 'device-type',
    actual: 'x-nexus-device-type',
    description: 'Device type for routing'
  }
];

// Helper functions to convert between logical and actual header names
export const getActualHeader = (logicalHeader: string): string => {
  const mapping = headerMappings.find(m => m.logical === logicalHeader);
  return mapping ? mapping.actual : logicalHeader;
};

export const getLogicalHeader = (actualHeader: string): string => {
  const mapping = headerMappings.find(m => m.actual === actualHeader);
  return mapping ? mapping.logical : actualHeader;
}; 