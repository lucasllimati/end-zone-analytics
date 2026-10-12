# Publicação em servidor próprio (alternativa), passo a passo

> **Caminho recomendado:** [PUBLICACAO.md](PUBLICACAO.md) — Cloudflare Workers + GitHub Actions, sem servidor para manter. É o que está no ar hoje.
> Use **este** guia só se quiser, online, o painel administrativo (`/admin`) e a API REST completa.

| | Cloudflare (recomendado) | Servidor próprio (este guia) |
|---|---|---|
| Custo | R$ 0, sem cartão | R$ 0 (a Oracle pede cartão para verificação) |
| Manutenção | Nenhuma | Atualizações do sistema, disco, backups |
| Site, dados, placar ao vivo | ✅ | ✅ |
| Painel `/admin` (jobs, logs, alertas, cargas por botão) | — (o painel é a aba Actions) | ✅ |
| API REST completa (`/api/teams`, `/api/standings`…) | — (dados em `/data/*.json`) | ✅ |
| Quem roda as cargas | GitHub Actions (cron) | Agendador interno da aplicação |
| Tempo de configuração | ~20 min | ~1 h a 1 h 30 |

Os dois caminhos são **excludentes**: escolha um. A variável de repositório `DEPLOY_TARGET` (passo 11) decide qual workflow publica.

---

## 0. Visão geral

```mermaid
flowchart LR
  U[Visitantes] -->|HTTPS| C[Caddy<br/>certificado automático]
  subgraph VM[Oracle Cloud · Always Free · Ubuntu]
    C --> A[App: site + API + /admin<br/>+ agendador de cargas]
    A --> V[(Volumes<br/>dados · cache · ops)]
  end
  A -->|a cada 6 h| N[nflverse / GitHub]
  A -->|ao vivo| E[ESPN]
  A -->|falhas| P[ntfy · Discord · Slack<br/>alerta no celular]
  G[GitHub Actions<br/>deploy-server.yml] -->|testes + deploy via SSH| VM
  R[UptimeRobot] -->|/ready a cada 5 min| C
```

| Peça | Serviço | Custo |
|---|---|---|
| Servidor | Oracle Cloud **Always Free** (VM ARM até 4 CPUs e 24 GB de RAM) | R$ 0 |
| Domínio + HTTPS | **DuckDNS** (subdomínio grátis) + Caddy (Let's Encrypt) | R$ 0 |
| Cargas de dados | Agendador interno da aplicação (parcial a cada 6 h, completa semanal) | R$ 0 |
| Logs, jobs e eventos | Área `/admin` (protegida por token) | R$ 0 |
| Alertas no celular | **ntfy.sh** (ou Discord/Slack) | R$ 0 |
| Monitoramento externo | **UptimeRobot** | R$ 0 |
| Testes e deploy automático | **GitHub Actions** (`.github/workflows/deploy-server.yml`) | R$ 0 |

O que o projeto já traz pronto: `Dockerfile`, `docker-compose.yml`, `deploy/Caddyfile`, `deploy/setup-server.sh`, `deploy/update.sh`, `deploy/backup.sh` e `.github/workflows/deploy-server.yml`.

---

## 1. Antes de começar

- Conta no **GitHub** com o repositório do projeto (`main` atualizada).
- No seu computador: terminal com `ssh` (o PowerShell do Windows 10/11 já tem).
- Gere uma chave SSH só para o servidor:

```powershell
ssh-keygen -t ed25519 -f $HOME\.ssh\eza -C "end-zone-analytics"
```

Isso cria dois arquivos:
- `eza`: a chave privada. Nunca compartilhe.
- `eza.pub`: a chave pública, que vai para a Oracle.

---

## 2. Criar o servidor na Oracle Cloud

1. Crie a conta em **cloud.oracle.com** → *Start for free*.
   - **Região inicial:** escolha **Brazil East (São Paulo)** ou **Brazil Southeast (Vinhedo)**. Ela **não pode ser trocada depois** e é onde ficam os recursos gratuitos.
   - O cartão é só para verificação; recursos *Always Free* não são cobrados.
2. Menu → **Compute → Instances → Create instance**.
   - **Name:** `end-zone-analytics`
   - **Image:** *Canonical Ubuntu 24.04* (aarch64)
   - **Shape:** *Ampere* → **VM.Standard.A1.Flex** → **2 OCPUs e 12 GB** (o limite grátis é 4 OCPUs/24 GB no total)
   - **Networking:** crie uma VCN nova com **sub-rede pública** e marque *Assign a public IPv4 address*
   - **SSH keys:** *Upload public key files* → selecione `eza.pub`
   - **Boot volume:** 50 GB (padrão) é suficiente
3. Clique em **Create** e anote o **Public IP address**.

> **"Out of capacity"?** É comum no plano grátis. Tente outro *Availability Domain*, tente mais tarde, ou use o shape **VM.Standard.E2.1.Micro** (1 GB de RAM; funciona, porque o script do passo 4 cria 2 GB de swap).

### Liberar as portas 80 e 443 na rede da Oracle

Instância → **Subnet** → **Security List** padrão → **Add Ingress Rules**:

| Source CIDR | Protocolo | Porta de destino |
|---|---|---|
| `0.0.0.0/0` | TCP | 80 |
| `0.0.0.0/0` | TCP | 443 |
| `0.0.0.0/0` | UDP | 443 |

(A porta 22/SSH já vem liberada.)

> **Evite que a Oracle recupere a VM ociosa:** instâncias Always Free com uso muito baixo por 7 dias podem ser recuperadas. Para evitar, faça *Upgrade to Pay As You Go* em **Billing** (continua grátis dentro dos limites Always Free) e crie um **Budget** de US$ 1 com alerta por e-mail como garantia.

---

## 3. Domínio grátis com HTTPS (DuckDNS)

1. Entre em **duckdns.org** (login com GitHub ou Google).
2. Crie um subdomínio, ex.: `endzone-analytics` → fica `endzone-analytics.duckdns.org`.
3. No campo **current ip**, coloque o IP público da VM e clique em **update ip**.

> Tem domínio próprio? Crie um registro **A** apontando para o IP da VM e use esse domínio no passo 5.

---

## 4. Preparar o servidor

Entre no servidor:

```powershell
ssh -i $HOME\.ssh\eza ubuntu@SEU_IP
```

### 4.1 Acesso do servidor ao repositório

O repositório é **privado**, então o servidor precisa de uma chave de leitura. No servidor:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/github -N "" -C "eza-servidor"
cat ~/.ssh/github.pub
printf 'Host github.com\n  IdentityFile ~/.ssh/github\n' >> ~/.ssh/config
```

Copie a linha exibida pelo `cat` e cadastre em GitHub → repositório → **Settings → Deploy keys → Add deploy key**, **sem** marcar *Allow write access*.

> Se o repositório fosse público, este passo não seria necessário: bastaria `git clone https://github.com/…`.

### 4.2 Clonar e configurar

```bash
git clone git@github.com:lucasllimati/end-zone-analytics.git
cd end-zone-analytics
bash deploy/setup-server.sh
exit
```

O script atualiza o sistema e liga as atualizações de segurança automáticas. Ele também:
- instala Docker e fail2ban;
- configura o firewall (só SSH, 80 e 443), incluindo a regra extra que as imagens Ubuntu da Oracle exigem;
- desativa o login por senha e o login como root;
- cria 2 GB de swap.

Entre de novo, para o grupo `docker` passar a valer:

```bash
ssh -i ~/.ssh/eza ubuntu@SEU_IP
cd end-zone-analytics
```

---

## 5. Configurar o `.env` (segredos)

```bash
cp .env.example .env
openssl rand -hex 32        # copie o resultado para ADMIN_TOKEN
nano .env
chmod 600 .env
```

Preencha:

| Variável | Valor |
|---|---|
| `ADMIN_TOKEN` | o valor gerado acima. É a senha do `/admin`; guarde num gerenciador de senhas |
| `GITHUB_TOKEN` | GitHub → *Settings → Developer settings → Fine-grained tokens* → *Public repositories (read-only)*, **sem nenhuma permissão extra**. Sobe o limite de consultas de 60 para 5.000 por hora (fim do erro 403) |
| `DOMAIN` | `endzone-analytics.duckdns.org` |
| `ACME_EMAIL` | seu e-mail, para avisos do certificado |
| `SYNC_PARTIAL_EVERY_HOURS` | `6` (carga parcial a cada 6 h) |
| `SYNC_FULL_WEEKDAY` / `SYNC_FULL_HOUR_UTC` | `2` / `7` (completa às terças, 04:00 de Brasília) |
| `ALERT_WEBHOOK_URL` | veja o passo 8 |

Não mexa em `HOST` e `API_PORT`: o `docker-compose.yml` já define.

---

## 6. Subir a aplicação

```bash
docker compose up -d --build
docker compose logs -f app
```

- O primeiro build leva de 3 a 8 minutos.
- Na primeira execução, a aplicação faz a **carga completa** dos dados (1–3 min) e depois começa a responder. Saia dos logs com `Ctrl+C`.
- O Caddy emite o certificado HTTPS sozinho, em menos de 1 minuto.

Teste no navegador:

- `https://endzone-analytics.duckdns.org` → site
- `https://endzone-analytics.duckdns.org/ready` → `{"status":"ready", …}`
- `https://endzone-analytics.duckdns.org/admin` → tela de login

---

## 7. Área administrativa, jobs e eventos

Abra `https://SEU_DOMINIO/admin` e entre com o `ADMIN_TOKEN`.

| Aba | O que você acompanha |
|---|---|
| **Visão geral** | API, arquivos publicados, última publicação × última tentativa, qualidade, **Cargas automáticas** (com a próxima execução), **Alertas externos**, token do GitHub |
| **Fontes e cargas** | Verificar dados novos; rodar carga parcial (por fonte/temporada) ou completa (com confirmação); acompanhar o log do job; execuções recentes (*Painel*, *Terminal* ou *Agendada*) |
| **Logs e alertas** | Eventos por severidade (informativo, atenção, erro, crítico), componente, job, ação recomendada e se já foi resolvido |
| **Histórico** | Só as publicações em que **os dados mudaram** (ex.: "Calendário e resultados · +16 linhas"); verificações sem mudança aparecem agrupadas |

Como as cargas funcionam:
- Rodam **dentro da aplicação**, sem cron externo.
- Só uma carga roda por vez.
- Se uma falhar, o site continua com os dados anteriores e um alerta é registrado (e enviado ao celular).
- Uma carga sem mudanças **não cria nova publicação**.

A sessão do admin expira em 8 h. Em produção não existe acesso sem token, nem a partir do próprio servidor.

---

## 8. Alertas no celular (ntfy, grátis)

1. Instale o app **ntfy** (Android/iOS).
2. Escolha um tópico difícil de adivinhar, ex.: `eza-alertas-7f3k9q2m`, e assine no app.
3. No `.env`:

```bash
ALERT_WEBHOOK_URL=https://ntfy.sh/eza-alertas-7f3k9q2m
ALERT_WEBHOOK_FORMAT=ntfy
ALERT_MIN_SEVERITY=warning
```

4. Aplique e teste:

```bash
docker compose up -d
curl -d "Teste de alerta do End Zone Analytics" https://ntfy.sh/eza-alertas-7f3k9q2m
```

- **O que chega no celular:** cargas que falharam, fontes indisponíveis, alertas de qualidade, tentativas de login recusadas.
- **Quer receber também as cargas bem-sucedidas?** Use `ALERT_MIN_SEVERITY=info`.
- **Prefere Discord?** Copie a URL do webhook do canal e use `ALERT_WEBHOOK_FORMAT=discord`. No Slack, use `slack`.

---

## 9. Monitoramento externo (UptimeRobot)

Em **uptimerobot.com** (grátis), crie um monitor:
- **Tipo:** HTTP(s) – Keyword
- **URL:** `https://SEU_DOMINIO/ready`, palavra-chave `ready`
- **Intervalo:** 5 minutos

Você recebe e-mail se o site cair.

---

## 10. Backups

Os dados publicados podem ser recriados com uma carga completa. O que vale guardar é o **log operacional** (execuções, alertas, auditoria) e o `.env`:

```bash
crontab -e
# adicione:
0 4 * * * bash /home/ubuntu/end-zone-analytics/deploy/backup.sh >> /home/ubuntu/backup.log 2>&1
```

Os backups ficam em `~/backups` (os 14 mais recentes). Também dá para ativar a política de backup do *Boot Volume* na Oracle.

---

## 11. Deploy automático a cada push (GitHub Actions)

O workflow `.github/workflows/deploy-server.yml` roda os testes e, se passarem, entra no servidor e executa `deploy/update.sh`.

1. **No servidor**, crie uma chave só para o GitHub Actions entrar:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/deploy -N "" -C "github-actions"
cat ~/.ssh/deploy.pub >> ~/.ssh/authorized_keys
cat ~/.ssh/deploy          # copie a chave PRIVADA (para o segredo SSH_KEY)
```

2. **No GitHub** → repositório → **Settings → Secrets and variables → Actions**:
   - **Secrets:** `SSH_HOST` (IP ou domínio), `SSH_USER` (`ubuntu`), `SSH_KEY` (a chave privada inteira, incluindo as linhas `-----BEGIN…` e `-----END…`).
   - **Variables:** `DEPLOY_TARGET` = `server`.
   - *Environments → production* (opcional): marque *Required reviewers* para aprovar cada deploy manualmente.

A partir daí, a cada `git push` na `main`:
1. O Actions testa o código (`npm run qa`).
2. Se passar, entra no servidor e roda `deploy/update.sh`, que baixa o código novo e reconstrói a aplicação.
3. O deploy só termina com sucesso quando `/ready` responde.

- **Os dados não se perdem:** ficam nos volumes do Docker.
- **As cargas de dados não dependem do GitHub:** o agendador do servidor cuida delas.
- **Com `DEPLOY_TARGET=server`, o workflow do Cloudflare (`publish.yml`) fica desligado**, aparecendo como *skipped*.
- **Sem o deploy automático**, publique manualmente com `bash deploy/update.sh` no servidor.

### Trocar de caminho

| De → Para | O que fazer |
|---|---|
| Cloudflare → servidor | Siga este guia e crie `DEPLOY_TARGET=server`. O Worker na Cloudflare pode ser apagado (*Settings → Delete*) ou ficar como espelho parado |
| Servidor → Cloudflare | Apague a variável `DEPLOY_TARGET` e siga [PUBLICACAO.md](PUBLICACAO.md). Depois, desligue a VM |

---

## 12. Operação do dia a dia

| Tarefa | Como |
|---|---|
| Ver jobs, falhas e alertas | `/admin` → *Logs e alertas* |
| Ver a próxima carga agendada | `/admin` → *Visão geral* → *Cargas automáticas* |
| Forçar uma carga agora | `/admin` → *Fontes e cargas* |
| Publicar nova versão do código | `git push` (com deploy automático) ou `bash deploy/update.sh` |
| Ver logs brutos | `docker compose logs --tail=200 app` |
| Reiniciar | `docker compose restart app` |
| Carga completa pelo terminal | `docker compose exec app node_modules/.bin/tsx server/etl/cli.ts full` |
| Espaço em disco | `df -h` e `docker system df` |
| Trocar o token do admin | Edite `ADMIN_TOKEN` no `.env` e rode `docker compose up -d` (derruba as sessões abertas) |

---

## 13. Checklist de segurança

- [ ] `ADMIN_TOKEN` longo e aleatório, guardado fora do servidor
- [ ] `.env` com `chmod 600` e **fora do git** (já está no `.gitignore`)
- [ ] SSH só com chave; login como root desativado (feito pelo `setup-server.sh`)
- [ ] Deploy key do GitHub **somente leitura**
- [ ] Firewall: somente 22, 80 e 443 (Oracle Security List + ufw)
- [ ] Atualizações automáticas de segurança ativas
- [ ] API não exposta diretamente (o Compose só publica o Caddy)
- [ ] HTTPS ativo; HSTS, CSP e demais cabeçalhos vêm da aplicação
- [ ] Alertas chegando no celular (teste do passo 8)
- [ ] UptimeRobot monitorando `/ready`
- [ ] Backup diário agendado
- [ ] Verificação em duas etapas na Oracle, no GitHub e na conta usada no DuckDNS

---

## 14. Problemas comuns

| Sintoma | Causa e solução |
|---|---|
| `git clone` pede usuário/senha ou dá "Permission denied (publickey)" | Deploy key não cadastrada ou `~/.ssh/config` ausente (passo 4.1) |
| O site não abre (tempo esgotado) | Portas 80/443 não liberadas na **Security List** da Oracle (passo 2) ou o `setup-server.sh` não rodou |
| Erro de certificado | O DNS ainda não aponta para o IP (confira no DuckDNS) ou a porta 80 está fechada. Veja `docker compose logs caddy` |
| `502 Bad Gateway` logo após subir | Normal durante a primeira carga completa (1–3 min). Acompanhe com `docker compose logs -f app` |
| Alerta "Limite de consultas da API do GitHub (HTTP 403)" | `GITHUB_TOKEN` ausente ou inválido no `.env`. Corrija e rode `docker compose up -d` |
| "Cargas automáticas: Desligadas" no admin | `SYNC_PARTIAL_EVERY_HOURS` vazio ou `0` no `.env` |
| Não consigo entrar no `/admin` | Token diferente do `.env`; após 5 tentativas em 1 minuto há bloqueio temporário |
| Deploy do Actions não roda (aparece *skipped*) | Falta a variável `DEPLOY_TARGET=server` (passo 11) |
| Deploy do Actions falha no SSH | `SSH_KEY` incompleta (precisa das linhas BEGIN/END) ou chave pública fora do `authorized_keys` |
| Build lento ou travando na VM de 1 GB | Confirme a swap (`swapon --show`) ou use o shape Ampere A1 |
| "Out of capacity" ao criar a VM | Tente outro *Availability Domain* ou outro horário |
| A VM sumiu ou parou | Recuperação por ociosidade do plano grátis: faça o *upgrade Pay As You Go* (continua grátis) |
