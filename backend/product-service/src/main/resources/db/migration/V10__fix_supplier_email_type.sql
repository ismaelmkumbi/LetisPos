-- V10__fix_supplier_email_type.sql
-- CITEXT type causes Hibernate/JDBC to map the column as bytea (JDBC type OTHER),
-- which breaks JPQL queries that use LOWER(s.email). Change to VARCHAR so
-- LOWER() works correctly. Case-insensitive search is already handled by the
-- LOWER() calls in JPQL queries.

ALTER TABLE suppliers ALTER COLUMN email TYPE VARCHAR(255);
