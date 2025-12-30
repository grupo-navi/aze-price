import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma.service';

interface AwesomeApiResponse {
  BTCBRL: {
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
  };
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

      const btcData = response.data?.BTCBRL;

      if (!btcData) {
        this.logger.error('Resposta inválida da API:', JSON.stringify(response.data));
        throw new Error('Resposta inválida da Awesome API');
      }

      const btcBrl = parseFloat(btcData.bid);

      if (isNaN(btcBrl) || btcBrl <= 0) {
        this.logger.error(`Preço BTC inválido: ${btcData.bid}`);
        throw new Error(`Preço BTC inválido: ${btcData.bid}`);
      }

      const azeBrl = btcBrl / this.BTC_DIVISOR;

      // Salvar no banco
      await this.prisma.priceHistory.create({
        data: {
          btcBrl,
          azeBrl,
          source: 'awesome_api',
        },
      });

      this.logger.log(
        `✅ Cotação salva: BTC R$ ${btcBrl.toLocaleString('pt-BR')} → AZE R$ ${azeBrl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
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
        const fallbackAze = this.FALLBACK_BTC_BRL / this.BTC_DIVISOR;
        await this.prisma.priceHistory.create({
          data: {
            btcBrl: this.FALLBACK_BTC_BRL,
            azeBrl: fallbackAze,
            source: 'fallback',
          },
        });
        this.logger.warn(`⚠️  Usando preço fallback: BTC R$ ${this.FALLBACK_BTC_BRL.toLocaleString('pt-BR')} → AZE R$ ${fallbackAze.toFixed(2)}`);
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
    const azeValues = prices.map((p) => p.azeBrl);
    const btcValues = prices.map((p) => p.btcBrl);

    return {
      window: `${windowMinutes}m`,
      count: prices.length,
      startTime: prices[0].timestamp,
      endTime: prices[prices.length - 1].timestamp,
      aze: {
        current: azeValues[azeValues.length - 1],
        min: Math.min(...azeValues),
        max: Math.max(...azeValues),
        avg: azeValues.reduce((a, b) => a + b, 0) / azeValues.length,
        first: azeValues[0],
      },
      btc: {
        current: btcValues[btcValues.length - 1],
        min: Math.min(...btcValues),
        max: Math.max(...btcValues),
        avg: btcValues.reduce((a, b) => a + b, 0) / btcValues.length,
        first: btcValues[0],
      },
      prices: prices.map((p) => ({
        timestamp: p.timestamp,
        btcBrl: p.btcBrl,
        azeBrl: p.azeBrl,
        source: p.source,
      })),
    };
  }

  /**
   * URL da API com token
   */
  private getApiUrl(): string {
    const token = process.env.AWESOME_API_TOKEN;
    const baseUrl = 'https://economia.awesomeapi.com.br/json/last/BTC-BRL';
    return token ? `${baseUrl}?token=${token}` : baseUrl;
  }
}
