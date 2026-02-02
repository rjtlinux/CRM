# Quick Production Deployment

## 🚀 Super Fast Deploy (Copy-Paste)

SSH into your server and run these commands:

```bash
cd ~/CRM && \
git pull origin main && \
docker-compose exec -T database psql -U crm_user -d crm_database < database/add_customer_sector.sql 2>/dev/null || true && \
docker-compose exec -T database psql -U crm_user -d crm_database < database/add_customer_fields_v2.sql 2>/dev/null || true && \
docker-compose exec -T database psql -U crm_user -d crm_database < database/add_opportunity_workflow.sql 2>/dev/null || true && \
docker-compose restart backend frontend && \
sleep 15 && \
echo "✅ Deployment complete! Access: http://43.204.98.56:5173"
```

**Or use the automated script:**

```bash
cd ~/CRM
./deploy.sh
```

---

## 📝 Step-by-Step (5 Minutes)

### 1. Connect to Server
```bash
ssh -i your-key.pem ubuntu@43.204.98.56
```

### 2. Navigate & Update
```bash
cd ~/CRM
git pull origin main
```

### 3. Apply Migrations
```bash
docker-compose exec -T database psql -U crm_user -d crm_database < database/add_customer_sector.sql
docker-compose exec -T database psql -U crm_user -d crm_database < database/add_customer_fields_v2.sql
docker-compose exec -T database psql -U crm_user -d crm_database < database/add_opportunity_workflow.sql
```

### 4. Restart Services
```bash
docker-compose restart backend
docker-compose restart frontend
```

### 5. Verify
```bash
curl http://localhost:5000/health
docker-compose ps
```

### 6. Access
Open: **http://43.204.98.56:5173**

---

## ⚡ Common Commands

### View Logs
```bash
docker-compose logs -f backend     # Backend logs
docker-compose logs -f frontend    # Frontend logs
docker-compose logs --tail=50      # Last 50 lines
```

### Restart Single Service
```bash
docker-compose restart backend
docker-compose restart frontend
docker-compose restart database
```

### Check Status
```bash
docker-compose ps                  # All services
curl http://localhost:5000/health  # Backend health
```

### Database Access
```bash
docker-compose exec database psql -U crm_user -d crm_database
# Then run SQL commands
# Exit with: \q
```

### Backup Database
```bash
docker-compose exec database pg_dump -U crm_user crm_database > backup_$(date +%Y%m%d).sql
```

---

## 🔧 Troubleshooting

### Backend Not Responding
```bash
docker-compose logs backend --tail=100
docker-compose restart backend
```

### Frontend Not Loading
```bash
docker-compose logs frontend --tail=50
docker-compose restart frontend
```

### Migration Error "relation already exists"
```bash
# This is OK! It means migration was already applied.
# Just continue with next steps.
```

### Clear Everything and Restart
```bash
docker-compose down
docker-compose up -d
# Wait 30 seconds
docker-compose ps
```

---

## 📊 Health Check

```bash
# All at once
echo "=== Docker Status ===" && \
docker-compose ps && \
echo "" && \
echo "=== Backend Health ===" && \
curl -s http://localhost:5000/health && \
echo "" && \
echo "=== Frontend Status ===" && \
curl -s -o /dev/null -w "%{http_code}" http://localhost:5173 && \
echo ""
```

---

## 🎯 After Deployment Checklist

Visit: http://43.204.98.56:5173

- [ ] Login works
- [ ] Dashboard loads
- [ ] Customers page shows new fields
- [ ] Can create customer with all fields
- [ ] Opportunities page loads
- [ ] Click opportunity opens ticket view
- [ ] Activity timeline works
- [ ] Comments work
- [ ] Quick actions work
- [ ] No console errors

---

## 🆘 Emergency Rollback

If something goes wrong:

```bash
# Restore database from backup
docker-compose exec -T database psql -U crm_user -d crm_database < backup_YYYYMMDD.sql

# Or revert code
git log --oneline  # Find previous commit
git reset --hard COMMIT_HASH
docker-compose restart backend frontend
```

---

## 📞 Need Help?

1. Check logs: `docker-compose logs -f`
2. Verify services: `docker-compose ps`
3. Test backend: `curl http://localhost:5000/health`
4. Check database: `docker-compose exec database psql -U crm_user -d crm_database -c "SELECT 1"`

---

**Version:** Quick Reference v1.0  
**Server:** 43.204.98.56  
**Ports:** Frontend (5173), Backend (5000)
