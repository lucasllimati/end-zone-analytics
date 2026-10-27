/** Busca textual sem acentos, usada pela busca global e pelos filtros das páginas. */
export const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/** Pontuação de relevância: prefixo > início de palavra > contém; todos os termos precisam aparecer. */
export function score(item: { title: string; hay: string; weight?: number }, q: string): number {
  const terms = norm(q).split(/\s+/).filter(Boolean);
  const title = norm(item.title);
  let s = 0;
  for (const t of terms) {
    if (title.startsWith(t)) s += 30;
    else if (title.includes(` ${t}`)) s += 20;
    else if (title.includes(t)) s += 12;
    else if (item.hay.includes(t)) s += 4;
    else return 0;
  }
  return s + (item.weight ?? 0);
}
