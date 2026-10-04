export interface SRMVenue {
  id: string;
  name: string;
  building: string;
  floor?: string;
  room?: string;
  capacity?: number;
  campus: string;
  group: 'MAJOR_VENUES' | 'TECH_PARK_2' | 'CUSTOM';
  category?: 'AUDITORIUM' | 'SEMINAR_HALL' | 'LECTURE_HALL' | 'CUSTOM';
  details?: string;
}

export const SRM_MAJOR_VENUES: SRMVenue[] = [
  {
    id: 'dr-tp-ganesan-auditorium',
    name: 'Dr. T. P. Ganesan Auditorium',
    building: 'Main Auditorium',
    capacity: 3000,
    campus: 'SRM KTR',
    group: 'MAJOR_VENUES',
    category: 'AUDITORIUM'
  },
  {
    id: 'mini-hall-1',
    name: 'Mini Hall - 1',
    building: 'Dr. T. P. Ganesan Auditorium',
    capacity: 300,
    campus: 'SRM KTR',
    group: 'MAJOR_VENUES',
    category: 'SEMINAR_HALL'
  },
  {
    id: 'mini-hall-2',
    name: 'Mini Hall - 2',
    building: 'Dr. T. P. Ganesan Auditorium',
    capacity: 250,
    campus: 'SRM KTR',
    group: 'MAJOR_VENUES',
    category: 'SEMINAR_HALL'
  },
  {
    id: 'dr-venkatraman-ramakrishnan-hall',
    name: 'Dr. Venkatraman Ramakrishnan Hall',
    building: 'University Building',
    floor: '15th Floor',
    capacity: 60,
    campus: 'SRM KTR',
    group: 'MAJOR_VENUES',
    category: 'SEMINAR_HALL'
  },
  {
    id: 'dr-s-radhakrishnan-hall',
    name: 'Dr. S. Radhakrishnan Hall',
    building: 'University Building',
    floor: '15th Floor',
    capacity: 30,
    campus: 'SRM KTR',
    group: 'MAJOR_VENUES',
    category: 'SEMINAR_HALL'
  },
  {
    id: 'ramanujan-hall',
    name: 'Ramanujan Hall',
    building: 'Tech Park',
    floor: '1st Floor',
    capacity: 60,
    campus: 'SRM KTR',
    group: 'MAJOR_VENUES',
    category: 'SEMINAR_HALL'
  },
  {
    id: 'turing-hall',
    name: 'Turing Hall',
    building: 'Tech Park',
    floor: '8th Floor',
    capacity: 120,
    campus: 'SRM KTR',
    group: 'MAJOR_VENUES',
    category: 'SEMINAR_HALL'
  },
  {
    id: 'sir-jc-bose-hall',
    name: 'Sir J. C. Bose Hall',
    building: 'Tech Park',
    floor: '12th Floor',
    capacity: 120,
    campus: 'SRM KTR',
    group: 'MAJOR_VENUES',
    category: 'SEMINAR_HALL'
  },
  {
    id: 'prof-gn-ramachandran-hall',
    name: 'Prof. G. N. Ramachandran Hall',
    building: 'Bio Engineering Block',
    floor: '6th Floor',
    capacity: 300,
    campus: 'SRM KTR',
    group: 'MAJOR_VENUES',
    category: 'SEMINAR_HALL'
  },
  {
    id: 'faraday-hall',
    name: 'Faraday Hall',
    building: 'ES Block',
    floor: '2nd Floor',
    capacity: 600,
    campus: 'SRM KTR',
    group: 'MAJOR_VENUES',
    category: 'AUDITORIUM'
  },
  {
    id: 'gd-naidu-hall',
    name: 'G. D. Naidu Hall',
    building: 'Mechanical B Block',
    floor: '1st Floor',
    capacity: 300,
    campus: 'SRM KTR',
    group: 'MAJOR_VENUES',
    category: 'SEMINAR_HALL'
  },
  {
    id: 'sir-vishveshvaraya-hall',
    name: 'Sir. Vishveshvaraya Hall',
    building: 'CRC Block · Main Campus',
    capacity: 120,
    campus: 'SRM KTR',
    group: 'MAJOR_VENUES',
    category: 'SEMINAR_HALL'
  },
  {
    id: 'hippocrates-auditorium',
    name: 'Hippocrates Auditorium',
    building: 'Medical College',
    capacity: 600,
    campus: 'SRM KTR',
    group: 'MAJOR_VENUES',
    category: 'AUDITORIUM'
  }
];

export const SRM_TECH_PARK_2_VENUES: SRMVenue[] = [
  {
    id: 'tp2-7th-floor-seminar-hall',
    name: '7th Floor Seminar Hall',
    building: 'Tech Park 2',
    floor: '7th Floor',
    campus: 'SRM KTR',
    group: 'TECH_PARK_2',
    category: 'SEMINAR_HALL'
  },
  {
    id: 'tp2-14th-floor-seminar-hall',
    name: '14th Floor Seminar Hall',
    building: 'Tech Park 2',
    floor: '14th Floor',
    campus: 'SRM KTR',
    group: 'TECH_PARK_2',
    category: 'SEMINAR_HALL'
  },
  // 2nd Floor
  { id: 'tp2-lh204', name: 'LH204', building: 'Tech Park 2', floor: '2nd Floor', room: 'LH204', campus: 'SRM KTR', group: 'TECH_PARK_2', category: 'LECTURE_HALL' },
  { id: 'tp2-lh205', name: 'LH205', building: 'Tech Park 2', floor: '2nd Floor', room: 'LH205', campus: 'SRM KTR', group: 'TECH_PARK_2', category: 'LECTURE_HALL' },
  { id: 'tp2-lh221', name: 'LH221', building: 'Tech Park 2', floor: '2nd Floor', room: 'LH221', campus: 'SRM KTR', group: 'TECH_PARK_2', category: 'LECTURE_HALL' },
  // 3rd Floor
  { id: 'tp2-lh304', name: 'LH304', building: 'Tech Park 2', floor: '3rd Floor', room: 'LH304', campus: 'SRM KTR', group: 'TECH_PARK_2', category: 'LECTURE_HALL' },
  { id: 'tp2-lh319', name: 'LH319', building: 'Tech Park 2', floor: '3rd Floor', room: 'LH319', campus: 'SRM KTR', group: 'TECH_PARK_2', category: 'LECTURE_HALL' },
  { id: 'tp2-lh320', name: 'LH320', building: 'Tech Park 2', floor: '3rd Floor', room: 'LH320', campus: 'SRM KTR', group: 'TECH_PARK_2', category: 'LECTURE_HALL' },
  // 5th Floor
  { id: 'tp2-lh505', name: 'LH505', building: 'Tech Park 2', floor: '5th Floor', room: 'LH505', campus: 'SRM KTR', group: 'TECH_PARK_2', category: 'LECTURE_HALL' },
  { id: 'tp2-lh506', name: 'LH506', building: 'Tech Park 2', floor: '5th Floor', room: 'LH506', campus: 'SRM KTR', group: 'TECH_PARK_2', category: 'LECTURE_HALL' },
  { id: 'tp2-lh519', name: 'LH519', building: 'Tech Park 2', floor: '5th Floor', room: 'LH519', campus: 'SRM KTR', group: 'TECH_PARK_2', category: 'LECTURE_HALL' },
  { id: 'tp2-cls523', name: 'CLS523', building: 'Tech Park 2', floor: '5th Floor', room: 'CLS523', campus: 'SRM KTR', group: 'TECH_PARK_2', category: 'LECTURE_HALL' },
  // 6th Floor
  { id: 'tp2-lh604', name: 'LH604', building: 'Tech Park 2', floor: '6th Floor', room: 'LH604', campus: 'SRM KTR', group: 'TECH_PARK_2', category: 'LECTURE_HALL' },
  { id: 'tp2-lh605', name: 'LH605', building: 'Tech Park 2', floor: '6th Floor', room: 'LH605', campus: 'SRM KTR', group: 'TECH_PARK_2', category: 'LECTURE_HALL' },
  { id: 'tp2-lh613', name: 'LH613', building: 'Tech Park 2', floor: '6th Floor', room: 'LH613', campus: 'SRM KTR', group: 'TECH_PARK_2', category: 'LECTURE_HALL' },
  { id: 'tp2-lh614', name: 'LH614', building: 'Tech Park 2', floor: '6th Floor', room: 'LH614', campus: 'SRM KTR', group: 'TECH_PARK_2', category: 'LECTURE_HALL' },
  // 7th Floor
  { id: 'tp2-room702', name: 'Room 702', building: 'Tech Park 2', floor: '7th Floor', room: 'Room 702', campus: 'SRM KTR', group: 'TECH_PARK_2', category: 'LECTURE_HALL' },
  { id: 'tp2-room712', name: 'Room 712', building: 'Tech Park 2', floor: '7th Floor', room: 'Room 712', campus: 'SRM KTR', group: 'TECH_PARK_2', category: 'LECTURE_HALL' },
  // 8th Floor
  { id: 'tp2-room806', name: 'Room 806', building: 'Tech Park 2', floor: '8th Floor', room: 'Room 806', campus: 'SRM KTR', group: 'TECH_PARK_2', category: 'LECTURE_HALL' },
  // 11th Floor
  { id: 'tp2-room1105', name: 'Room 1105', building: 'Tech Park 2', floor: '11th Floor', room: 'Room 1105', campus: 'SRM KTR', group: 'TECH_PARK_2', category: 'LECTURE_HALL' }
];

export const ALL_SRM_VENUES = [...SRM_MAJOR_VENUES, ...SRM_TECH_PARK_2_VENUES];

export function formatVenueDisplay(venueString: string | undefined | null) {
  // No venue stays empty (shown as "Venue to be announced"); never substitute a default place.
  if (!venueString) return { title: '', subtitle: '', details: '' };

  if (venueString.startsWith('{') && venueString.endsWith('}')) {
    try {
      const data = JSON.parse(venueString);
      const subParts = [data.building, data.floor].filter(Boolean);
      return {
        title: data.name || data.customName || venueString,
        subtitle: subParts.join(' · '),
        details: data.capacity ? `${data.capacity} seats` : (data.details || '')
      };
    } catch (e) {}
  }

  if (venueString.includes('|')) {
    const parts = venueString.split('|').map(s => s.trim());
    return {
      title: parts[0] || venueString,
      subtitle: parts[1] || '',
      details: parts[2] || ''
    };
  }

  return {
    title: venueString,
    subtitle: '',
    details: ''
  };
}

export function encodeVenueObject(venue: Partial<SRMVenue> & { customName?: string; customDetails?: string }): string {
  const parts = [venue.name || venue.customName || ''];
  const sub = [venue.building, venue.floor].filter(Boolean).join(' · ');
  if (sub) parts.push(sub);
  if (venue.capacity) parts.push(`${venue.capacity} seats`);
  else if (venue.customDetails) parts.push(venue.customDetails);
  
  // Return formatted pipe string: "Turing Hall | Tech Park · 8th Floor | 120 seats"
  return parts.join(' | ');
}
