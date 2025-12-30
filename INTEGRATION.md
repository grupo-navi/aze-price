# Integração com Projeto AGarantia

Este documento explica como integrar a AZE Price API com o projeto AGarantia (e outros serviços).

## 🔄 Substituindo o btc-pricing.service.ts

### Antes (apps/api/src/common/services/btc-pricing.service.ts)

```typescript
// ❌ Cada serviço fazia sua própria requisição para Awesome API
export class BtcPricingService {
  private async fetchBtcPrice(): Promise<void> {
    const response = await axios.get<AwesomeApiResponse>(apiUrl, {
      timeout: 10000,
    });
    // ... processamento
  }
}
```

**Problemas:**
- 10 serviços = 10 chaves de API
- Múltiplas requisições duplicadas
- Cada serviço precisa implementar cache e fallback

### Depois (usando AZE Price API)

```typescript
// ✅ Consome cotação centralizada
export class BtcPricingService {
  private readonly AZE_PRICE_API = process.env.AZE_PRICE_API_URL || 'http://localhost:3100';

  async getAzeQuote(): Promise<AzeQuote> {
    try {
      const { data } = await axios.get(`${this.AZE_PRICE_API}/price/latest`);

      return {
        price: data.data.azeBrl,
        priceFormatted: data.data.azeBrl.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }),
        timestamp: new Date().toISOString(),
        source: data.data.source,
        lastUpdate: data.data.timestamp,
        cacheAge: 0,
      };
    } catch (error) {
      this.logger.error('Erro ao buscar cotação da AZE Price API:', error);
      // Fallback local se necessário
      return this.getFallbackQuote();
    }
  }
}
```

**Benefícios:**
- 1 única chave de API centralizada
- Cache compartilhado entre todos os serviços
- Menos código duplicado
- Mais fácil de monitorar e debugar

## 📦 Instalação e Configuração

### 1. Deploy da AZE Price API

#### Opção A: Docker (Recomendado)

```bash
cd aze-price

# Criar .env
cp .env.example .env
nano .env  # Adicionar AWESOME_API_TOKEN

# Build e start
docker-compose up -d

# Verificar logs
docker-compose logs -f api
```

#### Opção B: PM2 (Servidor Linux)

```bash
cd aze-price

# Instalar dependências
npm install

# Configurar .env
cp .env.example .env
nano .env

# Build
npm run build

# Configurar banco
npm run db:generate
npm run db:push

# Start com PM2
pm2 start dist/main.js --name aze-price-api
pm2 save
```

### 2. Configurar Serviços Consumidores

Adicione ao `.env` de cada serviço que consome cotação:

```env
AZE_PRICE_API_URL="http://localhost:3100"
```

Em produção, use a URL do servidor:

```env
AZE_PRICE_API_URL="http://172.16.255.151:3100"
```

### 3. Atualizar Código nos Serviços

#### No AGarantia (apps/api/src/common/services/btc-pricing.service.ts)

```typescript
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface AzeQuote {
  price: number;
  priceFormatted: string;
  timestamp: string;
  source: 'awesome_api' | 'fallback';
  lastUpdate: string;
  cacheAge: number;
}

@Injectable()
export class BtcPricingService {
  private readonly logger = new Logger(BtcPricingService.name);
  private readonly AZE_PRICE_API = process.env.AZE_PRICE_API_URL || 'http://localhost:3100';
  private readonly FALLBACK_AZE_BRL = 550; // R$ 550

  /**
   * Obtém a cotação atual do AZE da API centralizada
   */
  async getAzeQuote(): Promise<AzeQuote> {
    try {
      const response = await axios.get(`${this.AZE_PRICE_API}/price/latest`, {
        timeout: 5000,
      });

      if (!response.data.success) {
        throw new Error('Cotação não disponível');
      }

      const { btcBrl, azeBrl, source, timestamp } = response.data.data;

      return {
        price: azeBrl,
        priceFormatted: azeBrl.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }),
        timestamp: new Date().toISOString(),
        source,
        lastUpdate: timestamp,
        cacheAge: Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000),
      };
    } catch (error: any) {
      this.logger.error(`Erro ao buscar cotação da AZE Price API: ${error.message}`);

      // Fallback local
      return {
        price: this.FALLBACK_AZE_BRL,
        priceFormatted: this.FALLBACK_AZE_BRL.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }),
        timestamp: new Date().toISOString(),
        source: 'fallback',
        lastUpdate: new Date().toISOString(),
        cacheAge: 0,
      };
    }
  }

  /**
   * Obtém histórico de preços
   */
  async getPriceHistory(window: '5m' | '15m' | '30m' | '1h' | '24h' | '7d') {
    try {
      const response = await axios.get(`${this.AZE_PRICE_API}/price/history`, {
        params: { window },
        timeout: 5000,
      });

      if (!response.data.success) {
        return null;
      }

      return response.data.data;
    } catch (error) {
      this.logger.error(`Erro ao buscar histórico: ${error.message}`);
      return null;
    }
  }

  /**
   * Força atualização da cotação (mantido por compatibilidade)
   */
  async refreshQuote(): Promise<AzeQuote> {
    // Simplesmente retorna a última cotação disponível
    return this.getAzeQuote();
  }

  /**
   * Obtém status do serviço
   */
  async getStatus() {
    try {
      const health = await axios.get(`${this.AZE_PRICE_API}/price/health`, {
        timeout: 5000,
      });

      return {
        isPolling: health.data.status === 'healthy',
        hasCachedData: true,
        cacheAge: health.data.ageSeconds,
        source: health.data.source,
        pollingInterval: 30000,
      };
    } catch (error) {
      return {
        isPolling: false,
        hasCachedData: false,
        cacheAge: null,
        source: null,
        pollingInterval: 30000,
      };
    }
  }

  // Remove métodos desnecessários:
  // - startPolling() - não precisa mais
  // - stopPolling() - não precisa mais
  // - onModuleDestroy() - não precisa mais
}
```

## 🚀 Deploy em Produção

### Servidor Dedicado para AZE Price API

```bash
# SSH no servidor
ssh user@seu-servidor

# Clonar repositório
cd /var/www
git clone <repo-url> aze-price
cd aze-price

# Instalar dependências
npm install

# Configurar .env
nano .env

# Build
npm run build

# Configurar banco
npm run db:generate
npm run db:push

# Start com PM2
pm2 start dist/main.js --name aze-price-api
pm2 startup
pm2 save

# Verificar logs
pm2 logs aze-price-api
```

### Nginx (se necessário)

```nginx
server {
    listen 80;
    server_name aze-price.sua-empresa.com.br;

    location / {
        proxy_pass http://localhost:3100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 📊 Monitoramento

### Health Check

```bash
# Verificar se API está respondendo
curl http://localhost:3100/price/health

# Última cotação
curl http://localhost:3100/price/latest

# Histórico 1h
curl http://localhost:3100/price/history?window=1h
```

### PM2 Logs

```bash
# Ver logs em tempo real
pm2 logs aze-price-api

# Ver status
pm2 status

# Restart se necessário
pm2 restart aze-price-api
```

## 🔧 Migração Gradual

Você pode migrar seus serviços gradualmente:

1. **Deploy AZE Price API** em servidor separado
2. **Teste** com um serviço primeiro
3. **Migre** os outros serviços aos poucos
4. **Remova** implementações antigas quando todos estiverem migrados

## 💡 Casos de Uso

### 1. Cotação em Tempo Real (AGarantia)

```typescript
const quote = await this.btcPricingService.getAzeQuote();
console.log(`AZE: ${quote.priceFormatted}`);
```

### 2. Gráfico de Histórico (Dashboard)

```typescript
const history24h = await this.btcPricingService.getPriceHistory('24h');
// Renderizar gráfico com history24h.prices
```

### 3. Cálculo de Valor em AZE

```typescript
const quote = await this.btcPricingService.getAzeQuote();
const valueInBrl = 1000; // R$ 1.000
const valueInAze = valueInBrl / quote.price;
console.log(`R$ ${valueInBrl} = ${valueInAze.toFixed(2)} AZE`);
```

## 🆘 Troubleshooting

### Erro: Connection Refused

```bash
# Verificar se API está rodando
pm2 status aze-price-api

# Verificar porta
lsof -i :3100

# Restart
pm2 restart aze-price-api
```

### Erro: Database Connection

```bash
# Verificar se PostgreSQL está rodando
sudo systemctl status postgresql

# Testar conexão
psql -U postgres -d aze_price
```

### Cotação Sempre em Fallback

```bash
# Verificar logs da API
pm2 logs aze-price-api

# Verificar se token está configurado
cat .env | grep AWESOME_API_TOKEN

# Testar token manualmente
curl "https://economia.awesomeapi.com.br/json/last/BTC-BRL?token=SEU_TOKEN"
```

## 📞 Suporte

Para dúvidas sobre integração, entre em contato com a equipe de desenvolvimento.
