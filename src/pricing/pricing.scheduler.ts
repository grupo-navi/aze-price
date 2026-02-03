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

    // Executar limpeza na inicialização
    this.handleCleanup();

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
    this.logger.log('Iniciando limpeza de registros antigos (>7 dias)...');

    try {
      const countBefore = await this.pricingService.countRecords();
      const deletedCount = await this.pricingService.cleanupOldRecords();
      const countAfter = await this.pricingService.countRecords();

      this.logger.log(
        `✅ Limpeza concluída: ${deletedCount} registros removidos | ` +
        `Antes: ${countBefore} | Depois: ${countAfter}`,
      );
    } catch (error) {
      this.logger.error(`❌ Erro na limpeza: ${error.message}`);
    }
  }
}
