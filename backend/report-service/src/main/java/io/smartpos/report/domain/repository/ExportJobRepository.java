package io.smartpos.report.domain.repository;

import io.smartpos.report.domain.model.ExportJob;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ExportJobRepository extends JpaRepository<ExportJob, UUID> {

    /** Pulls a small batch of pending jobs in FIFO order. Workers race on this set. */
    List<ExportJob> findFirst10ByStatusOrderByCreatedAtAsc(ExportJob.Status status);
}
