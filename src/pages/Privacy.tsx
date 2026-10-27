import { Link } from 'react-router-dom';
import { PageHeader, Seo } from '../components/Bits';
import { DataTable } from '../components/DataTable';
import { PAGE_META } from '../content/pageMeta';

/** Tudo o que o site guarda no navegador do visitante (localStorage / sessionStorage). Manter em dia ao criar uma chave nova. */
const STORAGE = [
  { key: 'eza-theme', what: 'Tema claro ou escuro', where: 'localStorage' },
  { key: 'eza-mode', what: 'Modo de leitura (Iniciante ou Expert)', where: 'localStorage' },
  { key: 'eza-terms', what: 'Idioma dos termos técnicos (PT ou EN)', where: 'localStorage' },
  { key: 'eza-team', what: 'Seu time favorito (Meu time)', where: 'localStorage' },
  { key: 'eza-notify', what: 'Se você pediu aviso quando seu time pontuar', where: 'localStorage' },
  { key: 'eza-update-check', what: 'Última verificação de dados novos', where: 'localStorage' },
  { key: 'eza-chunk-reload', what: 'Evita recarregar a página duas vezes seguidas após uma atualização do site', where: 'sessionStorage' },
];

export default function Privacy() {
  return (
    <div className="stack">
      <Seo {...PAGE_META['/privacy']} />
      <PageHeader eyebrow="Privacidade" title="Política de privacidade" lede="Resumo: sem cadastro, sem cookies de rastreamento, sem venda de dados. Abaixo, o que acontece em detalhe." />
      <section className="card prose">
        <h2>O que fica no seu navegador</h2>
        <p>Só preferências, guardadas no próprio navegador. Nada disso é enviado para nós. Para apagar, limpe os dados do site nas configurações do navegador.</p>
        <DataTable rows={STORAGE} rowKey={(r) => r.key} caption="Dados guardados no navegador" columns={[{ key: 'key', label: 'Chave' }, { key: 'what', label: 'Para quê' }, { key: 'where', label: 'Onde' }]} />
      </section>
      <div className="grid grid-2">
        <section className="card prose">
          <h2>Medição de audiência</h2>
          <p>
            Quando ativada, usamos o <strong>Cloudflare Web Analytics</strong>, que conta visitas sem cookies, sem identificar o visitante e sem rastreamento entre sites. Vemos apenas totais (páginas
            mais vistas, países, tipo de dispositivo).
          </p>
        </section>
        <section className="card prose">
          <h2>Relatos de erro</h2>
          <p>
            Se uma página falhar no seu navegador, o site envia um relato técnico para corrigirmos o problema: a mensagem de erro, onde ele ocorreu no código e o endereço da página (sem parâmetros).
            Não envia nome, e-mail, cookies nem identificadores. No máximo 5 relatos por visita.
          </p>
        </section>
        <section className="card prose">
          <h2>Serviços de terceiros</h2>
          <ul>
            <li>
              <strong>Cloudflare</strong> hospeda o site. Como todo servidor, recebe o endereço IP e o navegador de quem acessa, para entregar as páginas e proteger contra abuso.
            </li>
            <li>
              <strong>ESPN</strong>: logos dos times e fotos são carregados do servidor de imagens da ESPN, que recebe o seu IP ao entregar a imagem.
            </li>
            <li>
              <strong>Notificações</strong>: o aviso de pontuação do seu time só é ativado se você pedir, e é exibido pelo próprio navegador, sem servidor de terceiros.
            </li>
          </ul>
        </section>
        <section className="card prose">
          <h2>Publicidade</h2>
          <p>
            Hoje o site não exibe anúncios. Se isso mudar, esta página será atualizada antes, explicando quais cookies o anunciante usa e como recusar o consentimento.
          </p>
        </section>
      </div>
      <p className="small muted">
        Última revisão: outubro de 2026. Veja também <Link to="/about">Sobre o site</Link>.
      </p>
    </div>
  );
}
