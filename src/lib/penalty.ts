import type { Penalty } from '../content/penalties';

export interface PenaltyOutcome {
  beforeYtg: number;
  afterYtg: number;
  result: string;
}

/**
 * Exemplo didático de aplicação de uma penalidade a partir de 1st & 10 na própria linha de 40
 * (60 jardas até a end zone adversária). Faltas "no local" usam um local ilustrativo.
 */
export function penaltyOutcome(p: Penalty, beforeYtg = 60): PenaltyOutcome {
  const offense = p.side === 'Ataque';
  if (p.id === 'dpi') return { beforeYtg, afterYtg: beforeYtg - 30, result: 'Bola no local da falta (exemplo: 30 jardas à frente) e 1st & 10 para o ataque.' };
  if (p.id === 'grounding') return { beforeYtg, afterYtg: beforeYtg + 8, result: 'Bola no local do arremesso (exemplo: 8 jardas atrás) e perda do down: 2nd & 18.' };
  if (p.id === 'holding-off' && p.spot) return { beforeYtg, afterYtg: beforeYtg + p.yards, result: `10 jardas para trás e o down se repete: 1st & ${10 + p.yards}.` };
  if (offense) {
    return { beforeYtg, afterYtg: beforeYtg + p.yards, result: `${p.yards} jardas para trás e o down se repete: 1st & ${10 + p.yards}.` };
  }
  const after = beforeYtg - p.yards;
  if (p.autoFirst) return { beforeYtg, afterYtg: after, result: `${p.yards} jardas para frente e first down automático: 1st & 10.` };
  return { beforeYtg, afterYtg: after, result: `${p.yards} jardas para frente: 1st & ${Math.max(1, 10 - p.yards)}.` };
}
