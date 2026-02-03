# Guia de Manutenção - AZE Price API

## 🧹 Limpeza de Dados Antigos

A API mantém automaticamente apenas os últimos 7 dias de dados históricos para evitar crescimento excessivo do banco.

### Limpeza Automática

- **Quando**: Todo dia às 3:00 AM (horário do servidor)
- **Também**: Na inicialização da aplicação
- **O que faz**: Remove todos os registros com mais de 7 dias

### Limpeza Manual

Se precisar limpar dados manualmente (ex: disco cheio):

```bash
# No diretório do projeto
cd /var/www/aze-price

# Executar script de limpeza
npm run db:cleanup
```

### Verificar Quantidade de Registros

```bash
# Via Prisma
npx prisma studio

# Ou via SQL direto
psql -U postgres -d aze_price -c "SELECT COUNT(*) FROM price_history;"

# Ver idade dos registros
psql -U postgres -d aze_price -c "SELECT MIN(timestamp) as oldest, MAX(timestamp) as newest, COUNT(*) as total FROM price_history;"
```

## 💾 Monitoramento de Espaço em Disco

### Verificar Espaço

```bash
# Espaço total
df -h

# Espaço usado por diretório
sudo du -h --max-depth=1 / 2>/dev/null | sort -rh | head -20

# Tamanho do banco de dados
sudo du -sh /var/lib/postgresql/
```

### Limpeza de Emergência (disco cheio)

```bash
# 1. Limpar logs do sistema (libera bastante espaço)
sudo journalctl --vacuum-time=3d

# 2. Limpar cache do apt
sudo apt-get clean
sudo apt-get autoclean
sudo apt-get autoremove -y

# 3. Limpar logs antigos
sudo find /var/log -type f -name "*.gz" -delete
sudo find /var/log -type f -name "*.1" -delete

# 4. Limpar logs do PM2
pm2 flush

# 5. Limpar dados antigos do banco
cd /var/www/aze-price
npm run db:cleanup

# 6. Reiniciar serviços
sudo systemctl restart postgresql
pm2 restart aze-price
```

## 📊 Logs da Aplicação

### Ver logs do PM2

```bash
# Todos os logs
pm2 logs aze-price

# Apenas erros
pm2 logs aze-price --err

# Últimas 100 linhas
pm2 logs aze-price --lines 100

# Limpar logs
pm2 flush
```

### Logs do PostgreSQL

```bash
# Ver logs recentes
sudo tail -n 100 /var/log/postgresql/postgresql-*.log

# Limpar logs antigos (cuidado!)
sudo find /var/log/postgresql -type f -name "*.log" -mtime +7 -delete
```

## 🚨 Troubleshooting

### Erro: "could not write init file"

**Causa**: Disco cheio (100%)

**Solução**:
1. Liberar espaço (ver "Limpeza de Emergência" acima)
2. Reiniciar PostgreSQL: `sudo systemctl restart postgresql`
3. Reiniciar aplicação: `pm2 restart aze-price`

### API retornando erro 500

```bash
# 1. Verificar logs
pm2 logs aze-price --err --lines 50

# 2. Verificar disco
df -h

# 3. Verificar PostgreSQL
sudo systemctl status postgresql

# 4. Reiniciar tudo
sudo systemctl restart postgresql
pm2 restart aze-price
```

### Banco muito grande

```bash
# Ver tamanho das tabelas
psql -U postgres -d aze_price -c "\dt+"

# Limpar dados antigos
npm run db:cleanup

# VACUUM no PostgreSQL (recupera espaço)
psql -U postgres -d aze_price -c "VACUUM FULL;"
```

## ⚙️ Configurações de Retenção

Para mudar o período de retenção de dados, edite `.env`:

```bash
# Manter dados por X dias (padrão: 7)
DATA_RETENTION_DAYS=7
```

## 📅 Rotinas Recomendadas

### Diário
- Verificar logs: `pm2 logs aze-price --lines 50`
- Verificar health: `curl http://localhost:3100/price/health`

### Semanal
- Verificar espaço em disco: `df -h`
- Verificar quantidade de registros no banco

### Mensal
- Limpar logs antigos do sistema
- Verificar se a limpeza automática está funcionando
- Atualizar dependências: `npm update`
