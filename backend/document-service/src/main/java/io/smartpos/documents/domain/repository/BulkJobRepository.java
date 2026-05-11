package io.smartpos.documents.domain.repository;

import io.smartpos.documents.domain.model.BulkJob;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface BulkJobRepository extends JpaRepository<BulkJob, UUID> {}
