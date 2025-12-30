/**
 * Exemplo de cliente para consumir a AZE Price API
 * Use este código em seus outros serviços
 */

import axios from 'axios';

const API_BASE_URL = process.env.AZE_PRICE_API_URL || 'http://localhost:3100';

interface AzePriceLatest {
  success: boolean;
  data: {
    btcBrl: number;
    azeBrl: number;
    source: 'awesome_api' | 'fallback';
    timestamp: string;
  };
}

interface AzePriceHistory {
  success: boolean;
  data: {
    window: string;
    count: number;
    startTime: string;
    endTime: string;
    aze: {
      current: number;
      min: number;
      max: number;
      avg: number;
      first: number;
    };
    btc: {
      current: number;
      min: number;
      max: number;
      avg: number;
      first: number;
    };
    prices: Array<{
      timestamp: string;
      btcBrl: number;
      azeBrl: number;
      source: string;
    }>;
  };
}

export class AzePriceClient {
  /**
   * Obter última cotação do AZE
   */
  static async getLatestPrice(): Promise<number> {
    try {
      const { data } = await axios.get<AzePriceLatest>(
        `${API_BASE_URL}/price/latest`,
      );

      if (!data.success) {
        throw new Error('Cotação não disponível');
      }

      return data.data.azeBrl;
    } catch (error) {
      console.error('Erro ao buscar cotação AZE:', error);
      throw error;
    }
  }

  /**
   * Obter cotação completa (BTC + AZE)
   */
  static async getLatestPriceFull(): Promise<AzePriceLatest['data']> {
    try {
      const { data } = await axios.get<AzePriceLatest>(
        `${API_BASE_URL}/price/latest`,
      );

      if (!data.success) {
        throw new Error('Cotação não disponível');
      }

      return data.data;
    } catch (error) {
      console.error('Erro ao buscar cotação:', error);
      throw error;
    }
  }

  /**
   * Obter histórico de preços
   * @param window - Janela de tempo: 5m, 15m, 30m, 1h, 24h, 7d
   */
  static async getPriceHistory(
    window: '5m' | '15m' | '30m' | '1h' | '24h' | '7d',
  ): Promise<AzePriceHistory['data']> {
    try {
      const { data } = await axios.get<AzePriceHistory>(
        `${API_BASE_URL}/price/history`,
        {
          params: { window },
        },
      );

      if (!data.success) {
        throw new Error('Histórico não disponível');
      }

      return data.data;
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      throw error;
    }
  }

  /**
   * Verificar saúde da API
   */
  static async checkHealth(): Promise<boolean> {
    try {
      const { data } = await axios.get(`${API_BASE_URL}/price/health`);
      return data.status === 'healthy';
    } catch (error) {
      console.error('Erro ao verificar saúde da API:', error);
      return false;
    }
  }
}

// ============================================
// EXEMPLOS DE USO
// ============================================

async function examples() {
  // 1. Obter apenas o preço do AZE
  const azePrice = await AzePriceClient.getLatestPrice();
  console.log(`Preço do AZE: R$ ${azePrice.toFixed(2)}`);

  // 2. Obter cotação completa
  const fullPrice = await AzePriceClient.getLatestPriceFull();
  console.log(`BTC: R$ ${fullPrice.btcBrl.toLocaleString('pt-BR')}`);
  console.log(`AZE: R$ ${fullPrice.azeBrl.toFixed(2)}`);
  console.log(`Fonte: ${fullPrice.source}`);

  // 3. Obter histórico da última hora
  const history1h = await AzePriceClient.getPriceHistory('1h');
  console.log(`\nHistórico 1h:`);
  console.log(`- Preço atual: R$ ${history1h.aze.current.toFixed(2)}`);
  console.log(`- Preço médio: R$ ${history1h.aze.avg.toFixed(2)}`);
  console.log(`- Preço mínimo: R$ ${history1h.aze.min.toFixed(2)}`);
  console.log(`- Preço máximo: R$ ${history1h.aze.max.toFixed(2)}`);
  console.log(`- Total de registros: ${history1h.count}`);

  // 4. Obter histórico de 24h
  const history24h = await AzePriceClient.getPriceHistory('24h');
  console.log(`\nHistórico 24h:`);
  console.log(`- Variação: ${((history24h.aze.current / history24h.aze.first - 1) * 100).toFixed(2)}%`);

  // 5. Verificar saúde da API
  const isHealthy = await AzePriceClient.checkHealth();
  console.log(`\nAPI está saudável: ${isHealthy ? 'Sim' : 'Não'}`);
}

// Executar exemplos
if (require.main === module) {
  examples().catch(console.error);
}

export default AzePriceClient;
