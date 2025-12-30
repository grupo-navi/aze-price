# Guia de Instalação Manual - AZE Price API
# Servidor: 177.38.215.101
# Domínio: azeprice.azorescan.com

## Passo 1: Conectar ao Servidor

```bash
ssh seu-usuario@177.38.215.101
```

## Passo 2: Atualizar Sistema e Instalar PostgreSQL

```bash
# Atualizar repositórios
sudo apt update

# Instalar PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Verificar se o serviço está rodando
sudo systemctl status postgresql

# Iniciar PostgreSQL se não estiver rodando
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

## Passo 3: Configurar Banco de Dados PostgreSQL

```bash
# Acessar como usuário postgres
sudo -u postgres psql

# No prompt do PostgreSQL (postgres=#), execute os comandos abaixo:
```

```sql
-- Criar banco de dados
CREATE DATABASE aze_price;

-- Criar usuário (escolha uma senha forte)
CREATE USER aze_user WITH ENCRYPTED PASSWORD 'SuaSenhaForteAqui123!';

-- Dar permissões
GRANT ALL PRIVILEGES ON DATABASE aze_price TO aze_user;

-- Sair do PostgreSQL
\q
```

## Passo 4: Verificar Node.js no Servidor

```bash
# Verificar versão do Node.js
node --version

# Se não tiver Node.js ou a versão for menor que 20.x, instalar:
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar instalação
node --version
npm --version
```

## Passo 5: Preparar Diretório do Projeto

```bash
# Criar diretório
sudo mkdir -p /var/www/aze-price

# Dar permissões ao seu usuário
sudo chown -R $USER:$USER /var/www/aze-price

# Navegar para o diretório
cd /var/www/aze-price
```

## Passo 6: Transferir Arquivos do Projeto

**Opção A: Clonar via Git (Recomendado)**
```bash
# No servidor
cd /var/www/aze-price
git clone https://github.com/grupo-navi/aze-price.git .
```

**Opção B: Transferir via SCP (execute no seu computador local)**
```bash
# No seu computador local, navegue até o diretório do projeto
cd /home/juan/Desktop/Projects/Navi/aze-price

# Transferir arquivos (exclui node_modules e arquivos desnecessários)
rsync -avz --exclude 'node_modules' --exclude 'dist' --exclude '.git' \
  ./ seu-usuario@177.38.215.101:/var/www/aze-price/
```

## Passo 7: Configurar Variáveis de Ambiente

```bash
# No servidor, criar arquivo .env
cd /var/www/aze-price
nano .env
```

Cole o seguinte conteúdo (ajuste a senha do banco):

```env
# Database
DATABASE_URL="postgresql://aze_user:SuaSenhaForteAqui123!@localhost:5432/aze_price?schema=public"

# Awesome API
AWESOME_API_TOKEN="a2ef4aabf2c4f5d797ce7d524635605a0ba14a8839cee1be2fad4d25ce076038"

# Server
PORT=3100
NODE_ENV="production"

# BTC Pricing
BTC_DIVISOR=1000
POLLING_INTERVAL_MS=30000
FALLBACK_BTC_BRL=550000
```

Salvar com `Ctrl+O`, `Enter`, `Ctrl+X`

## Passo 8: Instalar Dependências e Build

```bash
# Instalar dependências
cd /var/www/aze-price
npm install

# Gerar Prisma Client
npm run db:generate

# Aplicar schema ao banco
npm run db:push

# Build da aplicação
npm run build
```

## Passo 9: Testar a Aplicação

```bash
# Testar em modo desenvolvimento
npm run dev

# Aguarde aparecer a mensagem: "🚀 AZE Price API running on http://localhost:3100"
# Em outro terminal SSH, teste:
curl http://localhost:3100/price/health

# Se funcionar, parar com Ctrl+C
```

## Passo 10: Configurar Serviço Systemd

```bash
# Criar arquivo de serviço
sudo nano /etc/systemd/system/aze-price.service
```

Cole o seguinte conteúdo (substitua `seu-usuario` pelo usuário atual):

```ini
[Unit]
Description=AZE Price API
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=seu-usuario
WorkingDirectory=/var/www/aze-price
Environment="NODE_ENV=production"
ExecStart=/usr/bin/npm run start:prod
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=aze-price

[Install]
WantedBy=multi-user.target
```

Salvar com `Ctrl+O`, `Enter`, `Ctrl+X`

```bash
# Recarregar daemon do systemd
sudo systemctl daemon-reload

# Habilitar serviço para iniciar no boot
sudo systemctl enable aze-price

# Iniciar serviço
sudo systemctl start aze-price

# Verificar status
sudo systemctl status aze-price

# Ver logs
sudo journalctl -u aze-price -f
```

## Passo 11: Configurar Nginx

```bash
# Criar arquivo de configuração do nginx
sudo nano /etc/nginx/sites-available/azeprice.azorescan.com
```

Cole o seguinte conteúdo:

```nginx
server {
    listen 80;
    server_name azeprice.azorescan.com;

    location / {
        proxy_pass http://localhost:3100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Salvar com `Ctrl+O`, `Enter`, `Ctrl+X`

```bash
# Criar link simbólico para habilitar o site
sudo ln -s /etc/nginx/sites-available/azeprice.azorescan.com /etc/nginx/sites-enabled/

# Testar configuração do nginx
sudo nginx -t

# Se estiver OK, recarregar nginx
sudo systemctl reload nginx
```

## Passo 12: Configurar SSL com Let's Encrypt

```bash
# Instalar certbot se não tiver
sudo apt install certbot python3-certbot-nginx -y

# Obter certificado SSL
sudo certbot --nginx -d azeprice.azorescan.com

# Seguir as instruções do certbot:
# - Informar email para notificações
# - Aceitar termos de serviço
# - Escolher se quer redirecionar HTTP para HTTPS (recomendado: sim)

# Verificar renovação automática
sudo certbot renew --dry-run
```

## Passo 13: Testar API em Produção

```bash
# Testar localmente
curl http://localhost:3100/price/health
curl http://localhost:3100/price/latest

# Testar via domínio (HTTP)
curl http://azeprice.azorescan.com/price/health

# Testar via domínio (HTTPS - após SSL configurado)
curl https://azeprice.azorescan.com/price/health
curl https://azeprice.azorescan.com/price/latest
curl https://azeprice.azorescan.com/price/history?window=1h
```

## Passo 14: Configurar Firewall (se necessário)

```bash
# Verificar se UFW está ativo
sudo ufw status

# Se estiver ativo, permitir tráfego na porta 3100 (já está configurado via nginx)
# Certifique-se que as portas HTTP e HTTPS estão abertas:
sudo ufw allow 'Nginx Full'
sudo ufw allow 3100/tcp

# Verificar status
sudo ufw status
```

## Comandos Úteis para Gerenciamento

### Ver logs em tempo real
```bash
sudo journalctl -u aze-price -f
```

### Ver últimas 100 linhas de log
```bash
sudo journalctl -u aze-price -n 100
```

### Reiniciar serviço
```bash
sudo systemctl restart aze-price
```

### Parar serviço
```bash
sudo systemctl stop aze-price
```

### Verificar status
```bash
sudo systemctl status aze-price
```

### Ver uso de recursos
```bash
# CPU e memória
htop

# Conexões PostgreSQL
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity WHERE datname = 'aze_price';"
```

## Solução de Problemas

### Serviço não inicia
```bash
# Ver logs detalhados
sudo journalctl -u aze-price -n 50 --no-pager

# Verificar se a porta 3100 está em uso
sudo netstat -tlnp | grep 3100

# Testar manualmente
cd /var/www/aze-price
npm run start:prod
```

### Erro de conexão com banco
```bash
# Verificar se PostgreSQL está rodando
sudo systemctl status postgresql

# Testar conexão com banco
psql -h localhost -U aze_user -d aze_price

# Verificar logs do PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-*-main.log
```

### Nginx retornando 502 Bad Gateway
```bash
# Verificar se a aplicação está rodando
sudo systemctl status aze-price

# Verificar se está escutando na porta 3100
curl http://localhost:3100/price/health

# Ver logs do nginx
sudo tail -f /var/log/nginx/error.log
```

## Atualização do Serviço

Quando precisar atualizar o código:

```bash
# Parar serviço
sudo systemctl stop aze-price

# Navegar até o diretório
cd /var/www/aze-price

# Fazer backup do .env
cp .env .env.backup

# Atualizar código (git pull ou rsync)
git pull
# OU fazer upload via rsync do seu computador

# Instalar novas dependências
npm install

# Atualizar banco (se necessário)
npm run db:push

# Rebuild
npm run build

# Restaurar .env se necessário
# cp .env.backup .env

# Iniciar serviço
sudo systemctl start aze-price

# Verificar status
sudo systemctl status aze-price
sudo journalctl -u aze-price -f
```

## Checklist Final

- [ ] PostgreSQL instalado e rodando
- [ ] Banco de dados `aze_price` criado
- [ ] Usuário `aze_user` criado com permissões
- [ ] Node.js 18.x ou superior instalado
- [ ] Projeto em `/var/www/aze-price`
- [ ] Arquivo `.env` configurado
- [ ] Dependências instaladas (`npm install`)
- [ ] Prisma configurado (`npm run db:generate` e `npm run db:push`)
- [ ] Build criado (`npm run build`)
- [ ] Serviço systemd criado e habilitado
- [ ] Serviço rodando (`systemctl status aze-price`)
- [ ] Nginx configurado para `azeprice.azorescan.com`
- [ ] SSL configurado com Let's Encrypt
- [ ] API respondendo em `https://azeprice.azorescan.com`
- [ ] Logs rodando sem erros

## Endpoints Finais

Após a instalação completa:

- **Health Check**: `https://azeprice.azorescan.com/price/health`
- **Última Cotação**: `https://azeprice.azorescan.com/price/latest`
- **Histórico**: `https://azeprice.azorescan.com/price/history?window=1h`
