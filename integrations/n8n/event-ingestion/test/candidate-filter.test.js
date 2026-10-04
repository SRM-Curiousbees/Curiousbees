const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeEmail } = require('../src/normalize-email');
const { scoreCandidate } = require('../src/candidate-filter');
const f = require('./fixtures');

const settings = { minCandidateScore: 4, trustedSenderDomains: ['srmist.edu.in'] };
const score = (item, s = settings) => scoreCandidate(normalizeEmail(item), s);

test('an institutional seminar invitation is a candidate', () => {
  const r = score(f.SEMINAR_HTML);
  assert.equal(r.candidate, true);
  for (const s of ['event_word_in_subject', 'mentions_a_date', 'mentions_a_time', 'mentions_a_venue', 'meeting_link', 'registration_link', 'trusted_sender']) {
    assert.ok(r.signals.includes(s), `missing ${s}`);
  }
  assert.equal(r.reason, null);
});

test('webinars with Zoom or Teams links are candidates (subdomains of trusted domains count)', () => {
  const zoom = score(f.ZOOM_PLAIN);
  assert.equal(zoom.candidate, true);
  assert.ok(zoom.signals.includes('trusted_sender'));
  assert.ok(zoom.signals.includes('meeting_link'));
  assert.equal(score(f.SAFELINKS_FORWARD).candidate, true);
});

test('security, billing, newsletters, auto-replies and calendar responses never reach the AI', () => {
  const reset = score(f.PASSWORD_RESET);
  assert.deepEqual([reset.candidate, reset.signals], [false, ['security_code']]);
  assert.match(reset.reason, /security code/);

  const invoice = score(f.INVOICE);
  assert.equal(invoice.candidate, false);
  assert.ok(invoice.signals.includes('transactional'));

  const news = score(f.NEWSLETTER);
  assert.equal(news.candidate, false);
  assert.ok(news.signals.includes('promotion'));
  assert.ok(news.signals.includes('bulk_mail'));

  assert.deepEqual(score(f.OUT_OF_OFFICE).signals, ['auto_reply']);
  assert.deepEqual(score(f.CALENDAR_ACCEPTED).signals, ['calendar_response']);
});

test('ordinary mail from a trusted colleague is not enough on its own', () => {
  const r = score({ ...f.ZOOM_PLAIN, subject: 'Quick question', text: 'Could you share the dataset when you get a chance? Thanks.' });
  assert.equal(r.candidate, false);
  assert.deepEqual(r.signals, ['trusted_sender']);
});

test('recognises common date and time formats', () => {
  const base = { ...f.ZOOM_PLAIN, subject: 'Seminar', from: { value: [{ address: 'x@example.org' }], text: 'x@example.org' } };
  for (const date of ['2026-10-15', '15/10/2026', 'Oct 15', '15th of October', '15 Oct 2026', 'October 15, 2026']) {
    assert.ok(score({ ...base, text: `Seminar on ${date}.` }).signals.includes('mentions_a_date'), date);
  }
  for (const time of ['2 p.m.', '10.30 am', '14:30 hrs', '9:00 AM', '11am']) {
    assert.ok(score({ ...base, text: `Seminar at ${time}.` }).signals.includes('mentions_a_time'), time);
  }
  assert.ok(!score({ ...base, text: 'Seminar soon.' }).signals.includes('mentions_a_time'));
});

test('the threshold is configurable', () => {
  assert.equal(score(f.SEMINAR_HTML, { ...settings, minCandidateScore: 100 }).candidate, false);
  assert.equal(score(f.SEMINAR_HTML, { ...settings, minCandidateScore: 100 }).reason, `Pre-filter score ${score(f.SEMINAR_HTML).score} is below 100`);
});
