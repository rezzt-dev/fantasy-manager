import type { EnrichedMatch, MatchEvent, MatchSummary, MatchLineup } from '../../../types/fantasy';

/**
 * Generador de resumen de partido a partir de los datos que ya tenemos.
 *
 * El objetivo es ofrecer un texto legible sin depender de fuentes externas
 * inestables. Cuando haya endpoints fiables (RSS, APIs de medios, etc.) se
 * puede añadir `fetchExternalMatchSummary` como primer intento y usar esta
 * función como fallback.
 */

function extractPlayerName(detail?: string): string {
  if (!detail) return 'Jugador';
  // El detalle suele venir como "Autor · amarilla" o "Autor (razón)".
  return detail.split(' · ')[0].split(' (')[0].trim() || 'Jugador';
}

function formatMinute(minute: number | null): string {
  if (minute === null) return '';
  return `${minute}'`;
}

function sentenceForResult(match: EnrichedMatch): string {
  const home = match.home;
  const away = match.away;
  const homeScore = home.score ?? 0;
  const awayScore = away.score ?? 0;

  if (match.status === 'finished') {
    if (homeScore > awayScore) return `${home.name} venció a ${away.name} por ${homeScore}-${awayScore}.`;
    if (awayScore > homeScore) return `${away.name} se impuso a ${home.name} por ${awayScore}-${homeScore}.`;
    return `${home.name} y ${away.name} empataron ${homeScore}-${awayScore}.`;
  }

  if (match.status === 'live' || match.status === 'halftime') {
    const minute = match.minute;
    const minuteText = minute !== null ? ` en el minuto ${minute}` : '';
    const phaseText = match.phase === 'descanso' ? ' al descanso' : '';
    if (homeScore > awayScore) return `${home.name} está venciendo a ${away.name} ${homeScore}-${awayScore}${minuteText}${phaseText}.`;
    if (awayScore > homeScore) return `${away.name} está ganando a ${home.name} ${awayScore}-${homeScore}${minuteText}${phaseText}.`;
    return `${home.name} y ${away.name} empatan ${homeScore}-${awayScore}${minuteText}${phaseText}.`;
  }

  if (match.status === 'pending') return `El partido entre ${home.name} y ${away.name} aún no ha comenzado.`;
  if (match.status === 'postponed') return `El partido entre ${home.name} y ${away.name} ha sido aplazado.`;
  if (match.status === 'canceled') return `El partido entre ${home.name} y ${away.name} ha sido cancelado.`;
  return `${home.name} recibe a ${away.name}.`;
}

function sentenceForGoals(events: MatchEvent[]): string {
  const goals = events.filter((e) => e.type === 'goal' && e.minute !== null);
  if (goals.length === 0) return '';

  const parts = goals.map((e) => {
    const author = extractPlayerName(e.detail);
    const suffix = e.isHome === false ? ` (${e.isHome === null ? '' : 'visitante'})` : '';
    return `${author} ${formatMinute(e.minute)}${suffix}`;
  });

  return `Goles: ${parts.join(', ')}.`;
}

function sentenceForRedCards(events: MatchEvent[]): string {
  const reds = events.filter(
    (e) => e.type === 'card' && (e.detail?.includes('roja') || e.detail?.includes('doble amarilla')) && e.minute !== null,
  );
  if (reds.length === 0) return '';

  const parts = reds.map((e) => `${extractPlayerName(e.detail)} ${formatMinute(e.minute)}`);
  return `Expulsiones: ${parts.join(', ')}.`;
}

function sentenceForSquadPlayers(match: EnrichedMatch): string {
  const players = match.squadPlayers;
  if (players.length === 0) return '';

  const names = players.map((p) => `${p.nickname} (${p.isHome ? match.home.shortName ?? match.home.name : match.away.shortName ?? match.away.name})`);
  return `Jugadores de tu plantilla implicados: ${names.join(', ')}.`;
}

function sentenceForLineups(lineups?: MatchLineup): string {
  if (!lineups) return '';
  const homeFormation = lineups.home.formation ? ` (${lineups.home.formation})` : '';
  const awayFormation = lineups.away.formation ? ` (${lineups.away.formation})` : '';
  return `Alineaciones disponibles: ${lineups.home.teamName}${homeFormation} vs ${lineups.away.teamName}${awayFormation}.`;
}

/**
 * Crea un resumen textual en español a partir del marcador, eventos y
 * alineaciones del partido.
 */
export function generateMatchSummary(match: EnrichedMatch): MatchSummary {
  const sentences: string[] = [sentenceForResult(match)];

  const goals = sentenceForGoals(match.events);
  if (goals) sentences.push(goals);

  const reds = sentenceForRedCards(match.events);
  if (reds) sentences.push(reds);

  const lineups = sentenceForLineups(match.lineups);
  if (lineups) sentences.push(lineups);

  const squad = sentenceForSquadPlayers(match);
  if (squad) sentences.push(squad);

  return {
    text: sentences.join(' '),
    source: 'generated',
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Stub para futuras integraciones con medios (Marca, AS, Fútbol Fantasy, …).
 *
 * La idea es intentar primero una fuente externa con un fetch identificable y
 * caché corta; si falla, volver a `generateMatchSummary`. Por ahora devuelve
 * null para que el motor siempre use el resumen generado.
 */
export async function fetchExternalMatchSummary(_match: EnrichedMatch): Promise<MatchSummary | null> {
  // TODO: integrar fuente externa cuando exista un endpoint RSS/API estable.
  return null;
}
