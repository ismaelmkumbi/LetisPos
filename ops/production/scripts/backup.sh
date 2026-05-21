#!/bin/sh
# LetisPOS — Automated backup (runs daily at 2am on Server B)
# ============================================================
# 1. pg_dump all databases from Server C
# 2. Sync to MinIO on Server A
# 3. Keep last 7 daily, 4 weekly, 3 monthly backups

set -e

DATE=$(date +%Y-%m-%d)
DAY_OF_WEEK=$(date +%u)  # 1=Mon
DAY_OF_MONTH=$(date +%d)
BACKUP_DIR="/backups"
DB_HOST="${DB_HOST:-62.169.28.46}"
DB_USER="smartpos"
RETENTION_DAYS=7

DATABASES="auth_db user_db product_db inventory_db sales_db payment_db report_db notification_db hrm_db ai_db integration_db document_db commerce_db audit_db billing_db crm_db control_hub_db"

echo "==> Backup started: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"

mkdir -p "$BACKUP_DIR/daily"

# Step 1: Dump all databases
for db in $DATABASES; do
    echo "    Dumping $db..."
    PGPASSWORD="${DB_ROOT_PASSWORD}" pg_dump \
        -h "$DB_HOST" \
        -U "$DB_USER" \
        -d "$db" \
        --no-owner \
        --no-acl \
        -Fc \
        -f "$BACKUP_DIR/daily/${DATE}-${db}.dump" 2>/dev/null || echo "    WARNING: $db dump failed (may not exist yet)"
done

# Step 2: Compress into single archive
cd "$BACKUP_DIR/daily"
ARCHIVE="${DATE}-letispos-backup.tar.gz"
tar -czf "${ARCHIVE}" ${DATE}-*.dump 2>/dev/null || true
rm -f ${DATE}-*.dump

ARCHIVE_SIZE=$(du -h "${ARCHIVE}" | cut -f1)
echo "    Archive: ${ARCHIVE} (${ARCHIVE_SIZE})"

# Step 3: Upload to MinIO
if command -v aws >/dev/null 2>&1; then
    aws --endpoint-url "${S3_ENDPOINT:-http://109.199.122.118:9000}" \
        s3 cp "${ARCHIVE}" "s3://backups/daily/${ARCHIVE}" \
        --quiet 2>/dev/null || echo "    WARNING: S3 upload failed"
fi

# Step 4: Weekly retention (keep Mondays)
if [ "$DAY_OF_WEEK" = "1" ]; then
    mkdir -p "$BACKUP_DIR/weekly"
    cp "${ARCHIVE}" "$BACKUP_DIR/weekly/${ARCHIVE}"
    echo "    Saved weekly copy"
fi

# Step 5: Monthly retention (keep 1st of month)
if [ "$DAY_OF_MONTH" = "01" ]; then
    mkdir -p "$BACKUP_DIR/monthly"
    cp "${ARCHIVE}" "$BACKUP_DIR/monthly/${ARCHIVE}"
    echo "    Saved monthly copy"
fi

# Step 6: Cleanup old daily backups
find "$BACKUP_DIR/daily" -name "*.tar.gz" -mtime +${RETENTION_DAYS} -delete 2>/dev/null || true
find "$BACKUP_DIR/weekly" -name "*.tar.gz" -mtime +35 -delete 2>/dev/null || true
find "$BACKUP_DIR/monthly" -name "*.tar.gz" -mtime +120 -delete 2>/dev/null || true

echo "==> Backup complete: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
