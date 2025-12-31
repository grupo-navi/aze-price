import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma.service';

interface AwesomeApiCurrency {
  code: string;
  codein: string;
  name: string;
  high: string;
  low: string;
  varBid: string;
  pctChange: string;
  bid: string;
  ask: string;
  timestamp: string;
  create_date: string;
}

interface AwesomeApiResponse {
  BTCBRL: AwesomeApiCurrency;
  BTCUSD: AwesomeApiCurrency;
  USDBRL: AwesomeApiCurrency;
}

@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);
  private readonly BTC_DIVISOR = Number(process.env.BTC_DIVISOR) || 1000;
  private readonly FALLBACK_BTC_BRL = Number(process.env.FALLBACK_BTC_BRL) || 550000;

  constructor(private prisma: PrismaService) {}

  /**
   * Busca preço do BTC e calcula AZE
   */
  async fetchAndSavePrice(): Promise<void> {
    try {
      const apiUrl = this.getApiUrl();
      this.logger.log('Buscando cotação BTC...');

      const response = await axios.get<AwesomeApiResponse>(apiUrl, {
        timeout: 10000,
      });

      const btcBrlData = response.data?.BTCBRL;
      const btcUsdData = response.data?.BTCUSD;
      const usdBrlData = response.data?.USDBRL;

      if (!btcBrlData || !btcUsdData || !usdBrlData) {
        this.logger.error('Resposta inválida da API:', JSON.stringify(response.data));
        throw new Error('Resposta inválida da Awesome API');
      }

      const btcBrl = parseFloat(btcBrlData.bid);
      const btcUsd = parseFloat(btcUsdData.bid);
      const usdBrl = parseFloat(usdBrlData.bid);

      if (isNaN(btcBrl) || btcBrl <= 0 || isNaN(btcUsd) || btcUsd <= 0 || isNaN(usdBrl) || usdBrl <= 0) {
        this.logger.error(`Preços inválidos - BTC/BRL: ${btcBrlData.bid}, BTC/USD: ${btcUsdData.bid}, USD/BRL: ${usdBrlData.bid}`);
        throw new Error('Preços inválidos da Awesome API');
      }

      const azeBrl = btcBrl / this.BTC_DIVISOR;
      const azeUsd = btcUsd / this.BTC_DIVISOR;

      // Salvar no banco
      await this.prisma.priceHistory.create({
        data: {
          btcBrl,
          azeBrl,
          btcUsd,
          azeUsd,
          usdBrl,
          source: 'awesome_api',
        },
      });

      this.logger.log(
        `✅ Cotação salva: BTC R$ ${btcBrl.toLocaleString('pt-BR')} / $ ${btcUsd.toLocaleString('en-US')} → AZE R$ ${azeBrl.toLocaleString('pt-BR', { minimumFractionDigits: 3 })} / $ ${azeUsd.toLocaleString('en-US', { minimumFractionDigits: 3 })}`,
      );
    } catch (error: any) {
      this.logger.error(`❌ Erro ao buscar cotação: ${error.message}`);

      // Log detalhado
      if (error.response) {
        this.logger.error(`Resposta HTTP: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      }

      // Usar fallback apenas se não houver nenhum registro recente
      const lastPrice = await this.getLatestPrice();
      if (!lastPrice) {
        const fallbackBtcUsd = 95000; // Fallback BTC/USD
        const fallbackUsdBrl = 5.50; // Fallback USD/BRL
        const fallbackAzeBrl = this.FALLBACK_BTC_BRL / this.BTC_DIVISOR;
        const fallbackAzeUsd = fallbackBtcUsd / this.BTC_DIVISOR;

        await this.prisma.priceHistory.create({
          data: {
            btcBrl: this.FALLBACK_BTC_BRL,
            azeBrl: fallbackAzeBrl,
            btcUsd: fallbackBtcUsd,
            azeUsd: fallbackAzeUsd,
            usdBrl: fallbackUsdBrl,
            source: 'fallback',
          },
        });
        this.logger.warn(`⚠️  Usando preço fallback: BTC R$ ${this.FALLBACK_BTC_BRL.toLocaleString('pt-BR')} / $ ${fallbackBtcUsd.toLocaleString('en-US')}`);
      }
    }
  }

  /**
   * Obter última cotação
   */
  async getLatestPrice() {
    return this.prisma.priceHistory.findFirst({
      orderBy: { timestamp: 'desc' },
    });
  }

  /**
   * Obter histórico por janela de tempo
   * @param windowMinutes Janela em minutos (5, 15, 30, 60, 1440, 10080)
   */
  async getPriceHistory(windowMinutes: number) {
    const now = new Date();
    const startTime = new Date(now.getTime() - windowMinutes * 60 * 1000);

    const prices = await this.prisma.priceHistory.findMany({
      where: {
        timestamp: {
          gte: startTime,
        },
      },
      orderBy: { timestamp: 'asc' },
    });

    if (prices.length === 0) {
      return null;
    }

    // Calcular estatísticas
    const azeBrlValues = prices.map((p) => p.azeBrl);
    const btcBrlValues = prices.map((p) => p.btcBrl);
    const azeUsdValues = prices.map((p) => p.azeUsd);
    const btcUsdValues = prices.map((p) => p.btcUsd);
    const usdBrlValues = prices.map((p) => p.usdBrl);

    return {
      window: `${windowMinutes}m`,
      count: prices.length,
      startTime: prices[0].timestamp,
      endTime: prices[prices.length - 1].timestamp,
      brl: {
        aze: {
          current: azeBrlValues[azeBrlValues.length - 1],
          min: Math.min(...azeBrlValues),
          max: Math.max(...azeBrlValues),
          avg: azeBrlValues.reduce((a, b) => a + b, 0) / azeBrlValues.length,
          first: azeBrlValues[0],
        },
        btc: {
          current: btcBrlValues[btcBrlValues.length - 1],
          min: Math.min(...btcBrlValues),
          max: Math.max(...btcBrlValues),
          avg: btcBrlValues.reduce((a, b) => a + b, 0) / btcBrlValues.length,
          first: btcBrlValues[0],
        },
      },
      usd: {
        aze: {
          current: azeUsdValues[azeUsdValues.length - 1],
          min: Math.min(...azeUsdValues),
          max: Math.max(...azeUsdValues),
          avg: azeUsdValues.reduce((a, b) => a + b, 0) / azeUsdValues.length,
          first: azeUsdValues[0],
        },
        btc: {
          current: btcUsdValues[btcUsdValues.length - 1],
          min: Math.min(...btcUsdValues),
          max: Math.max(...btcUsdValues),
          avg: btcUsdValues.reduce((a, b) => a + b, 0) / btcUsdValues.length,
          first: btcUsdValues[0],
        },
        toBrl: {
          current: usdBrlValues[usdBrlValues.length - 1],
          min: Math.min(...usdBrlValues),
          max: Math.max(...usdBrlValues),
          avg: usdBrlValues.reduce((a, b) => a + b, 0) / usdBrlValues.length,
          first: usdBrlValues[0],
        },
      },
      prices: prices.map((p) => ({
        timestamp: p.timestamp,
        btcBrl: p.btcBrl,
        azeBrl: p.azeBrl,
        btcUsd: p.btcUsd,
        azeUsd: p.azeUsd,
        usdBrl: p.usdBrl,
        source: p.source,
      })),
    };
  }

  /**
   * URL da API com token
   */
  private getApiUrl(): string {
    const token = process.env.AWESOME_API_TOKEN;
    const baseUrl = 'https://economia.awesomeapi.com.br/json/last/BTC-BRL,BTC-USD,USD-BRL';
    return token ? `${baseUrl}?token=${token}` : baseUrl;
  }
}
