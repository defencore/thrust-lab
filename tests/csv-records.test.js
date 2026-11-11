import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeCSVText, readCSVRecords, replaceCSVField, replaceCSVSpans } from '../src/csv-records.js';

test('UTF-8 decoding retains a BOM and rejects undecodable input', () => {
  const text = '\uFEFFtime_ms,thrust\n0,0\n10,1';
  assert.equal(decodeCSVText(new TextEncoder().encode(text)), text);
  assert.equal(decodeCSVText(new TextEncoder().encode('0;1\n2;3').buffer), '0;1\n2;3');
  assert.throws(() => decodeCSVText(new Uint8Array([0xff, 0xfe])), /UTF-8 text encoding/);
});

test('record and field spans preserve quoted multiline values, escaped quotes and mixed endings', () => {
  const text = '\uFEFF \r\n"A\r\nB";"C""D"; 001.20 \n;2;3\r';
  const parsed = readCSVRecords(text, ';');
  assert.equal(parsed.bom, '\uFEFF');
  assert.equal(parsed.records[0].blank, true);
  assert.deepEqual(parsed.records[1].fields.map(field => field.value), ['A\r\nB', 'C"D', '001.20']);
  assert.deepEqual(parsed.records.map(record => record.ending), ['\r\n', '\n', '\r']);
  assert.equal(parsed.records.map(record => text.slice(record.start, record.end) + record.ending).join(''), text.slice(1));
  const selected = parsed.records[1].fields[2];
  assert.equal(replaceCSVSpans(text, [{ start: selected.start, end: selected.end, text: replaceCSVField(text.slice(selected.start, selected.end), '003.46') }]), text.replace('001.20', '003.46'));
});

test('field replacements retain quote and space wrappers without duplicating empty-field whitespace', () => {
  assert.equal(replaceCSVField('  " 001.20 " \t', '003.46'), '  " 003.46 " \t');
  assert.equal(replaceCSVField('  "   " ', ''), '  "   " ');
  assert.equal(replaceCSVField(' \t ', ''), ' \t ');
  assert.equal(replaceCSVField('"a"', 'b"c'), '"b""c"');
  assert.throws(() => readCSVRecords('"unfinished', ','), /not closed/);
  assert.throws(() => readCSVRecords('"closed"extra,1', ','), /Unexpected text/);
});
