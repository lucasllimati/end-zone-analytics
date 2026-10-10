/** Testes de integridade do conteúdo editorial (evitam links quebrados e dados inconsistentes). */
import fs from 'node:fs';
import path from 'node:path';
import { GLOSSARY } from '../../src/content/glossary';
import { PENALTIES } from '../../src/content/penalties';
import { FORMATIONS, POSITIONS } from '../../src/content/positions';
import { PLAYS } from '../../src/content/playbook';
import { METRICS } from '../../src/content/metrics';
import { NAV } from '../../src/content/nav';
import { RIVALRIES } from '../../src/content/rivalries';
import { ERAS } from '../../src/content/history';
import { ACTIVE_TEAMS } from '../../src/lib/teams';

const app = fs.readFileSync(path.resolve(__dirname, '../../src/App.tsx'), 'utf8');

describe('conteúdo', () => {
  it('termos relacionados do glossário existem e ids são únicos', () => {
    const ids = new Set(GLOSSARY.map((g) => g.id));
    expect(ids.size).toBe(GLOSSARY.length);
    for (const g of GLOSSARY) for (const r of g.related) expect(ids.has(r), `${g.id} → ${r}`).toBe(true);
  });

  it('o glossário cobre todos os termos pedidos no escopo', () => {
    const required = ['sack', 'blitz', 'pick-six', 'fumble', 'interception', 'fair-catch', 'punt', 'snap', 'audible', 'rpo', 'play-action', 'nickel', 'dime', 'red-zone', 'pocket', 'coverage', 'passer-rating', 'epa'];
    for (const r of required) expect(GLOSSARY.some((g) => g.id === r), r).toBe(true);
  });

  it('cada termo tem definição simples, avançada e exemplo', () => {
    for (const g of GLOSSARY) {
      expect(g.simple.length, g.id).toBeGreaterThan(20);
      expect(g.advanced.length, g.id).toBeGreaterThan(20);
      expect(g.example.length, g.id).toBeGreaterThan(5);
    }
  });

  it('todas as posições do escopo existem e as formações têm 11 jogadores do ataque/defesa', () => {
    const required = ['QB', 'RB', 'FB', 'WR', 'TE', 'OT', 'OG', 'C', 'DE', 'DT', 'NT', 'EDGE', 'LB', 'MLB', 'OLB', 'CB', 'S', 'FS', 'SS', 'K', 'P', 'LS', 'KR', 'PR'];
    for (const r of required) expect(POSITIONS.some((p) => p.id === r), r).toBe(true);
    expect(FORMATIONS.offense.dots.filter((d) => d.team === 'off')).toHaveLength(11);
    expect(FORMATIONS.defense.dots.filter((d) => d.team === 'def')).toHaveLength(11);
    expect(FORMATIONS.special.dots.filter((d) => d.team === 'off')).toHaveLength(11);
    for (const f of Object.values(FORMATIONS)) for (const d of f.dots) expect(POSITIONS.some((p) => p.id === d.pos), d.pos).toBe(true);
  });

  it('playbook cobre as jogadas do escopo e as animações têm caminhos válidos', () => {
    const required = ['inside-zone', 'outside-zone', 'power', 'counter', 'sweep', 'draw', 'trap', 'slant', 'curl', 'out', 'in', 'dig', 'post', 'corner', 'fade', 'screen', 'wheel', 'bootleg', 'play-action', 'rpo', 'cover-0', 'cover-1', 'cover-2', 'cover-3', 'cover-4', 'cover-6', 'man', 'zone', 'blitz'];
    for (const r of required) expect(PLAYS.some((p) => p.id === r), r).toBe(true);
    for (const p of PLAYS) {
      for (const a of p.actors) {
        if (!a.path) continue;
        expect(a.path.length, `${p.id}/${a.id}`).toBeGreaterThanOrEqual(2);
        for (const [x, y] of a.path) {
          expect(x, `${p.id}/${a.id}`).toBeGreaterThanOrEqual(0);
          expect(x).toBeLessThanOrEqual(600);
          expect(y).toBeGreaterThanOrEqual(0);
          expect(y).toBeLessThanOrEqual(380);
        }
      }
      expect(p.actors.filter((a) => a.team === 'off')).toHaveLength(11);
    }
  });

  it('penalidades têm sinal e explicação; todas as do escopo existem', () => {
    const required = ['holding-off', 'false-start', 'offside', 'encroachment', 'dpi', 'holding-def', 'roughing-passer', 'grounding', 'illegal-formation', 'illegal-motion', 'illegal-shift', 'delay', 'facemask', 'unnecessary-roughness'];
    for (const r of required) expect(PENALTIES.some((p) => p.id === r), r).toBe(true);
    for (const p of PENALTIES) {
      expect(p.signal.length).toBeGreaterThan(5);
      expect(p.simple.length).toBeGreaterThan(10);
    }
  });

  it('toda métrica tem rótulo e explicações simples e técnicas', () => {
    for (const [k, m] of Object.entries(METRICS)) {
      expect(m.label, k).toBeTruthy();
      expect(m.simple.length, k).toBeGreaterThan(10);
      expect(m.expert.length, k).toBeGreaterThan(3);
    }
  });

  it('todas as rotas do menu existem no roteador', () => {
    for (const g of NAV)
      for (const it of g.items) {
        const route = it.to.split(/[?#]/)[0].replace(/^\//, '');
        expect(app.includes(`path="${route}"`), it.to).toBe(true);
      }
  });

  it('rivalidades usam franquias ativas e as eras cobrem 1920 até hoje', () => {
    for (const r of RIVALRIES) {
      expect(ACTIVE_TEAMS).toContain(r.a);
      expect(ACTIVE_TEAMS).toContain(r.b);
    }
    expect(ERAS[0].period.startsWith('1920')).toBe(true);
    expect(ERAS.at(-1)!.period).toContain('hoje');
  });
});
