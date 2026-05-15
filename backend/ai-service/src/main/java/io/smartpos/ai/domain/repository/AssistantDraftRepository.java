package io.smartpos.ai.domain.repository;

import io.smartpos.ai.domain.model.AssistantDraft;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface AssistantDraftRepository extends JpaRepository<AssistantDraft, UUID> {
}
