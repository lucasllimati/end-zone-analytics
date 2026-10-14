/**
 * Elenco completo do time na temporada (nflverse/rosters), por unidade: ataque, defesa e times especiais.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { StatTile } from '../../components/Bits';
import { DataTable } from '../../components/DataTable';
import { Loading, Unavailable } from '../../components/States';
import { api } from '../../data/client';
import { useAsync } from '../../data/hooks';
import { height, num } from '../../lib/format';
import { positionBucket } from '../../lib/stats';
import { franchiseOf } from '../../lib/teams';
import type { RosterEntry } from '../../lib/types';

type Unit = 'off' | 'def' | 'st';
const UNITS: { id: Unit; label: string }[] = [
  { id: 'off', label: 'Ataque' },
  { id: 'def', label: 'Defesa' },
  { id: 'st', label: 'Times especiais' },
];
const ORDER = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'DB', 'K', 'P', 'LS'];
const unitOf = (pos: string): Unit => {
  const b = positionBucket(pos);
  if (['QB', 'RB', 'WR', 'TE', 'OL'].includes(b)) return 'off';
  if (['DL', 'LB', 'DB'].includes(b)) return 'def';
  return 'st';
};
const STATUS: Record<string, string> = { ACT: 'Ativo', RES: 'Reserva/lesionado', INA: 'Inativo', DEV: 'Practice squad', CUT: 'Dispensado', RET: 'Aposentado', EXE: 'Isento', SUS: 'Suspenso', TRC: 'Em teste', TRD: 'Trocado', UFA: 'Agente livre' };

/** Idade em uma data de referência (início da temporada). */
function ageAt(birth: string | null, season: number): number | null {
  if (!birth) return null;
  const b = new Date(`${birth}T00:00:00Z`);
  if (Number.isNaN(b.getTime())) return null;
  const ref = new Date(Date.UTC(season, 8, 1));
  return ref.getUTCFullYear() - b.getUTCFullYear() - (ref < new Date(Date.UTC(ref.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate())) ? 1 : 0);
}

export function TeamRoster({ code, season }: { code: string; season: number }) {
  const roster = useAsync(() => api.roster(season).catch(() => [] as RosterEntry[]), [season]);
  const [unit, setUnit] = useState<Unit>('off');
  if (roster.loading) return <Loading />;
  const all = (roster.data ?? []).filter((r) => franchiseOf(r.team) === code);
  if (!all.length) return <Unavailable>Elenco de {season} não disponível.</Unavailable>;
  const active = all.filter((r) => r.status === 'ACT');
  const base = active.length >= 40 ? active : all;
  const ages = base.map((r) => ageAt(r.birth, season)).filter((v): v is number => v !== null);
  const exps = base.map((r) => r.exp).filter((v): v is number => v !== null);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  const rookies = base.filter((r) => r.exp === 0).length;
  const rows = all
    .filter((r) => unitOf(r.pos) === unit)
    .sort((a, b) => ORDER.indexOf(positionBucket(a.pos)) - ORDER.indexOf(positionBucket(b.pos)) || (a.jersey ?? 99) - (b.jersey ?? 99));
  return (
    <div className="stack">
      <div className="tiles">
        <StatTile label={active.length >= 40 ? 'Jogadores ativos' : 'Jogadores no elenco'} value={num(base.length)} note={all.length > base.length ? `${all.length} contando reservas e practice squad` : undefined} />
        <StatTile label="Idade média" value={num(avg(ages), 1)} note="no início da temporada" />
        <StatTile label="Experiência média" value={num(avg(exps), 1)} note="temporadas na NFL" />
        <StatTile label="Novatos" value={num(rookies)} />
      </div>
      <div className="segmented" role="group" aria-label="Unidade">
        {UNITS.map((u) => (
          <button key={u.id} type="button" aria-pressed={unit === u.id} onClick={() => setUnit(u.id)}>
            {u.label}
          </button>
        ))}
      </div>
      <DataTable
        rows={rows}
        rowKey={(r) => `${r.id ?? r.name}-${r.pos}`}
        caption={`Elenco de ${season} — ${UNITS.find((u) => u.id === unit)!.label}`}
        exportName={`elenco-${code}-${season}`}
        pageSize={80}
        columns={[
          { key: 'jersey', label: 'Nº', num: true, render: (r) => r.jersey ?? '—', value: (r) => r.jersey },
          { key: 'name', label: 'Jogador', render: (r) => (r.id ? <Link to={`/players/${r.id}`}>{r.name}</Link> : r.name), value: (r) => r.name },
          { key: 'pos', label: 'Pos.', render: (r) => (r.depth && r.depth !== r.pos ? `${r.pos} (${r.depth})` : r.pos), value: (r) => ORDER.indexOf(positionBucket(r.pos)) },
          { key: 'age', label: 'Idade', num: true, render: (r) => ageAt(r.birth, season) ?? '—', value: (r) => ageAt(r.birth, season) },
          { key: 'height', label: 'Altura', num: true, render: (r) => height(r.height), value: (r) => r.height },
          { key: 'weight', label: 'Peso', num: true, render: (r) => (r.weight ? `${r.weight} lb` : '—'), value: (r) => r.weight },
          { key: 'exp', label: 'Exp.', num: true, help: 'Temporadas na NFL antes desta (0 = novato).', render: (r) => (r.exp === null ? '—' : r.exp === 0 ? 'Novato' : r.exp), value: (r) => r.exp },
          { key: 'college', label: 'Universidade', render: (r) => r.college ?? '—', value: (r) => r.college },
          { key: 'draft', label: 'Draft', num: true, help: 'Número da escolha no draft (vazio = não draftado).', render: (r) => (r.draftPick ? `#${r.draftPick}` : 'Não draftado'), value: (r) => r.draftPick ?? 999 },
          { key: 'status', label: 'Situação', render: (r) => (r.status ? STATUS[r.status] ?? r.status : '—'), value: (r) => r.status },
        ]}
      />
      <p className="xsmall muted">Fonte: nflverse (rosters). Situação = status mais recente registrado na temporada.</p>
    </div>
  );
}
