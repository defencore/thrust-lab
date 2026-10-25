/**
 * Offline starting points for synthetic curve editing.
 * Scalar specifications are rounded reference values from ThrustCurve.org.
 * The normalized shapes below are original illustrations, not copied test data.
 * Generating a profile changes its shape to satisfy the requested constraints.
 */

const illustration = (coordinates) => coordinates.map(([time, thrust]) => ({ time, thrust }));

const shapes = {
  shortBoost: illustration([[0, 0], [0.05, 0.12], [0.16, 0.48], [0.25, 1], [0.34, 0.52], [0.48, 0.27], [0.75, 0.24], [0.92, 0.2], [1, 0]]),
  boostSustain: illustration([[0, 0], [0.04, 0.18], [0.1, 0.58], [0.16, 1], [0.23, 0.49], [0.31, 0.33], [0.53, 0.31], [0.8, 0.28], [0.96, 0.27], [1, 0]]),
  longSustain: illustration([[0, 0], [0.04, 0.2], [0.09, 0.68], [0.13, 1], [0.21, 0.69], [0.34, 0.6], [0.64, 0.55], [0.95, 0.51], [1, 0]]),
  regressive: illustration([[0, 0], [0.03, 0.48], [0.1, 1], [0.22, 0.93], [0.45, 0.76], [0.65, 0.52], [0.82, 0.29], [0.94, 0.1], [1, 0]]),
  neutral: illustration([[0, 0], [0.03, 0.72], [0.1, 0.91], [0.22, 1], [0.4, 0.94], [0.66, 0.82], [0.87, 0.71], [0.97, 0.35], [1, 0]]),
};

const referenceLabel = 'ThrustCurve reference · synthetic shape';

export const MOTOR_PRESETS = [
  {
    id: 'estes-a8', name: 'A8', manufacturer: 'Estes', className: 'A',
    peak: 9.7, duration: 0.7, impulse: 2.5, shape: 'boost-sustain',
    template: shapes.shortBoost,
    description: 'A compact initial boost with a short sustaining tail. Reference-inspired synthetic profile.',
    sourceUrl: 'https://www.thrustcurve.org/motors/Estes/A8/', referenceLabel,
  },
  {
    id: 'estes-b6', name: 'B6', manufacturer: 'Estes', className: 'B',
    peak: 12.1, duration: 0.9, impulse: 4.3, shape: 'boost-sustain',
    template: shapes.shortBoost,
    description: 'An early peak followed by a short plateau. Reference-inspired synthetic profile.',
    sourceUrl: 'https://www.thrustcurve.org/motors/Estes/B6/', referenceLabel,
  },
  {
    id: 'estes-c6', name: 'C6', manufacturer: 'Estes', className: 'C',
    peak: 14.1, duration: 1.9, impulse: 8.8, shape: 'boost-sustain',
    template: shapes.boostSustain,
    description: 'A distinct boost and a longer low-thrust plateau. Reference-inspired synthetic profile.',
    sourceUrl: 'https://www.thrustcurve.org/motors/Estes/C6/', referenceLabel,
  },
  {
    id: 'estes-d12', name: 'D12', manufacturer: 'Estes', className: 'D',
    peak: 29.7, duration: 1.7, impulse: 16.8, shape: 'boost-sustain',
    template: shapes.boostSustain,
    description: 'A pronounced boost with a steady sustaining section. Reference-inspired synthetic profile.',
    sourceUrl: 'https://www.thrustcurve.org/motors/Estes/D12/', referenceLabel,
  },
  {
    id: 'estes-e12', name: 'E12', manufacturer: 'Estes', className: 'E',
    peak: 33.3, duration: 2.44, impulse: 27.2, shape: 'boost-sustain',
    template: shapes.boostSustain,
    description: 'An early boost followed by an extended plateau. Reference-inspired synthetic profile.',
    sourceUrl: 'https://www.thrustcurve.org/motors/Estes/E12/', referenceLabel,
  },
  {
    id: 'estes-f15', name: 'F15', manufacturer: 'Estes', className: 'F',
    peak: 25.3, duration: 3.5, impulse: 49.6, shape: 'boost-sustain',
    template: shapes.longSustain,
    description: 'A broad initial rise and a long sustaining tail. Reference-inspired synthetic profile.',
    sourceUrl: 'https://www.thrustcurve.org/motors/Estes/F15/', referenceLabel,
  },
  {
    id: 'aerotech-f40w', name: 'F40W', manufacturer: 'AeroTech', className: 'F',
    peak: 68.1, duration: 2.1, impulse: 78.1, shape: 'regressive',
    template: shapes.regressive,
    description: 'A rounded early peak with a declining tail. Reference-inspired synthetic profile.',
    sourceUrl: 'https://www.thrustcurve.org/motors/AeroTech/F40W/', referenceLabel,
  },
  {
    id: 'aerotech-g80t', name: 'G80T', manufacturer: 'AeroTech', className: 'G',
    peak: 108.5, duration: 1.7, impulse: 136.6, shape: 'neutral',
    template: shapes.neutral,
    description: 'A broad high-thrust section with a smooth trailing edge. Reference-inspired synthetic profile.',
    sourceUrl: 'https://www.thrustcurve.org/motors/AeroTech/G80T/', referenceLabel,
  },
];

export const CATALOG_NOTICE = 'Presets generate synthetic profiles from rounded public motor specifications. They are editable starting points, not certified measurements. No OpenRocket or ThrustCurve data files are bundled.';

export const CATALOG_SOURCES = [
  { label: 'OpenRocket motor selection and database', url: 'https://openrocket.info/tutorials/motor-selection.html' },
  { label: 'OpenRocket motor database and attribution', url: 'https://github.com/openrocket/motor-database' },
  { label: 'ThrustCurve.org API and simulator data', url: 'https://www.thrustcurve.org/info/api.html' },
];
