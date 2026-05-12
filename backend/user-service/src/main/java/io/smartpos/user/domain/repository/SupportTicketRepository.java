package io.smartpos.user.domain.repository;

import io.smartpos.user.domain.model.SupportTicket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SupportTicketRepository extends JpaRepository<SupportTicket, UUID> {

    List<SupportTicket> findByTenantIdOrderByCreatedAtDesc(UUID tenantId);
}
