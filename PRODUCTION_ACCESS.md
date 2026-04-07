# Buzeye CRM Production Server Access

## SSH Access
- **Key Location**: `$HOME/Downloads/crm.pem`
- **Host**: `ec2-15-207-54-114.ap-south-1.compute.amazonaws.com`
- **User**: `ubuntu`
- **Command**: 
  ```bash
  ssh -i "$HOME/Downloads/crm.pem" ubuntu@ec2-15-207-54-114.ap-south-1.compute.amazonaws.com
  ```
- **Key Permissions**: Must be `600`
  ```bash
  chmod 600 "$HOME/Downloads/crm.pem"
  ```

## Production Paths
- **Main Repo**: `/home/ubuntu/CRM`
- **Tenant Path**: `/home/ubuntu/CRM/tenants/<slug>`
- **Tenant Registry**: `/home/ubuntu/CRM/tenants/registry.json`
- **Nginx Sites**: `/etc/nginx/sites-available/` and `/etc/nginx/sites-enabled/`

## Common Docker Commands (Run on Server)

### Check Tenant Status
```bash
sudo docker ps | grep <tenant-slug>
```

### View Container Logs
```bash
sudo docker logs crm_<slug>_backend --tail 50
sudo docker logs crm_<slug>_frontend --tail 50
sudo docker logs crm_<slug>_database --tail 50
```

### Rebuild Tenant Services
```bash
cd /home/ubuntu/CRM/tenants/<slug>
sudo docker-compose up -d --build frontend  # Rebuild frontend
sudo docker-compose up -d --build backend   # Rebuild backend
sudo docker-compose restart <service>       # Restart specific service
```

### Database Access
```bash
# Access PostgreSQL shell
sudo docker exec -it crm_<slug>_database psql -U crm_<slug> -d crm_<slug>

# Run SQL file
sudo docker exec -i crm_<slug>_database psql -U crm_<slug> -d crm_<slug> < file.sql

# Count records
sudo docker exec crm_<slug>_database psql -U crm_<slug> -d crm_<slug> -c 'SELECT COUNT(*) FROM customers;'
```

## Acme Tenant Details
- **Slug**: acme
- **Company**: Acme Corp
- **Admin Email**: admin@acme.com
- **Password**: Buz3y3!@Acm3#2026
- **Subdomain**: https://acme.buzeye.com
- **Frontend Port**: 5180
- **Backend Port**: 5010
- **Database Port**: 5433
- **DB Name**: crm_acme
- **DB User**: crm_acme

## Nginx Management
```bash
# Test configuration
sudo nginx -t

# Reload configuration
sudo systemctl reload nginx

# Check status
sudo systemctl status nginx

# View tenant config
sudo cat /etc/nginx/sites-available/<slug>.buzeye.com.conf
```

## Deployment Workflow (ALWAYS FOLLOW)
1. Make changes locally in development environment
2. Test thoroughly
3. Commit to git with descriptive message
4. Push to origin main
5. SSH to production server
6. `cd /home/ubuntu/CRM`
7. `git pull origin main`
8. Rebuild affected services
9. Verify with logs and endpoint checks

## Permission Issues
If you get "permission denied" on docker-compose:
- Use `sudo` for docker commands
- Docker files owned by root in production
- Regular `docker ps` needs `sudo docker ps`
