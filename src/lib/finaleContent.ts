/**
 * Narrative callback and Bhai Dooj Finale message copy.
 *
 * CREATOR PLACEHOLDER NOTICE:
 * Review and edit `CREATOR_BHAI_DOOJ_LETTER` below (or approve this draft)
 * before Phase 5 final release readiness.
 */

export const KITAABI_CALLBACK_BEAT = {
  eyebrow: 'FROM ONLINE CHATS TO BHAI DOOJ',
  title: 'Kitaabi Dastaan se Bhai Dooj Tak',
  paragraphs: [
    'Who knew those late book-circle conversations and phone calls on Kitaabi Dastaan would turn into early morning bus and train journeys, scooter rides along Rishikesh bends, ~400 temple stairs together, and feeling like real family.',
    'Because miles didn’t get to stop us from making memories in the hills, here is our own little Bhai Dooj celebration right here.',
  ],
  cta: 'Enter Bhai Dooj Celebration →',
} as const;

export const CREATOR_BHAI_DOOJ_LETTER = {
  title: 'Happy Bhai Dooj, Ishaan',
  salutation: 'Dear Ishaan,',
  paragraphs: [
    '[Creator Placeholder — Approve or Personalize Before Release]',
    'From talking about books on Kitaabi Dastaan to finally walking together through Rishikesh — waiting through late morning laughs, climbing Baal Kuwari’s endless steps when neither of us wanted to rush, and rushing back down safely before the evening bus — thank you for making the trip unforgettable and for being someone I can always count on like my own brother.',
    'May we keep getting more mountain rides, warm chai stops, and moments where distance never feels far at all.',
  ],
  closing: 'Wishing you the happiest Bhai Dooj always,',
  signature: '— Shree',
  creatorDraftNotice:
    'Draft note included for creator review before Phase 5 final release.',
} as const;

/**
 * Special requested song metadata for the Bhai Dooj celebration finale.
 * "Bhai Ne Meri Ladki" maps to the traditional Gujarati brother-sister song
 * "Bhai Ni Beni Ladki (Kon Halave Limdi)" written by Avinash Vyas.
 */
export const BHAI_DOOJ_SPECIAL_TRACK_SPEC = {
  requestedName: 'Bhai Ne Meri Ladki',
  confirmedTraditionalTitle: 'Bhai Ni Beni Ladki (Kon Halave Limdi)',
  lyricist: 'Avinash Vyas (classic Gujarati folk song)',
  status: 'awaiting_creator_version',
  note: 'Multiple singer versions exist (e.g., Hosh Barot, Poonam Gondaliya, Pravin Rawat). Attach your preferred local audio file inside Memories or on the Finale card; otherwise a gentle warm procedural theme plays.',
} as const;

/**
 * Dedicated local audio slot specification for Neelkanth Mahadev Temple entry & darshan.
 */
export const NEELKANTH_TEMPLE_TRACK_SPEC = {
  requestedName: 'Har Har Mahadev',
  status: 'awaiting_creator_version',
  note: 'Attach your preferred local "Har Har Mahadev" devotional audio file via the local audio picker for temple entrance playback; warm temple bell & courtyard ambience play as automatic fallback.',
} as const;

