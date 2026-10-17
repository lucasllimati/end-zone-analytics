import { TEAM_STATS, leaderTerm, teamStatTerm, translateGameDetail, translateLeaderValue, translateScoringText } from '../../src/content/espnTerms';
import { METRICS } from '../../src/content/metrics';

describe('termos da ESPN em português', () => {
  it('traduz as estatísticas dos times pelo identificador ou pelo rótulo original', () => {
    expect(teamStatTerm('firstDowns', '1st Downs')?.pt).toBe('First downs');
    expect(teamStatTerm(undefined, '3rd down efficiency')?.pt).toBe('Conversões na 3ª descida');
    expect(teamStatTerm('desconhecida', 'Unknown stat')).toBeNull();
    for (const t of Object.values(TEAM_STATS)) expect(t.desc.length, t.en).toBeGreaterThan(20);
    expect(leaderTerm('passingYards', 'Passing Yards')?.pt).toBe('Jardas de passe');
  });

  it('traduz os valores dos destaques', () => {
    expect(translateLeaderValue('17/27, 107 YDS, 2 INT')).toBe('17/27, 107 jardas, 2 INT');
    expect(translateLeaderValue('17 CAR, 41 YDS, 1 TD')).toBe('17 corridas, 41 jardas, 1 TD');
    expect(translateLeaderValue('1 REC, 9 YDS')).toBe('1 recepção, 9 jardas');
  });

  it('traduz as descrições de pontuação mais comuns e preserva as desconhecidas', () => {
    expect(translateScoringText('Jason Myers 55 Yd Field Goal ')).toBe('Jason Myers: field goal de 55 jardas');
    expect(translateScoringText('J.K. Dobbins 4 Yd Rush (Wil Lutz Kick)')).toBe('J.K. Dobbins: corrida de 4 jardas (ponto extra de Wil Lutz)');
    expect(translateScoringText('George Holani 1 Yd Rush (Sam Darnold Pass to Rashid Shaheed for Two-Point Conversion)')).toBe(
      'George Holani: corrida de 1 jarda (2 pontos: passe de Sam Darnold para Rashid Shaheed)',
    );
    expect(translateScoringText('Puka Nacua 32 Yd pass from Matthew Stafford (Joshua Karty Kick)')).toBe(
      'Puka Nacua: recepção de 32 jardas, passe de Matthew Stafford (ponto extra de Joshua Karty)',
    );
    expect(translateScoringText('Algo totalmente novo')).toBe('Algo totalmente novo');
  });

  it('traduz a situação do jogo ao vivo', () => {
    expect(translateGameDetail('8:24 - 3rd')).toBe('8:24 · 3º quarto');
    expect(translateGameDetail('Halftime')).toBe('Intervalo');
    expect(translateGameDetail('Final/OT')).toBe('Final · prorrogação');
    expect(translateGameDetail('End of 1st')).toBe('Fim do 1º quarto');
  });

  it('toda métrica do site tem o nome original em inglês (mostrado no ⓘ)', () => {
    const missing = Object.entries(METRICS).filter(([, m]) => !m.en).map(([k]) => k);
    expect(missing).toEqual([]);
  });
});
