# TimeFlow Docker Deployment

## Quick Start

1. Create the data directory and set permissions:
   ```bash
   mkdir -p ./data
   ```

2. Create `.env` file with your configuration:
   ```bash
   # Required: Change this to a secure random string
   JWT_SECRET=your-very-long-random-secret-key-at-least-32-characters

   # Optional: Change port (default is 3000)
   PORT=3000
   ```

3. Build and start the container:
   ```bash
   docker-compose up -d --build
   ```

4. Access the app via nginx proxy at your configured domain.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `JWT_SECRET` | Secret key for JWT token signing | **Required** |
| `PORT` | Application port | `3000` |
| `DATABASE_URL` | SQLite database path | `file:/data/timeflow.db` |

## Data Persistence

The SQLite database is stored in `./data/` directory on your host machine. This ensures:
- Database persists between container restarts
- Database persists when rebuilding the container
- Easy backup - just copy the `./data/` folder

### Backup

```bash
# Create backup
cp -r ./data ./data-backup-$(date +%Y%m%d)

# Or create compressed archive
tar czf timeflow-backup-$(date +%Y%m%d).tar.gz ./data
```

### Restore

```bash
# Stop container first
docker-compose down

# Restore from backup
cp -r ./data-backup-YYYYMMDD/* ./data/

# Start container
docker-compose up -d
```

## Nginx Proxy Configuration

Since the container binds to `127.0.0.1`, you need an nginx proxy to expose it:

```nginx
server {
    listen 80;
    server_name timeflow.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
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

## Commands

### Start
```bash
docker-compose up -d
```

### Stop
```bash
docker-compose down
```

### View logs
```bash
docker-compose logs -f timeflow
```

### Rebuild after updates
```bash
docker-compose build --no-cache
docker-compose up -d
```

### Use custom port
```bash
PORT=8080 docker-compose up -d
```

Or set in `.env`:
```
PORT=8080
```
