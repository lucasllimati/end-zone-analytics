import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { AppProvider, useApp } from '../../src/context/AppContext';
import { InfoTip } from '../../src/components/InfoTip';
import { DataTable } from '../../src/components/DataTable';
import { Tabs } from '../../src/components/Tabs';
import { BarList } from '../../src/components/charts/BarList';
import { ModeNote } from '../../src/components/Bits';

const wrap = (ui: ReactNode) =>
  render(
    <MemoryRouter>
      <AppProvider>{ui}</AppProvider>
    </MemoryRouter>,
  );

function ModeSwitch() {
  const { setMode } = useApp();
  return (
    <button type="button" onClick={() => setMode('expert')}>
      expert
    </button>
  );
}

describe('InfoTip', () => {
  beforeEach(() => localStorage.clear());

  it('abre com clique, mostra a explicação simples e fecha com Esc', () => {
    wrap(<InfoTip metric="epaPerDb" />);
    const btn = screen.getByRole('button', { name: /O que é EPA por dropback/ });
    fireEvent.click(btn);
    const tip = screen.getByRole('tooltip');
    expect(tip).toHaveTextContent('Média de pontos adicionados');
    expect(btn).toHaveAttribute('aria-expanded', 'true');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('no modo Expert mostra a definição técnica primeiro e a fórmula', () => {
    wrap(
      <>
        <ModeSwitch />
        <InfoTip metric="rating" />
      </>,
    );
    fireEvent.click(screen.getByText('expert'));
    fireEvent.click(screen.getByRole('button', { name: /O que é Passer rating/ }));
    const tip = screen.getByRole('tooltip');
    expect(tip.textContent?.indexOf('Combina')).toBeLessThan(tip.textContent!.indexOf('Em palavras simples'));
    expect(tip).toHaveTextContent('((a+b+c+d)/6)×100');
  });
});

describe('DataTable', () => {
  const rows = [
    { id: 'a', name: 'Alfa', v: 3 },
    { id: 'b', name: 'Beta', v: 10 },
    { id: 'c', name: 'Gama', v: null },
  ];
  const cols = [
    { key: 'name', label: 'Nome' },
    { key: 'v', label: 'Valor', num: true, metric: 'passYds', render: (r: (typeof rows)[number]) => (r.v === null ? 'N/D' : String(r.v)) },
  ];

  it('ordena ao clicar e expõe aria-sort; ausentes vão para o fim', () => {
    wrap(<DataTable rows={rows} columns={cols} rowKey={(r) => r.id} caption="teste" />);
    fireEvent.click(screen.getByRole('button', { name: 'Valor' }));
    const header = screen.getByRole('columnheader', { name: /Valor/ });
    expect(header).toHaveAttribute('aria-sort', 'descending');
    const cells = screen.getAllByRole('row').slice(1).map((r) => within(r).getAllByRole('cell')[0].textContent);
    expect(cells).toEqual(['Beta', 'Alfa', 'Gama']);
    fireEvent.click(screen.getByRole('button', { name: 'Valor' }));
    expect(header).toHaveAttribute('aria-sort', 'ascending');
    const asc = screen.getAllByRole('row').slice(1).map((r) => within(r).getAllByRole('cell')[0].textContent);
    expect(asc).toEqual(['Alfa', 'Beta', 'Gama']);
  });

  it('mostra mensagem quando não há linhas', () => {
    wrap(<DataTable rows={[]} columns={cols} rowKey={(r) => r.id} caption="vazio" />);
    expect(screen.getByText(/Nenhum resultado/)).toBeInTheDocument();
  });

  it('esconde colunas expertOnly no modo Iniciante', () => {
    wrap(<DataTable rows={rows} columns={[...cols, { key: 'x', label: 'Avançada', expertOnly: true }]} rowKey={(r) => r.id} caption="t" expert={false} />);
    expect(screen.queryByText('Avançada')).not.toBeInTheDocument();
  });
});

describe('Tabs', () => {
  it('navega com as setas do teclado', () => {
    const onChange = vi.fn();
    wrap(
      <Tabs
        label="Seções"
        value="a"
        onChange={onChange}
        tabs={[
          { id: 'a', label: 'A' },
          { id: 'b', label: 'B' },
        ]}
      />,
    );
    fireEvent.keyDown(screen.getByRole('tab', { name: 'A' }), { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith('b');
  });
});

describe('BarList e ModeNote', () => {
  it('renderiza uma lista ordenada acessível', () => {
    wrap(<BarList ariaLabel="ranking" items={[{ key: '1', label: 'X', value: 5 }, { key: '2', label: 'Y', value: 2 }]} />);
    expect(screen.getByRole('list', { name: 'ranking' }).querySelectorAll('li')).toHaveLength(2);
  });
  it('mostra só o conteúdo do modo ativo', () => {
    localStorage.clear();
    wrap(<ModeNote beginner="simples" expert="técnico" />);
    expect(screen.getByText('simples')).toBeInTheDocument();
    expect(screen.queryByText('técnico')).not.toBeInTheDocument();
  });
});
