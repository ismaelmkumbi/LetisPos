-- LetisPOS — Database initialization
-- Each microservice gets its own database for isolation.
-- Run once on first deploy via docker-entrypoint-initdb.d

CREATE DATABASE auth_db        OWNER smartpos;
CREATE DATABASE user_db        OWNER smartpos;
CREATE DATABASE product_db     OWNER smartpos;
CREATE DATABASE inventory_db   OWNER smartpos;
CREATE DATABASE sales_db       OWNER smartpos;
CREATE DATABASE payment_db     OWNER smartpos;
CREATE DATABASE report_db      OWNER smartpos;
CREATE DATABASE notification_db OWNER smartpos;
CREATE DATABASE hrm_db         OWNER smartpos;
CREATE DATABASE ai_db          OWNER smartpos;
CREATE DATABASE integration_db OWNER smartpos;
CREATE DATABASE document_db    OWNER smartpos;
CREATE DATABASE commerce_db    OWNER smartpos;
CREATE DATABASE audit_db       OWNER smartpos;
CREATE DATABASE billing_db     OWNER smartpos;
CREATE DATABASE crm_db         OWNER smartpos;
CREATE DATABASE control_hub_db OWNER smartpos;

-- Replication user for standby on Server B
CREATE ROLE replicator WITH REPLICATION LOGIN PASSWORD '${PG_REPLICATION_PASSWORD}';

-- Grant connect to per-service users (created by each service via Flyway)
GRANT CONNECT ON DATABASE auth_db        TO auth_user;
GRANT CONNECT ON DATABASE user_db        TO user_user;
GRANT CONNECT ON DATABASE product_db     TO product_user;
GRANT CONNECT ON DATABASE inventory_db   TO inventory_user;
GRANT CONNECT ON DATABASE sales_db       TO sales_user;
GRANT CONNECT ON DATABASE payment_db     TO payment_user;
GRANT CONNECT ON DATABASE report_db      TO report_user;
GRANT CONNECT ON DATABASE notification_db TO notification_user;
GRANT CONNECT ON DATABASE hrm_db         TO hrm_user;
GRANT CONNECT ON DATABASE ai_db          TO ai_user;
GRANT CONNECT ON DATABASE integration_db TO integration_user;
GRANT CONNECT ON DATABASE document_db    TO document_user;
GRANT CONNECT ON DATABASE commerce_db    TO commerce_user;
GRANT CONNECT ON DATABASE audit_db       TO audit_user;
GRANT CONNECT ON DATABASE billing_db     TO billing_user;
GRANT CONNECT ON DATABASE crm_db         TO crm_user;
GRANT CONNECT ON DATABASE control_hub_db TO control_hub_user;
