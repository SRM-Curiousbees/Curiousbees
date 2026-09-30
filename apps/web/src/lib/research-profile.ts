// Older research profiles were created with placeholder text; treat it as "not set".
const PLACEHOLDER_TITLES = new Set(['Scholar Thesis Research Project']);
const PLACEHOLDER_ABSTRACTS = new Set(['Primary doctoral thesis research project and scholarly milestone tracking.']);

export function thesisTitle(profile?: { title?: string | null } | null): string | null {
  const t = profile?.title?.trim();
  return t && !PLACEHOLDER_TITLES.has(t) ? t : null;
}

export function thesisAbstract(profile?: { abstract?: string | null } | null): string | null {
  const a = profile?.abstract?.trim();
  return a && !PLACEHOLDER_ABSTRACTS.has(a) ? a : null;
}
