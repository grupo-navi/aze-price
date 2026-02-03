/**
 * Script para limpar dados antigos do banco de dados
 * Remove registros com mais de 7 dias
 *
 * Uso: npx ts-node scripts/cleanup-old-data.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanup() {
  console.log('🧹 Iniciando limpeza de dados antigos...\n');

  try {
    // Contar registros antes
    const countBefore = await prisma.priceHistory.count();
    console.log(`📊 Total de registros antes: ${countBefore.toLocaleString('pt-BR')}`);

    // Calcular data de corte (7 dias atrás)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    console.log(`📅 Removendo registros anteriores a: ${sevenDaysAgo.toISOString()}\n`);

    // Deletar registros antigos
    const result = await prisma.priceHistory.deleteMany({
      where: {
        timestamp: {
          lt: sevenDaysAgo,
        },
      },
    });

    // Contar registros depois
    const countAfter = await prisma.priceHistory.count();

    console.log('\n✅ Limpeza concluída!');
    console.log(`📊 Registros removidos: ${result.count.toLocaleString('pt-BR')}`);
    console.log(`📊 Total de registros após limpeza: ${countAfter.toLocaleString('pt-BR')}`);

    // Mostrar economia de espaço (estimativa)
    const avgRecordSize = 200; // bytes aproximados por registro
    const spaceSaved = (result.count * avgRecordSize) / (1024 * 1024);
    console.log(`💾 Espaço liberado (estimativa): ${spaceSaved.toFixed(2)} MB\n`);

  } catch (error) {
    console.error('❌ Erro durante limpeza:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

cleanup();
