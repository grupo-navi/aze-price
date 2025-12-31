# AZE Price API

API centralizada de cotação do AZE baseada no preço do Bitcoin (BTC).

## 📋 Descrição

Serviço que:
- Faz polling da Awesome API a cada **30 segundos**
- Calcula o preço do AZE: `AZE = BTC / 1000`
- Armazena histórico de preços em PostgreSQL
- Fornece API REST para consulta externa
- Suporta consultas por janelas de tempo (5m, 15m, 30m, 1h, 24h, 7d)

## 🚀 Instalação em Servidor

**Guias de Instalação Disponíveis:**

- **[INSTALACAO_SERVIDOR.md](INSTALACAO_SERVIDOR.md)** - Instalação completa com Systemd (auto-start no boot)
- **[INSTALL_PM2.md](INSTALL_PM2.md)** - Instalação com PM2 (recomendado para produção)

### Pré-requisitos

Antes de iniciar, certifique-se de ter instalado:

- **Node.js 18.x ou superior**
- **PostgreSQL 12 ou superior**
- **Git** (para clonar o repositório)
- **PM2** (opcional, mas recomendado para produção)

### Instalação do Node.js

```bash
# Instalar Node.js 20.x no Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar instalação
node --version
npm --version
```

### Instalação do PostgreSQL

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# Iniciar serviço
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verificar status
sudo systemctl status postgresql
```

### Passo a Passo

#### 1. Clonar o repositório

```bash
cd /opt
sudo git clone <url-do-repositorio> aze-price
cd aze-price
sudo chown -R $USER:$USER /opt/aze-price
```

#### 2. Instalar dependências

```bash
npm install
```

#### 3. Configurar PostgreSQL

```bash
# Acessar PostgreSQL como usuário postgres
sudo -u postgres psql

# No prompt do PostgreSQL, execute:
CREATE DATABASE aze_price;
CREATE USER aze_user WITH ENCRYPTED PASSWORD 'senha-segura-aqui';
GRANT ALL PRIVILEGES ON DATABASE aze_price TO aze_user;
\q
```

#### 4. Configurar variáveis de ambiente

```bash
# Copiar arquivo de exemplo
cp .env.example .env

# Editar arquivo .env
nano .env
```

Configure as seguintes variáveis:

```env
DATABASE_URL="postgresql://aze_user:senha-segura-aqui@localhost:5432/aze_price?schema=public"
AWESOME_API_TOKEN="seu-token-da-awesome-api"
PORT=3100
NODE_ENV="production"
BTC_DIVISOR=1000
POLLING_INTERVAL_MS=30000
FALLBACK_BTC_BRL=550000
```

#### 5. Configurar banco de dados com Prisma

```bash
# Gerar Prisma Client
npm run db:generate

# Criar tabelas no banco
npm run db:push
```

#### 6. Build da aplicação

```bash
npm run build
```

#### 7. Testar a aplicação

```bash
# Testar em modo desenvolvimento
npm run dev

# Se tudo estiver OK, pressione Ctrl+C para parar
```

### Configurar como Serviço Systemd

Para que a aplicação inicie automaticamente com o sistema:

#### 1. Criar arquivo de serviço

```bash
sudo nano /etc/systemd/system/aze-price.service
```

#### 2. Adicionar configuração

```ini
[Unit]
Description=AZE Price API
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=seu-usuario
WorkingDirectory=/opt/aze-price
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

**Importante:** Substitua `seu-usuario` pelo usuário que executará a aplicação.

#### 3. Habilitar e iniciar o serviço

```bash
# Recarregar configurações do systemd
sudo systemctl daemon-reload

# Habilitar inicialização automática
sudo systemctl enable aze-price

# Iniciar o serviço
sudo systemctl start aze-price

# Verificar status
sudo systemctl status aze-price
```

#### 4. Gerenciar o serviço

```bash
# Ver logs em tempo real
sudo journalctl -u aze-price -f

# Ver logs das últimas 100 linhas
sudo journalctl -u aze-price -n 100

# Reiniciar serviço
sudo systemctl restart aze-price

# Parar serviço
sudo systemctl stop aze-price
```

### Atualizar a Aplicação

```bash
# Navegar até o diretório
cd /opt/aze-price

# Parar o serviço
sudo systemctl stop aze-price

# Atualizar código (git pull ou upload de novos arquivos)
git pull

# Instalar novas dependências (se houver)
npm install

# Atualizar banco de dados (se houver mudanças)
npm run db:push

# Rebuild
npm run build

# Reiniciar serviço
sudo systemctl start aze-price

# Verificar status
sudo systemctl status aze-price
```

### Configurar Firewall (Opcional)

Se estiver usando UFW:

```bash
# Permitir porta 3100
sudo ufw allow 3100/tcp

# Verificar regras
sudo ufw status
```

### Testar a API

```bash
# Última cotação
curl http://localhost:3100/price/latest

# Health check
curl http://localhost:3100/price/health

# Histórico 1h
curl http://localhost:3100/price/history?window=1h
```

## 📡 Endpoints

### GET /price/latest

Retorna a última cotação registrada.

**Resposta:**
```json
{
  "success": true,
  "data": {
    "btcBrl": 352450.50,
    "azeBrl": 352.45,
    "source": "awesome_api",
    "timestamp": "2025-12-30T15:30:00.000Z"
  }
}
```

### GET /price/history?window={janela}

Retorna histórico de preços por janela de tempo.

**Janelas suportadas:**
- `5m` - 5 minutos
- `15m` - 15 minutos
- `30m` - 30 minutos
- `1h` - 1 hora
- `24h` - 24 horas
- `7d` - 7 dias

**Exemplo:**
```bash
curl http://localhost:3100/price/history?window=1h
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "window": "60m",
    "count": 120,
    "startTime": "2025-12-30T14:30:00.000Z",
    "endTime": "2025-12-30T15:30:00.000Z",
    "aze": {
      "current": 352.45,
      "min": 350.20,
      "max": 355.80,
      "avg": 352.87,
      "first": 351.10
    },
    "btc": {
      "current": 352450.50,
      "min": 350200.00,
      "max": 355800.00,
      "avg": 352870.00,
      "first": 351100.00
    },
    "prices": [
      {
        "timestamp": "2025-12-30T14:30:00.000Z",
        "btcBrl": 351100.00,
        "azeBrl": 351.10,
        "source": "awesome_api"
      },
      // ... mais registros
    ]
  }
}
```

### GET /price/health

Health check do serviço.

**Resposta:**
```json
{
  "status": "healthy",
  "lastUpdate": "2025-12-30T15:30:00.000Z",
  "ageSeconds": 25,
  "source": "awesome_api"
}
```

## 🏗️ Estrutura do Projeto

```
aze-price/
├── src/
│   ├── main.ts                 # Bootstrap da aplicação
│   ├── app.module.ts           # Módulo raiz
│   ├── prisma.service.ts       # Serviço Prisma
│   └── pricing/
│       ├── pricing.module.ts      # Módulo de pricing
│       ├── pricing.service.ts     # Lógica de busca e cálculo
│       ├── pricing.scheduler.ts   # Polling a cada 30s
│       └── pricing.controller.ts  # Endpoints REST
├── prisma/
│   └── schema.prisma           # Schema do banco
├── .env.example                # Variáveis de ambiente
├── package.json
├── tsconfig.json
└── README.md
```

## ⚙️ Variáveis de Ambiente

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `DATABASE_URL` | URL de conexão PostgreSQL | - |
| `AWESOME_API_TOKEN` | Token da Awesome API | - |
| `PORT` | Porta do servidor | `3100` |
| `NODE_ENV` | Ambiente (development/production) | `development` |
| `BTC_DIVISOR` | Divisor para calcular AZE | `1000` |
| `POLLING_INTERVAL_MS` | Intervalo de polling (ms) | `30000` |
| `FALLBACK_BTC_BRL` | Preço fallback do BTC | `550000` |

## 🔄 Limpeza Automática

O serviço remove automaticamente registros com mais de **7 dias** todo dia às **3:00 AM**.

## 📊 Integração com Outros Serviços

### Exemplo Node.js

```typescript
import axios from 'axios';

// Última cotação
const { data } = await axios.get('http://localhost:3100/price/latest');
console.log(`AZE: R$ ${data.data.azeBrl}`);

// Histórico 1h
const history = await axios.get('http://localhost:3100/price/history?window=1h');
console.log(`Preço médio 1h: R$ ${history.data.data.aze.avg}`);
```

### Exemplo cURL

```bash
# Última cotação
curl http://localhost:3100/price/latest

# Histórico 24h
curl http://localhost:3100/price/history?window=24h

# Health check
curl http://localhost:3100/price/health
```

## 🛠️ Scripts NPM

```bash
# Desenvolvimento
npm run dev

# Build
npm run build

# Produção
npm run start:prod

# Prisma
npm run db:generate    # Gerar Prisma Client
npm run db:push        # Aplicar schema ao banco
npm run db:migrate     # Criar migration
npm run db:studio      # Abrir Prisma Studio
```

## 📝 Logs

O serviço registra logs detalhados:

```
🚀 AZE Price API running on http://localhost:3100
Iniciando polling de cotação a cada 30s
Buscando cotação BTC...
✅ Cotação salva: BTC R$ 352.450,50 → AZE R$ 352,45
```

## 🔒 Segurança

- **CORS habilitado** para permitir consumo externo
- **Timeout de 10s** nas requisições à Awesome API
- **Fallback automático** em caso de erro
- **Limpeza automática** de dados antigos

## 📄 Licença

Proprietary - Navi/AGarantia

## 🤝 Suporte

Para dúvidas ou problemas, entre em contato com a equipe de desenvolvimento.
