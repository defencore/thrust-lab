const MAX_RECORDS = 30_011;

/** Decode UTF-8 without discarding the original byte-order mark. */
export function decodeCSVText(buffer) {
  try { return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(buffer); }
  catch { throw new Error('CSV files must use UTF-8 text encoding.'); }
}

/** Read logical records while retaining every physical field and line-ending span. */
export function readCSVRecords(text, delimiter) {
  if (typeof text !== 'string') throw new Error('CSV content must be text.');
  if (![',', ';', '\t'].includes(delimiter)) throw new Error('Choose comma, semicolon, or tab as the delimiter.');
  const records = [];
  const bom = text.startsWith('\uFEFF') ? '\uFEFF' : '';
  let recordStart = bom.length, fieldStart = recordStart;
  let fields = [], value = '', quoted = false, closedQuote = false, explicitRow = false, count = 0;
  function finishField(end) {
    fields.push({ value: value.trim(), start: fieldStart, end });
    value = ''; closedQuote = false;
  }
  function finishRecord(end, ending = '') {
    finishField(end);
    const blank = !explicitRow && fields.length === 1 && fields[0].value === '';
    records.push({ start: recordStart, end, ending, fields, blank });
    if (!blank && ++count > MAX_RECORDS) throw new Error('CSV files are limited to 30,000 measurements.');
    fields = []; explicitRow = false;
    recordStart = end + ending.length; fieldStart = recordStart;
  }
  for (let index = bom.length; index < text.length; index++) {
    const character = text[index];
    if (quoted) {
      if (character === '"') {
        if (text[index + 1] === '"') { value += '"'; index++; }
        else { quoted = false; closedQuote = true; }
      } else value += character;
    } else if (character === delimiter) {
      finishField(index); fieldStart = index + 1;
    } else if (character === '\n' || character === '\r') {
      const ending = character === '\r' && text[index + 1] === '\n' ? '\r\n' : character;
      finishRecord(index, ending); index += ending.length - 1;
    } else if (character === '"') {
      if (value.trim() || closedQuote) throw new Error('Unexpected quote in the CSV file.');
      value = ''; quoted = true; explicitRow = true;
    } else if (closedQuote && character.trim()) throw new Error('Unexpected text after a quoted CSV field.');
    else value += character;
  }
  if (quoted) throw new Error('A quoted CSV field is not closed.');
  if (text.length > recordStart) finishRecord(text.length);
  return { bom, records };
}

/** Replace only a field's content, retaining its quoting and surrounding whitespace. */
export function replaceCSVField(raw, replacement) {
  const outsideLeading = raw.length - raw.trimStart().length;
  const outsideTrailing = Math.min(raw.length - outsideLeading, raw.length - raw.trimEnd().length);
  const outerEnd = raw.length - outsideTrailing;
  const quoted = raw[outsideLeading] === '"' && raw[outerEnd - 1] === '"';
  const start = outsideLeading + Number(quoted), end = outerEnd - Number(quoted);
  const content = raw.slice(start, end);
  const leading = content.length - content.trimStart().length;
  const trailing = Math.min(content.length - leading, content.length - content.trimEnd().length);
  const escaped = quoted ? replacement.replaceAll('"', '""') : replacement;
  return raw.slice(0, start + leading) + escaped + raw.slice(end - trailing);
}

/** Apply disjoint source edits without rebuilding untouched records or fields. */
export function replaceCSVSpans(text, replacements) {
  let result = '', previous = 0;
  for (const replacement of [...replacements].sort((a, b) => a.start - b.start || a.end - b.end)) {
    if (!Number.isInteger(replacement.start) || !Number.isInteger(replacement.end) || replacement.start < previous || replacement.end < replacement.start || replacement.end > text.length || typeof replacement.text !== 'string') throw new Error('CSV source layout contains overlapping or invalid edits.');
    result += text.slice(previous, replacement.start) + replacement.text;
    previous = replacement.end;
  }
  return result + text.slice(previous);
}
