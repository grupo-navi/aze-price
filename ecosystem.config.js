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
