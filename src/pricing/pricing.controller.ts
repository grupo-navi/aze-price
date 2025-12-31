import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { PricingService } from './pricing.service';

@Controller('price')
export class PricingController {
  constructor(private pricingService: PricingService) {}

  /**
   * GET /price/latest
   * Retorna a última cotação registrada
   */
  @Get('latest')
  async getLatest() {
    const price = await this.pricingService.getLatestPrice();

    if (!price) {
      return {
        success: false,
        message: 'Nenhuma cotação disponível',
      };
    }

    return {
      success: true,
      data: {
        brl: {
          btc: price.btcBrl,
          aze: price.azeBrl,
        },
        usd: {
          btc: price.btcUsd,
          aze: price.azeUsd,
          toBrl: price.usdBrl,
        },
        source: price.source,
        timestamp: price.timestamp,
      },
    };
  }

  /**
   * GET /price/history?window=5m
   * Retorna histórico de cotações por janela de tempo
   *
   * Janelas suportadas:
   * - 5m (5 minutos)
   * - 15m (15 minutos)
   * - 30m (30 minutos)
   * - 1h (1 hora)
   * - 24h (24 horas)
   * - 7d (7 dias)
   */
  @Get('history')
  async getHistory(@Query('window') window: string) {
    if (!window) {
      throw new BadRequestException('Parâmetro "window" é obrigatório');
    }

    // Converter janela para minutos
    const windowMinutes = this.parseWindow(window);

    if (!windowMinutes) {
      throw new BadRequestException(
        'Janela inválida. Use: 5m, 15m, 30m, 1h, 24h, 7d',
      );
    }

    const history = await this.pricingService.getPriceHistory(windowMinutes);

    if (!history) {
      return {
        success: false,
        message: 'Nenhum dado disponível para esta janela',
      };
    }

    return {
      success: true,
      data: history,
    };
  }

  /**
   * GET /price/health
   * Health check do serviço
   */
  @Get('health')
  async getHealth() {
    const latest = await this.pricingService.getLatestPrice();

    if (!latest) {
      return {
        status: 'degraded',
        message: 'Nenhuma cotação disponível',
      };
    }

    const age = Math.floor((Date.now() - latest.timestamp.getTime()) / 1000);

    return {
      status: age < 120 ? 'healthy' : 'degraded',
      lastUpdate: latest.timestamp,
      ageSeconds: age,
      source: latest.source,
    };
  }

  /**
   * Converte janela de tempo para minutos
   */
  private parseWindow(window: string): number | null {
    const windowMap: Record<string, number> = {
      '5m': 5,
      '15m': 15,
      '30m': 30,
      '1h': 60,
      '24h': 1440,
      '7d': 10080,
    };

    return windowMap[window] || null;
  }
}
