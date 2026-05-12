-- Creates one database per microservice + dedicated users.
-- Runs once on first container start (see docker-compose.yml volume mount).

CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- AUTH
CREATE USER auth_user WITH PASSWORD 'auth_pass';
CREATE DATABASE auth_db OWNER auth_user;
\c auth_db
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
GRANT ALL PRIVILEGES ON DATABASE auth_db TO auth_user;
GRANT ALL ON SCHEMA public TO auth_user;

-- USER
\c postgres
CREATE USER user_user WITH PASSWORD 'user_pass';
CREATE DATABASE user_db OWNER user_user;
\c user_db
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
GRANT ALL PRIVILEGES ON DATABASE user_db TO user_user;
GRANT ALL ON SCHEMA public TO user_user;

-- PRODUCT
\c postgres
CREATE USER product_user WITH PASSWORD 'product_pass';
CREATE DATABASE product_db OWNER product_user;
\c product_db
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
GRANT ALL PRIVILEGES ON DATABASE product_db TO product_user;
GRANT ALL ON SCHEMA public TO product_user;

-- INVENTORY
\c postgres
CREATE USER inventory_user WITH PASSWORD 'inventory_pass';
CREATE DATABASE inventory_db OWNER inventory_user;
\c inventory_db
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
GRANT ALL PRIVILEGES ON DATABASE inventory_db TO inventory_user;
GRANT ALL ON SCHEMA public TO inventory_user;

-- SALES
\c postgres
CREATE USER sales_user WITH PASSWORD 'sales_pass';
CREATE DATABASE sales_db OWNER sales_user;
\c sales_db
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
GRANT ALL PRIVILEGES ON DATABASE sales_db TO sales_user;
GRANT ALL ON SCHEMA public TO sales_user;

-- PAYMENT
\c postgres
CREATE USER payment_user WITH PASSWORD 'payment_pass';
CREATE DATABASE payment_db OWNER payment_user;
\c payment_db
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
GRANT ALL PRIVILEGES ON DATABASE payment_db TO payment_user;
GRANT ALL ON SCHEMA public TO payment_user;

-- REPORT
\c postgres
CREATE USER report_user WITH PASSWORD 'report_pass';
CREATE DATABASE report_db OWNER report_user;
\c report_db
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
GRANT ALL PRIVILEGES ON DATABASE report_db TO report_user;
GRANT ALL ON SCHEMA public TO report_user;

-- NOTIFICATION
\c postgres
CREATE USER notification_user WITH PASSWORD 'notification_pass';
CREATE DATABASE notification_db OWNER notification_user;
\c notification_db
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
GRANT ALL PRIVILEGES ON DATABASE notification_db TO notification_user;
GRANT ALL ON SCHEMA public TO notification_user;

-- HRM
\c postgres
CREATE USER hrm_user WITH PASSWORD 'hrm_pass';
CREATE DATABASE hrm_db OWNER hrm_user;
\c hrm_db
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
GRANT ALL PRIVILEGES ON DATABASE hrm_db TO hrm_user;
GRANT ALL ON SCHEMA public TO hrm_user;

-- INTEGRATION
\c postgres
CREATE USER integration_user WITH PASSWORD 'integration_pass';
CREATE DATABASE integration_db OWNER integration_user;
\c integration_db
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
GRANT ALL PRIVILEGES ON DATABASE integration_db TO integration_user;
GRANT ALL ON SCHEMA public TO integration_user;

-- AI
\c postgres
CREATE USER ai_user WITH PASSWORD 'ai_pass';
CREATE DATABASE ai_db OWNER ai_user;
\c ai_db
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
GRANT ALL PRIVILEGES ON DATABASE ai_db TO ai_user;
GRANT ALL ON SCHEMA public TO ai_user;

-- COMMERCE
\c postgres
CREATE USER commerce_user WITH PASSWORD 'commerce_pass';
CREATE DATABASE commerce_db OWNER commerce_user;
\c commerce_db
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
GRANT ALL PRIVILEGES ON DATABASE commerce_db TO commerce_user;
GRANT ALL ON SCHEMA public TO commerce_user;
