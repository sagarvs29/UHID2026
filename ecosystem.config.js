/**
 * PM2 Ecosystem File — Production Deployment
 * 
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 start ecosystem.config.js --env production
 *   pm2 reload ecosystem.config.js
 */

module.exports = {
  apps: [
    {
      name: 'uhid-api',
      script: 'dist/index.js',
      cwd: './apps/api',
      instances: 'max',        // Use all CPU cores
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'development',
        PORT: 5001,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5001,
      },
      // Log configuration
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      merge_logs: true,
      // Graceful shutdown
      kill_timeout: 10000,
      listen_timeout: 5000,
    },
    {
      name: 'uhid-ai',
      script: 'uvicorn',
      args: 'main:app --host 0.0.0.0 --port 8001 --workers 2',
      cwd: './apps/ai',
      interpreter: 'python3',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        ENV: 'production',
      },
      error_file: './logs/ai-error.log',
      out_file: './logs/ai-out.log',
    },
  ],
};
