import { compactSpeech, similarity } from '@/lib/voice/parseVoiceInput';

const FUZZY_THRESHOLD = 0.72;

function scoreContains(transcript: string, name: string): number {
  const t = compactSpeech(transcript);
  const n = compactSpeech(name);
  if (!n) return 0;
  if (t === n) return 100;
  if (t.includes(n)) return 92;
  if (n.length >= 2 && t.includes(n.slice(0, 2)) && t.length <= n.length + 4) return 80;
  return 0;
}

function scoreFuzzy(transcript: string, name: string): number {
  const t = compactSpeech(transcript);
  const n = compactSpeech(name);
  if (n.length < 2) return 0;
  const sim = similarity(t, n);
  if (sim >= FUZZY_THRESHOLD) return Math.round(70 * sim);
  return 0;
}

/** 음성에서 환자 이름 매칭 */
export function matchPatient(
  transcript: string,
  patients: { id: string; name: string }[],
): string | null {
  if (!transcript.trim()) return null;

  let bestId: string | null = null;
  let bestScore = 0;

  for (const p of patients) {
    const firstName = p.name.length >= 2 ? p.name.slice(1) : p.name;
    const candidates = [p.name, firstName];

    let score = 0;
    for (const c of candidates) {
      score = Math.max(score, scoreContains(transcript, c), scoreFuzzy(transcript, c));
    }

    if (score > bestScore) {
      bestScore = score;
      bestId = p.id;
    }
  }

  return bestScore >= 70 ? bestId : null;
}

/** "이서연 환자에게 ..." 형태에서 환자 이름 추출 시도 */
export function extractPatientFromPhrase(
  transcript: string,
  patients: { id: string; name: string }[],
): string | null {
  const direct = matchPatient(transcript, patients);
  if (direct) return direct;

  const m = transcript.match(/(.+?)\s*환자/);
  if (m?.[1]) return matchPatient(m[1], patients);

  return null;
}
