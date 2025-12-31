#!/bin/bash

# Script de Instalação Automática - AZE Price API
# Para usar: bash install.sh

set -e

echo "================================================"
echo "   AZE Price API - Instalação Automática"
echo "================================================"
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para printar com cor
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${YELLOW}→${NC} $1"
}

# Verificar se está no diretório correto
if [ ! -f "package.json" ]; then
    print_error "Execute este script no diretório raiz do projeto (/var/www/aze-price)"
    exit 1
fi

# 1. Instalar PM2 se não estiver instalado
print_info "Verificando PM2..."
if ! command -v pm2 &> /dev/null; then
    print_info "Instalando PM2 globalmente..."
    sudo npm install -g pm2
    print_success "PM2 instalado"
else
    print_success "PM2 já está instalado"
fi

# 2. Verificar arquivo .env
print_info "Verificando arquivo .env..."
if [ ! -f ".env" ]; then
    print_error "Arquivo .env não encontrado!"
    echo "Por favor, crie o arquivo .env com as configurações necessárias."
    echo "Exemplo:"
    echo "  cp .env.example .env"
    echo "  nano .env"
    exit 1
fi
print_success "Arquivo .env encontrado"

# 3. Instalar dependências
print_info "Instalando dependências..."
npm install
print_success "Dependências instaladas"

# 4. Gerar Prisma Client
print_info "Gerando Prisma Client..."
npm run db:generate
print_success "Prisma Client gerado"

# 5. Aplicar schema ao banco
print_info "Aplicando schema ao banco de dados..."
npm run db:push
print_success "Schema aplicado"

# 6. Build da aplicação
print_info "Compilando aplicação..."
npm run build
print_success "Build criado"

# 7. Criar diretório de logs
print_info "Criando diretório de logs..."
mkdir -p logs
print_success "Diretório de logs criado"

# 8. Parar aplicação se estiver rodando
print_info "Verificando aplicação existente..."
if pm2 show aze-price &> /dev/null; then
    print_info "Parando aplicação existente..."
    pm2 stop aze-price
    pm2 delete aze-price
    print_success "Aplicação anterior removida"
fi

# 9. Iniciar com PM2
print_info "Iniciando aplicação com PM2..."
pm2 start ecosystem.config.js
print_success "Aplicação iniciada"

# 10. Salvar configuração PM2
print_info "Salvando configuração do PM2..."
pm2 save
print_success "Configuração salva"

# 11. Verificar status
echo ""
echo "================================================"
echo "   Status da Aplicação"
echo "================================================"
pm2 status

echo ""
echo "================================================"
echo "   Instalação Concluída! ✓"
echo "================================================"
echo ""
echo "Comandos úteis:"
echo "  pm2 status              - Ver status"
echo "  pm2 logs aze-price      - Ver logs"
echo "  pm2 restart aze-price   - Reiniciar"
echo "  pm2 stop aze-price      - Parar"
echo ""
echo "Testar API:"
echo "  curl http://localhost:3100/price/health"
echo ""
echo "Próximos passos:"
echo "  1. Configure o nginx (ver INSTALL_PM2.md)"
echo "  2. Configure SSL com certbot"
echo "  3. Configure PM2 startup: pm2 startup"
echo ""
