# Instalação Final com PM2

Execute esses comandos no servidor **177.38.215.101** em `/var/www/aze-price`:

## 1. Instalar PM2 (se não tiver)

```bash
# Instalar PM2 globalmente
sudo npm install -g pm2

# Verificar instalação
pm2 --version
```

## 2. Build da Aplicação

```bash
cd /var/www/aze-price

# Build
npm run build
```

## 3. Criar Arquivo de Configuração do PM2

```bash
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'aze-price',
    script: 'dist/main.js',
    cwd: '/var/www/aze-price',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3100
    },
    error_file: '/var/www/aze-price/logs/err.log',
    out_file: '/var/www/aze-price/logs/out.log',
    log_file: '/var/www/aze-price/logs/combined.log',
    time: true
  }]
}
EOF
```

## 4. Criar Diretório de Logs

```bash
mkdir -p /var/www/aze-price/logs
```

## 5. Iniciar com PM2

```bash
# Iniciar aplicação
pm2 start ecosystem.config.js

# Verificar status
pm2 status

# Ver logs
pm2 logs aze-price

# Configurar PM2 para iniciar no boot
pm2 startup
# Execute o comando que o PM2 mostrar (começando com sudo)

# Salvar configuração atual
pm2 save
```

## 6. Testar Aplicação

```bash
# Testar se está respondendo
curl http://localhost:3100/price/health

# Deve retornar algo como:
# {"status":"healthy","lastUpdate":"...","ageSeconds":...,"source":"awesome_api"}
```

## 7. Configurar Nginx

```bash
# Criar arquivo de configuração
sudo nano /etc/nginx/sites-available/azeprice.azorescan.com
```

Cole este conteúdo:

```nginx
server {
    listen 80;
    server_name azeprice.azorescan.com;

    location / {
        proxy_pass http://localhost:3100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Salvar com `Ctrl+O`, `Enter`, `Ctrl+X`

```bash
# Criar link simbólico
sudo ln -s /etc/nginx/sites-available/azeprice.azorescan.com /etc/nginx/sites-enabled/

# Testar configuração
sudo nginx -t

# Se OK, recarregar nginx
sudo systemctl reload nginx
```

## 8. Configurar SSL com Certbot

```bash
# Instalar certbot se não tiver
sudo apt install certbot python3-certbot-nginx -y

# Obter certificado SSL
sudo certbot --nginx -d azeprice.azorescan.com

# Seguir as instruções:
# - Informar email
# - Aceitar termos
# - Escolher redirecionar HTTP para HTTPS (opção 2)
```

## 9. Testar API em Produção

```bash
# Testar HTTP
curl http://azeprice.azorescan.com/price/health

# Testar HTTPS
curl https://azeprice.azorescan.com/price/health
curl https://azeprice.azorescan.com/price/latest
```

## Comandos Úteis PM2

```bash
# Ver status
pm2 status

# Ver logs em tempo real
pm2 logs aze-price

# Ver últimas 100 linhas
pm2 logs aze-price --lines 100

# Reiniciar aplicação
pm2 restart aze-price

# Parar aplicação
pm2 stop aze-price

# Remover aplicação
pm2 delete aze-price

# Ver métricas (CPU, memória)
pm2 monit

# Informações detalhadas
pm2 info aze-price
```

## Atualizar Aplicação

Quando precisar atualizar:

```bash
cd /var/www/aze-price

# Parar aplicação
pm2 stop aze-price

# Atualizar código
git pull

# Instalar dependências (se necessário)
npm install

# Atualizar banco (se necessário)
npm run db:push

# Rebuild
npm run build

# Reiniciar
pm2 restart aze-price

# Ver logs
pm2 logs aze-price
```

## Checklist Final

- [ ] PM2 instalado
- [ ] Build criado (`npm run build`)
- [ ] Aplicação rodando no PM2 (`pm2 status`)
- [ ] Aplicação respondendo em `localhost:3100`
- [ ] Nginx configurado para `azeprice.azorescan.com`
- [ ] SSL configurado com certbot
- [ ] API respondendo em `https://azeprice.azorescan.com`
- [ ] PM2 configurado para auto-start no boot

## Endpoints Finais

- https://azeprice.azorescan.com/price/health
- https://azeprice.azorescan.com/price/latest
- https://azeprice.azorescan.com/price/history?window=1h
