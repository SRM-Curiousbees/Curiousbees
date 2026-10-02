import { AUTO_CREATE_CONFIDENCE, decide, Extraction } from './decision';

const NOW = new Date('2026-10-01T06:30:00Z'); // 12:00 in Asia/Kolkata

function extraction(overrides: Partial<Extraction> = {}): Extraction {
  return {
    isEvent: true,
    confidence: 0.96,
    title: 'International Research Symposium 2026',
    description: 'Talks and posters from doctoral scholars.',
    startDate: '2026-10-15',
    startTime: '10:00',
    endDate: '2026-10-15',
    endTime: '16:00',
    timezone: 'Asia/Kolkata',
    location: 'University Auditorium',
    organizer: 'Directorate of Research',
    category: 'Research Event',
    eventUrl: 'https://srmist.edu.in/symposium',
    registrationUrl: 'https://forms.gle/register-symposium',
    meetingUrl: null,
    ...overrides,
  };
}

const trusted = { trustedSender: true, now: NOW };

describe('event ingestion: deciding what happens to an email', () => {
  it('creates a complete, confident event from a trusted sender', () => {
    const d = decide(extraction(), trusted);
    expect(d.outcome).toBe('create');
    expect(d.reasons).toEqual([]);
    expect(d.event).toMatchObject({
      title: 'International Research Symposium 2026',
      startDate: '2026-10-15',
      startTime: '10:00',
      timezone: 'Asia/Kolkata',
      registrationUrl: 'https://forms.gle/register-symposium',
      eventUrl: 'https://srmist.edu.in/symposium',
    });
  });

  it('drops emails that are not events', () => {
    expect(decide(extraction({ isEvent: false }), trusted).outcome).toBe('not_event');
  });

  it('drops low-confidence classifications', () => {
    const d = decide(extraction({ confidence: 0.55 }), trusted);
    expect(d.outcome).toBe('not_event');
    expect(d.reasons[0]).toMatch(/below 0.7/);
  });

  it('sends medium confidence to review', () => {
    const d = decide(extraction({ confidence: 0.8 }), trusted);
    expect(d.outcome).toBe('review');
    expect(d.reasons.join()).toMatch(/needs a review/);
  });

  it('auto-creates exactly at the threshold', () => {
    expect(decide(extraction({ confidence: AUTO_CREATE_CONFIDENCE }), trusted).outcome).toBe('create');
  });

  it('never invents a missing date: sends it to review', () => {
    const d = decide(extraction({ startDate: null, endDate: null }), trusted);
    expect(d.outcome).toBe('review');
    expect(d.reasons).toContain('Missing a reliable date');
    expect(d.event.startDate).toBeNull();
  });

  it('never invents a missing start time: sends it to review', () => {
    const d = decide(extraction({ startTime: null, endTime: null }), trusted);
    expect(d.outcome).toBe('review');
    expect(d.reasons).toContain('Missing a reliable start time');
    expect(d.event.startTime).toBeNull();
  });

  it('refuses relative or ambiguous dates the AI passed through', () => {
    const d = decide(extraction({ startDate: 'tomorrow' }), trusted);
    expect(d.outcome).toBe('review');
    expect(d.reasons).toContain('The start date could not be read reliably');
    const numeric = decide(extraction({ startDate: '05/11/2026' }), trusted);
    expect(numeric.outcome).toBe('review');
  });

  it('accepts other unambiguous date and time formats', () => {
    const d = decide(extraction({ startDate: '15 October 2026', startTime: '10.00 a.m.', endDate: 'Oct 15, 2026', endTime: '4 pm' }), trusted);
    expect(d.outcome).toBe('create');
    expect(d.event).toMatchObject({ startDate: '2026-10-15', startTime: '10:00', endTime: '16:00' });
  });

  it('sends a missing title to review', () => {
    expect(decide(extraction({ title: '  ' }), trusted).reasons).toContain('Missing title');
  });

  it('sends events from untrusted senders to review rather than dropping them', () => {
    const d = decide(extraction(), { trustedSender: false, now: NOW });
    expect(d.outcome).toBe('review');
    expect(d.reasons).toContain('The sender is not on the trusted list');
  });

  it('sends past events and implausible end times to review', () => {
    expect(decide(extraction({ startDate: '2026-09-20', endDate: null }), trusted).reasons).toContain('The event date has already passed');
    expect(decide(extraction({ endTime: '09:00' }), trusted).reasons).toContain('The end time is not after the start time');
    expect(decide(extraction({ endDate: '2026-10-10' }), trusted).reasons).toContain('The end date is before the start date');
    expect(decide(extraction({ startDate: '2029-01-01', endDate: null }), trusted).reasons).toContain('The event is more than two years away');
  });

  it('treats today in Asia/Kolkata as upcoming, not past', () => {
    // 2026-10-01 at 23:30 UTC is already 2 October in Kolkata.
    const lateUtc = new Date('2026-10-01T23:30:00Z');
    const d = decide(extraction({ startDate: '2026-10-02', endDate: null }), { trustedSender: true, now: lateUtc });
    expect(d.reasons).not.toContain('The event date has already passed');
  });

  describe('timezones', () => {
    it('uses Asia/Kolkata when the email names no timezone', () => {
      expect(decide(extraction({ timezone: null }), trusted).event.timezone).toBe('Asia/Kolkata');
    });

    it('keeps an explicit timezone', () => {
      const d = decide(extraction({ timezone: 'Europe/London' }), trusted);
      expect(d.outcome).toBe('create');
      expect(d.event.timezone).toBe('Europe/London');
    });

    it('sends an unrecognised timezone to review', () => {
      const d = decide(extraction({ timezone: 'IST+5' }), trusted);
      expect(d.outcome).toBe('review');
      expect(d.reasons.join()).toMatch(/Unrecognised timezone/);
    });
  });

  describe('links', () => {
    it('keeps registration, details and meeting links separately', () => {
      const d = decide(
        extraction({
          eventUrl: 'https://srmist.edu.in/events/ai-seminar',
          registrationUrl: 'https://forms.gle/abc',
          meetingUrl: 'https://meet.google.com/abc-defg-hij',
        }),
        trusted,
      );
      expect(d.event).toMatchObject({
        eventUrl: 'https://srmist.edu.in/events/ai-seminar',
        registrationUrl: 'https://forms.gle/abc',
        meetingUrl: 'https://meet.google.com/abc-defg-hij',
      });
    });

    it('drops unsafe links without blocking the event', () => {
      const d = decide(extraction({ registrationUrl: 'javascript:alert(1)' }), trusted);
      expect(d.outcome).toBe('create');
      expect(d.event.registrationUrl).toBeNull();
    });
  });
});
