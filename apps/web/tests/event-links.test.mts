// Run with: npm run test --workspace=apps/web  (Node's built-in test runner; no network, no browser)
import test from 'node:test';
import assert from 'node:assert/strict';
import { meetingProvider, safeExternalUrl, timeZoneLabel } from '../src/lib/event-links.ts';

test('only http(s) links are rendered', () => {
  assert.equal(safeExternalUrl('https://forms.gle/abc'), 'https://forms.gle/abc');
  assert.equal(safeExternalUrl(' http://example.org/x '), 'http://example.org/x');
  assert.equal(safeExternalUrl('javascript:alert(1)'), null);
  assert.equal(safeExternalUrl('data:text/html,hi'), null);
  assert.equal(safeExternalUrl('not a url'), null);
  assert.equal(safeExternalUrl(null), null);
});

test('names the meeting provider from the link', () => {
  assert.equal(meetingProvider('https://meet.google.com/abc-defg-hij'), 'Google Meet');
  assert.equal(meetingProvider('https://us02web.zoom.us/j/812?pwd=x'), 'Zoom');
  assert.equal(meetingProvider('https://teams.microsoft.com/l/meetup-join/abc'), 'Microsoft Teams');
  assert.equal(meetingProvider('https://teams.live.com/meet/123'), 'Microsoft Teams');
  assert.equal(meetingProvider('https://srmist.webex.com/meet/x'), 'Webex');
  assert.equal(meetingProvider('https://example.org/stream'), 'Online meeting');
  assert.equal(meetingProvider('https://notzoom.us.evil.example/j/1'), 'Online meeting');
  assert.equal(meetingProvider(null), 'Online meeting');
});

test('shows a short timezone name when one exists', () => {
  assert.equal(timeZoneLabel('Asia/Kolkata', new Date('2026-10-15T05:00:00Z')), 'IST');
  assert.equal(timeZoneLabel(null), null);
  assert.equal(timeZoneLabel('Not/AZone'), null);
});
