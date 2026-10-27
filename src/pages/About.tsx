import { Link } from 'react-router-dom';
import { PageHeader, Seo } from '../components/Bits';
import { PAGE_META } from '../content/pageMeta';

export default function About() {
  return (
    <div className="stack">
      <Seo {...PAGE_META['/about']} />
      <PageHeader eyebrow="Sobre" title="Sobre o End Zone Analytics" lede="Um site independente, em português, para entender e explorar a NFL: do primeiro jogo assistido à análise de EPA." />
      <div className="grid grid-2">
        <section className="card prose">
          <h2>O que é</h2>
          <p>
            Estatísticas, classificação, jogos, Super Bowls, recordes e explicações sobre futebol americano, com dois modos de leitura: <strong>Iniciante</strong> (linguagem simples) e{' '}
            <strong>Expert</strong> (métricas avançadas). Cada número mostra de onde veio e como foi calculado.
          </p>
          <p>Princípio do projeto: mostrar primeiro o que importa, permitir explorar o que interessa e explicar como os números foram obtidos.</p>
        </section>
        <section className="card prose">
          <h2>De onde vêm os dados</h2>
          <ul>
            <li>
              <strong>nflverse</strong> (licença CC-BY 4.0): calendário, resultados, estatísticas por jogo e por temporada, play-by-play, elencos e draft, desde 1999.
            </li>
            <li>
              <strong>nflverse</strong> também traz o relatório oficial de lesões da NFL, atualizado a cada carga.
            </li>
            <li>
              <strong>ESPN</strong> (consulta pública): placar ao vivo, detalhes de jogos e notícias dos times, exibidas com link para a matéria original.
            </li>
            <li>
              <strong>Wikipedia</strong> (CC BY-SA 4.0): resumos dos times, com atribuição e link para o artigo original.
            </li>
            <li>
              <strong>Prêmios da AP</strong> (MVP e outros): listas de vencedores da Wikipedia em inglês (CC BY-SA 4.0), conferidas com fatos conhecidos antes de publicar.
            </li>
            <li>
              <strong>Curadoria</strong> (NFL Record &amp; Fact Book): história anterior a 1999, como Super Bowls antigos e recordes oficiais.
            </li>
          </ul>
          <p>
            Os dados são atualizados automaticamente a cada 6 horas e só são publicados depois de passar por verificações de qualidade. Detalhes em <Link to="/data">Fontes e qualidade dos dados</Link>.
          </p>
        </section>
        <section className="card prose">
          <h2>Independência</h2>
          <p>
            Projeto independente, sem afiliação com a NFL, os times, a ESPN ou a Wikipedia. Nomes e logos de times são marcas registradas de seus detentores e aparecem apenas para identificação.
          </p>
          <p>
            Linhas de apostas aparecem só como medida de expectativa (quem era favorito e quem surpreendeu). O site não promove nem tem vínculo com casas de apostas.
          </p>
        </section>
        <section className="card prose">
          <h2>Privacidade</h2>
          <p>
            Sem cadastro, sem cookies de rastreamento e sem venda de dados. As preferências (tema, modo, time favorito) ficam só no seu navegador. Veja a <Link to="/privacy">política de privacidade</Link>.
          </p>
        </section>
      </div>
    </div>
  );
}
