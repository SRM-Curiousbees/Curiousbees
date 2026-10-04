// Gmail Trigger items as n8n produces them with "Simplify" off, plus mocked
// Gemini responses. All addresses, links and people are made up.

const headers = (pairs) => Object.fromEntries(Object.entries(pairs).map(([k, v]) => [k.toLowerCase(), `${k}: ${v}`]));

const SEMINAR_HTML = {
  id: '18f2a9c0d1e2f3a4',
  threadId: '18f2a9c0d1e2f3a4',
  labelIds: ['INBOX', 'UNREAD'],
  date: '2026-10-02T04:15:00.000Z',
  subject: 'Invitation: Guest Lecture on Quantum Sensing – 15th October 2026',
  from: { value: [{ address: 'Research.Office@srmist.edu.in', name: 'Directorate of Research' }], text: 'Directorate of Research <research.office@srmist.edu.in>' },
  to: { value: [{ address: 'curiousbees@srmist.edu.in', name: '' }], text: 'curiousbees@srmist.edu.in' },
  headers: headers({ From: 'Directorate of Research <research.office@srmist.edu.in>', Subject: 'Invitation: Guest Lecture', 'Content-Type': 'multipart/alternative; boundary="b1"' }),
  html: `<html><head><style>p{color:red}</style><title>x</title></head><body>
    <p>Dear Scholars,</p>
    <p>The Directorate of Research invites you to a <b>Guest Lecture on Quantum Sensing</b> by Dr. A. Kumar.</p>
    <p>Date: 15th October 2026<br>Time: 10:30 AM &ndash; 12:00 PM<br>Venue: TP Ganesan Auditorium, Mini Hall 2</p>
    <p><a href="https://forms.gle/qs-lecture-2026">Register here</a> &middot;
       Join online: <a href="https://www.google.com/url?q=https://meet.google.com/abc-defg-hij&amp;sa=D&amp;ust=1">https://meet.google.com/abc-defg-hij</a></p>
    <p>Details: <a href="https://www.srmist.edu.in/events/quantum-sensing/">event page</a>.</p>
    <!-- tracking comment -->
    <script>alert(1)</script>
    <p>Regards,<br>Directorate of Research</p>
  </body></html>`,
  text: '',
};

const ZOOM_PLAIN = {
  id: '18f2a9c0d1e2f3b5',
  threadId: '18f2a9c0d1e2f3b0',
  date: '2026-10-02T06:00:00.000Z',
  subject: 'Webinar: Reproducible Machine Learning for Scholars',
  from: { value: [{ address: 'cse.office@ktr.srmist.edu.in', name: 'Department of CSE' }], text: 'Department of CSE <cse.office@ktr.srmist.edu.in>' },
  headers: headers({ 'Content-Type': 'text/plain; charset=utf-8' }),
  text: [
    'Dear all,',
    '',
    'You are invited to a webinar on Reproducible Machine Learning.',
    'Date: Oct 20, 2026',
    'Time: 14:30 hrs IST',
    'Zoom: https://us02web.zoom.us/j/81234567890?pwd=abcDEF123.',
    'Backup Teams link (https://teams.microsoft.com/l/meetup-join/19%3ameeting_x%40thread.v2/0)',
    'Slides will be shared at https://example.org/slides/rml.',
    '',
    'On Mon, 28 Sep 2026 at 10:00, Someone <someone@example.com> wrote:',
    '> earlier message that should not be sent to the AI',
    '> https://quoted.example.com/old-link',
  ].join('\n'),
  html: false,
};

const SAFELINKS_FORWARD = {
  id: '18f2a9c0d1e2f3c6',
  threadId: '18f2a9c0d1e2f3c6',
  date: '2026-10-03T03:00:00.000Z',
  subject: 'Fwd: Workshop on Scientific Writing',
  from: { value: [{ address: 'dean.research@srmist.edu.in', name: 'Dean Research' }], text: 'Dean Research <dean.research@srmist.edu.in>' },
  headers: headers({}),
  html: '<div>Workshop on Scientific Writing, 22 Oct 2026, 2 pm, Online.<br>Join: <a href="https://nam12.safelinks.protection.outlook.com/?url=https%3A%2F%2Fteams.microsoft.com%2Fl%2Fmeetup-join%2Fabc&amp;data=05%7C01">Microsoft Teams meeting</a></div>',
};

const PASSWORD_RESET = {
  id: '18f2a9c0d1e2f3d7',
  threadId: '18f2a9c0d1e2f3d7',
  date: '2026-10-02T07:00:00.000Z',
  subject: 'Reset your password',
  from: { value: [{ address: 'no-reply@accounts.example.com', name: 'Accounts' }], text: 'Accounts <no-reply@accounts.example.com>' },
  headers: headers({}),
  text: 'We received a request to reset your password. Your verification code is 482913. This session expires at 10:30 AM on 2 Oct 2026.',
};

const INVOICE = {
  id: '18f2a9c0d1e2f3e8',
  threadId: '18f2a9c0d1e2f3e8',
  date: '2026-10-02T08:00:00.000Z',
  subject: 'Your invoice for October',
  from: { value: [{ address: 'billing@cloud.example.com', name: 'Billing' }], text: 'Billing <billing@cloud.example.com>' },
  headers: headers({}),
  text: 'Invoice #4411. Payment due 15 October 2026. Amount: Rs. 4,200. View at https://cloud.example.com/billing/4411',
};

const NEWSLETTER = {
  id: '18f2a9c0d1e2f3f9',
  threadId: '18f2a9c0d1e2f3f9',
  date: '2026-10-02T09:00:00.000Z',
  subject: 'This week: 30% off our data science webinar series!',
  from: { value: [{ address: 'news@marketing.example.com', name: 'DataCo' }], text: 'DataCo <news@marketing.example.com>' },
  headers: headers({ 'List-Unsubscribe': '<https://marketing.example.com/unsub>', Precedence: 'bulk' }),
  html: '<p>Join our webinar on 12 October at 6 pm. Use coupon DATA30. <a href="https://marketing.example.com/webinar?utm=1">Sign up</a></p><p><a href="https://marketing.example.com/unsub">Unsubscribe</a></p>',
};

const OUT_OF_OFFICE = {
  id: '18f2a9c0d1e2f400',
  threadId: '18f2a9c0d1e2f400',
  date: '2026-10-02T10:00:00.000Z',
  subject: 'Automatic reply: Seminar on 15 October',
  from: { value: [{ address: 'prof.x@srmist.edu.in', name: 'Prof X' }], text: 'Prof X <prof.x@srmist.edu.in>' },
  headers: headers({ 'Auto-Submitted': 'auto-replied' }),
  text: 'I am out of office until 20 October.',
};

const CALENDAR_ACCEPTED = {
  id: '18f2a9c0d1e2f411',
  threadId: '18f2a9c0d1e2f411',
  date: '2026-10-02T11:00:00.000Z',
  subject: 'Accepted: Doctoral committee review @ Thu 15 Oct 2026 3pm',
  from: { value: [{ address: 'member@srmist.edu.in', name: 'Member' }], text: 'Member <member@srmist.edu.in>' },
  headers: headers({ 'Content-Type': 'text/calendar; method=REPLY' }),
  text: 'Member has accepted this invitation.',
};

const NO_ID = { threadId: 'x', subject: 'No id', text: 'hello' };

/** A successful Gemini generateContent response wrapping `extraction`. */
function geminiResponse(extraction, { finishReason = 'STOP', fenced = false, usage = { promptTokenCount: 1840, candidatesTokenCount: 212 } } = {}) {
  const text = JSON.stringify(extraction);
  return {
    candidates: [{ content: { role: 'model', parts: [{ text: fenced ? '```json\n' + text + '\n```' : text }] }, finishReason }],
    usageMetadata: { ...usage, totalTokenCount: (usage.promptTokenCount || 0) + (usage.candidatesTokenCount || 0) },
    modelVersion: 'gemini-2.5-flash',
  };
}

const SEMINAR_EXTRACTION = {
  isEvent: true,
  confidence: 0.95,
  title: 'Guest Lecture on Quantum Sensing',
  description: 'A guest lecture on quantum sensing by Dr. A. Kumar, organised by the Directorate of Research.',
  startDate: '2026-10-15',
  startTime: '10:30',
  endDate: '2026-10-15',
  endTime: '12:00',
  timezone: null,
  yearInferred: false,
  location: 'TP Ganesan Auditorium, Mini Hall 2',
  organizer: 'Directorate of Research',
  category: 'Research Talks',
  eventUrl: 'https://www.srmist.edu.in/events/quantum-sensing/',
  registrationUrl: 'https://forms.gle/qs-lecture-2026',
  meetingUrl: 'https://meet.google.com/abc-defg-hij',
};

module.exports = {
  SEMINAR_HTML,
  ZOOM_PLAIN,
  SAFELINKS_FORWARD,
  PASSWORD_RESET,
  INVOICE,
  NEWSLETTER,
  OUT_OF_OFFICE,
  CALENDAR_ACCEPTED,
  NO_ID,
  SEMINAR_EXTRACTION,
  geminiResponse,
};
