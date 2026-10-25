import { inspectCSV, parseCSV, parseProject } from './csv.js';
import { inspectSyntheticMarker } from './synthetic-marker.js';

/** Interpret saved files without sharing their data with the editor. */
export function analyzeSavedFile(text, name = '', options = {}) {
  if (typeof text !== 'string') throw new Error('File content must be text.');
  if (text.length > 20_000_000) throw new Error('Analyzer files must be smaller than 20 MB.');
  const isProject = /\.json$/i.test(name) || text.trimStart().startsWith('{');
  let points, marker, headers = null;
  if (isProject) {
    const project = parseProject(text);
    marker = inspectSyntheticMarker(JSON.parse(text).points);
    points = project.points;
  } else {
    const result = parseCSV(text, options);
    points = result.points; marker = result.syntheticMarker; headers = result.headers;
  }
  return {
    format: isProject ? 'Thrust Lab project' : 'CSV',
    detected: !!marker?.detected,
    scheme: marker?.detected ? marker.scheme : null,
    markerCount: marker?.detected ? marker.markerCount : 0,
    samples: points.length, start: points[0].time, end: points.at(-1).time, headers,
  };
}

/** Use the same header inspection rules as the profile importer. */
export function inspectAnalyzerCSV(text, header = 'auto') {
  return inspectCSV(text, header === 'auto' ? {} : { hasHeader: header === 'yes' });
}
