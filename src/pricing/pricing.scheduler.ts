import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PricingService } from './pricing.service';

@Injectable()
export class PricingScheduler {
  private readonly logger = new Logger(PricingScheduler.name);
  private readonly POLLING_INTERVAL_MS = Number(process.env.POLLING_INTERVAL_MS) || 30000;

  constructor(private pricingService: PricingService) {
    // Buscar imediatamente ao iniciar
    this.logger.log(`Iniciando polling de cotação a cada ${this.POLLING_INTERVAL_MS / 1000}s`);
    this.handlePriceFetch();

    // Configurar intervalo
    setInterval(() => {
      this.handlePriceFetch();
    }, this.POLLING_INTERVAL_MS);
  }

  /**
   * Busca cotação
   */
  private async handlePriceFetch() {
    await this.pricingService.fetchAndSavePrice();
  }

  /**
   * Cleanup diário: remove registros com mais de 7 dias
   * Executa todo dia às 3:00 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleCleanup() {
    this.logger.log('Iniciando limpeza de registros antigos...');

    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const result = await this.pricingService['prisma'].priceHistory.deleteMany({
        where: {
          timestamp: {
            lt: sevenDaysAgo,
          },
        },
      });

      this.logger.log(`✅ Limpeza concluída: ${result.count} registros removidos`);
    } catch (error) {
      this.logger.error(`❌ Erro na limpeza: ${error.message}`);
    }
  }
}
