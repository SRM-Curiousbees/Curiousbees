const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeEmail, unwrapLink } = require('../src/normalize-email');
const f = require('./fixtures');

test('HTML email: readable text with links kept beside their labels', () => {
  const e = normalizeEmail(f.SEMINAR_HTML);
  assert.equal(e.messageId, '18f2a9c0d1e2f3a4');
  assert.equal(e.threadId, '18f2a9c0d1e2f3a4');
  assert.equal(e.fromAddress, 'research.office@srmist.edu.in');
  assert.equal(e.receivedAt, '2026-10-02T04:15:00.000Z');
  assert.match(e.text, /Guest Lecture on Quantum Sensing/);
  assert.match(e.text, /Date: 15th October 2026/);
  assert.match(e.text, /Time: 10:30 AM – 12:00 PM/);
  assert.match(e.text, /Register here \(https:\/\/forms\.gle\/qs-lecture-2026\)/);
  assert.match(e.text, /event page \(https:\/\/www\.srmist\.edu\.in\/events\/quantum-sensing\/\)/);
  assert.doesNotMatch(e.text, /alert\(1\)|color:red|tracking comment|<p>/);
  assert.equal(e.truncated, false);
});

test('collects every link once, unwrapping Google redirects', () => {
  const e = normalizeEmail(f.SEMINAR_HTML);
  assert.deepEqual(e.urls, [
    'https://forms.gle/qs-lecture-2026',
    'https://meet.google.com/abc-defg-hij',
    'https://www.srmist.edu.in/events/quantum-sensing/',
  ]);
  assert.ok(!e.urls.some((u) => u.includes('google.com/url')));
});

test('plain-text email: Zoom and Teams links without trailing punctuation, quoted replies dropped', () => {
  const e = normalizeEmail(f.ZOOM_PLAIN);
  assert.deepEqual(e.urls, [
    'https://us02web.zoom.us/j/81234567890?pwd=abcDEF123',
    'https://teams.microsoft.com/l/meetup-join/19%3ameeting_x%40thread.v2/0',
    'https://example.org/slides/rml',
  ]);
  assert.doesNotMatch(e.text, /earlier message|quoted\.example\.com/);
  assert.ok(!e.urls.some((u) => u.includes('quoted.example.com')));
});

test('Outlook Safe Links are unwrapped to the real meeting link', () => {
  const e = normalizeEmail(f.SAFELINKS_FORWARD);
  assert.deepEqual(e.urls, ['https://teams.microsoft.com/l/meetup-join/abc']);
  assert.match(e.text, /Microsoft Teams meeting \(https:\/\/teams\.microsoft\.com\/l\/meetup-join\/abc\)/);
  assert.equal(unwrapLink('https://www.google.com/url?q=javascript:alert(1)'), 'https://www.google.com/url?q=javascript:alert(1)');
});

test('shortens long emails and says so', () => {
  const e = normalizeEmail({ ...f.ZOOM_PLAIN, text: 'Seminar details. '.repeat(500) }, { maxBodyChars: 200 });
  assert.equal(e.truncated, true);
  assert.ok(e.text.length < 260);
  assert.match(e.text, /\[…email shortened\]$/);
});

test('flags bulk mail, auto-replies and calendar invites from headers', () => {
  assert.equal(normalizeEmail(f.NEWSLETTER).bulk, true);
  assert.equal(normalizeEmail(f.SEMINAR_HTML).bulk, false);
  assert.equal(normalizeEmail(f.OUT_OF_OFFICE).autoReply, true);
  assert.equal(normalizeEmail(f.CALENDAR_ACCEPTED).hasCalendarInvite, true);
});

test('keeps attachment names and types only, never content', () => {
  const e = normalizeEmail({ ...f.SEMINAR_HTML, attachments: [{ filename: 'invite.ics', contentType: 'text/calendar', size: 1200, content: 'BEGIN:VCALENDAR' }] });
  assert.deepEqual(e.attachments, [{ filename: 'invite.ics', contentType: 'text/calendar', size: 1200 }]);
  assert.equal(e.hasCalendarInvite, true);
  assert.ok(!JSON.stringify(e).includes('BEGIN:VCALENDAR'));
});

test('refuses an item without a Gmail message ID, since duplicate protection depends on it', () => {
  assert.throws(() => normalizeEmail(f.NO_ID), /no message ID/);
});

test('never includes recipients', () => {
  const e = normalizeEmail(f.SEMINAR_HTML);
  assert.ok(!JSON.stringify(e).includes('curiousbees@srmist.edu.in'));
});
