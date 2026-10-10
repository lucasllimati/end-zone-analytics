import fs from 'node:fs/promises';

/**
 * Troca atômica do arquivo. No Windows, `rename` falha (EPERM/EBUSY) enquanto o servidor ou o
 * antivírus estiver lendo o destino: tenta de novo com espera crescente e, por fim, copia por cima.
 */
export async function replaceFile(tmp: string, file: string, attempts = 6): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    try {
      await fs.rename(tmp, file);
      return;
    } catch (e) {
      const code = (e as NodeJS.ErrnoException).code;
      if (code !== 'EPERM' && code !== 'EBUSY' && code !== 'EACCES') throw e;
      await new Promise((r) => setTimeout(r, 50 * 2 ** i));
    }
  }
  await fs.copyFile(tmp, file);
  await fs.unlink(tmp).catch(() => {});
}
