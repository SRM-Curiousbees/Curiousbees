import {
  cleanText,
  displayTime,
  displayTimeRange,
  emailAddress,
  emailDomain,
  isTrustedSender,
  isValidTimeZone,
  normalizeCategory,
  normalizeDate,
  normalizeTime,
  normalizeUrl,
  startTimeOf,
  titleKey,
  urlKey,
} from './normalize';

describe('event ingestion: normalising extracted values', () => {
  describe('dates', () => {
    it.each([
      ['2026-10-15', '2026-10-15'],
      ['2026-1-5', '2026-01-05'],
      ['15 October 2026', '2026-10-15'],
      ['15th October, 2026', '2026-10-15'],
      ['October 15, 2026', '2026-10-15'],
      ['Oct 15 2026', '2026-10-15'],
      ['15-Oct-2026', '2026-10-15'],
      ['1st Nov 2026', '2026-11-01'],
    ])('reads %p as %p', (input, expected) => {
      expect(normalizeDate(input)).toBe(expected);
    });

    it.each(['05/10/2026', '10-05-2026', 'tomorrow', 'next Friday', '2026-02-30', '31 June 2026', '', '15 Octember 2026', null, 42])(
      'refuses ambiguous or invalid %p instead of guessing',
      (input) => {
        expect(normalizeDate(input as any)).toBeNull();
      },
    );
  });

  describe('times', () => {
    it.each([
      ['10:00', '10:00'],
      ['9:30', '09:30'],
      ['14:30', '14:30'],
      ['10.30', '10:30'],
      ['2 pm', '14:00'],
      ['2:15 PM', '14:15'],
      ['10.30 a.m.', '10:30'],
      ['12 am', '00:00'],
      ['12:30 pm', '12:30'],
      ['16:00 hrs', '16:00'],
    ])('reads %p as %p', (input, expected) => {
      expect(normalizeTime(input)).toBe(expected);
    });

    it.each(['25:00', '13 pm', '10:75', 'noonish', 'morning', '', null])('refuses %p', (input) => {
      expect(normalizeTime(input as any)).toBeNull();
    });
  });

  it('accepts real IANA timezones only', () => {
    expect(isValidTimeZone('Asia/Kolkata')).toBe(true);
    expect(isValidTimeZone('Europe/London')).toBe(true);
    expect(isValidTimeZone('IST+5')).toBe(false);
    expect(isValidTimeZone('')).toBe(false);
  });

  describe('links', () => {
    it('keeps http(s) links and strips punctuation that email text wraps around them', () => {
      expect(normalizeUrl('https://srmist.edu.in/register.')).toBe('https://srmist.edu.in/register');
      expect(normalizeUrl('<https://meet.google.com/abc-defg-hij>')).toBe('https://meet.google.com/abc-defg-hij');
      expect(normalizeUrl('(https://forms.gle/xyz)')).toBe('https://forms.gle/xyz');
      expect(normalizeUrl('https://zoom.us/j/123?pwd=a1b2')).toBe('https://zoom.us/j/123?pwd=a1b2');
    });

    it('drops anything that is not a web link', () => {
      expect(normalizeUrl('javascript:alert(1)')).toBeNull();
      expect(normalizeUrl('mailto:office@srmist.edu.in')).toBeNull();
      expect(normalizeUrl('ftp://files.example.com/a')).toBeNull();
      expect(normalizeUrl('not a url')).toBeNull();
      expect(normalizeUrl('https://localhost/x')).toBeNull();
      expect(normalizeUrl(`https://a.com/${'x'.repeat(2100)}`)).toBeNull();
    });
  });

  it('builds title keys that ignore case, punctuation and forwarding prefixes', () => {
    expect(titleKey('Fwd: Re: International Research Symposium — 2026!')).toBe('international research symposium 2026');
    expect(titleKey('INTERNATIONAL  research symposium 2026')).toBe('international research symposium 2026');
  });

  it('reads senders from display-name headers', () => {
    expect(emailAddress('Research Office <Research.Office@SRMIST.edu.in>')).toBe('research.office@srmist.edu.in');
    expect(emailDomain('research.office@srmist.edu.in')).toBe('srmist.edu.in');
    expect(emailAddress('no address here')).toBeNull();
  });

  it('matches trusted senders by domain (including subdomains) or exact address', () => {
    const trusted = ['srmist.edu.in', 'events-desk@gmail.com'];
    expect(isTrustedSender('dean@srmist.edu.in', trusted)).toBe(true);
    expect(isTrustedSender('desk@ktr.srmist.edu.in', trusted)).toBe(true);
    expect(isTrustedSender('events-desk@gmail.com', trusted)).toBe(true);
    expect(isTrustedSender('someone@gmail.com', trusted)).toBe(false);
    expect(isTrustedSender('x@notsrmist.edu.in', trusted)).toBe(false);
    expect(isTrustedSender(null, trusted)).toBe(false);
    expect(isTrustedSender('dean@srmist.edu.in', [])).toBe(false);
  });

  it('trims text and caps its length', () => {
    expect(cleanText('  Seminar  ', 50)).toBe('Seminar');
    expect(cleanText('   ', 50)).toBeNull();
    expect(cleanText('x'.repeat(20), 10)).toHaveLength(10);
  });
  it('compares links by host, path and query, ignoring case, fragments and trailing slashes', () => {
    expect(urlKey('https://Forms.GLE/abc/')).toBe(urlKey('https://forms.gle/abc'));
    expect(urlKey('https://srmist.edu.in/events#register')).toBe(urlKey('https://srmist.edu.in/events'));
    expect(urlKey('https://zoom.us/j/123?pwd=a')).not.toBe(urlKey('https://zoom.us/j/123?pwd=b'));
    expect(urlKey('https://zoom.us/j/123')).not.toBe(urlKey('https://zoom.us/j/124'));
    expect(urlKey('javascript:alert(1)')).toBeNull();
  });

  it('writes times the way the event form does', () => {
    expect(displayTime('09:05')).toBe('09:05 AM');
    expect(displayTime('12:30')).toBe('12:30 PM');
    expect(displayTime('00:15')).toBe('12:15 AM');
    expect(displayTime('16:00')).toBe('04:00 PM');
    expect(displayTimeRange('10:00', '16:00')).toBe('10:00 AM - 04:00 PM');
    expect(displayTimeRange('10:00', null)).toBe('10:00 AM');
  });

  it('reads the start time from either stored format', () => {
    expect(startTimeOf('10:00 AM - 04:00 PM')).toBe('10:00');
    expect(startTimeOf('02:30\u202fPM - 04:00\u202fPM')).toBe('14:30');
    expect(startTimeOf('14:30')).toBe('14:30');
    expect(startTimeOf('TBA')).toBeNull();
    expect(startTimeOf(null)).toBeNull();
  });

  it("maps categories onto the event form's list", () => {
    expect(normalizeCategory('Workshops')).toBe('Workshops');
    expect(normalizeCategory('seminars')).toBe('Seminars');
    expect(normalizeCategory('International Symposium')).toBe('Conferences');
    expect(normalizeCategory('Hands-on workshop')).toBe('Workshops');
    expect(normalizeCategory('FDP on research methods')).toBe('Faculty Development');
    expect(normalizeCategory('PhD viva voce')).toBe('PhD / Research Scholar Events');
    expect(normalizeCategory('Guest lecture')).toBe('Research Talks');
    expect(normalizeCategory('Webinar')).toBe('Webinars');
    expect(normalizeCategory('Cultural fest')).toBe('Other');
    expect(normalizeCategory('  ')).toBeNull();
  });
});
