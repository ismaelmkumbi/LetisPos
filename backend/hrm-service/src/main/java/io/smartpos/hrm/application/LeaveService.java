package io.smartpos.hrm.application;

import io.smartpos.common.context.TenantContext;
import io.smartpos.hrm.api.dto.LeaveRequestDto;
import io.smartpos.hrm.domain.model.LeaveRequest;
import io.smartpos.hrm.domain.model.LeaveStatus;
import io.smartpos.hrm.domain.repository.LeaveRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class LeaveService {

    private final LeaveRequestRepository repo;

    @Transactional(readOnly = true)
    public Page<LeaveRequestDto> listForEmployee(UUID employeeId, Pageable pageable) {
        return repo.findByEmployeeIdOrderByCreatedAtDesc(employeeId, TenantContext.require(), pageable).map(LeaveRequestDto::from);
    }

    @Transactional
    public LeaveRequestDto create(LeaveRequestDto.CreateRequest req) {
        if (req.endDate().isBefore(req.startDate())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "endDate before startDate");
        }
        long days = ChronoUnit.DAYS.between(req.startDate(), req.endDate()) + 1;
        LeaveRequest r = LeaveRequest.builder()
                .employeeId(req.employeeId())
                .leaveTypeId(req.leaveTypeId())
                .startDate(req.startDate()).endDate(req.endDate())
                .days(BigDecimal.valueOf(days))
                .reason(req.reason())
                .status(LeaveStatus.PENDING)
                .tenantId(TenantContext.require())
                .build();
        return LeaveRequestDto.from(repo.save(r));
    }

    @Transactional
    public LeaveRequestDto decide(UUID id, LeaveRequestDto.DecisionRequest decision, UUID approverId) {
        LeaveRequest r = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Leave request not found"));
        if (r.getStatus() != LeaveStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Already decided");
        }
        if (decision.status() != LeaveStatus.APPROVED && decision.status() != LeaveStatus.REJECTED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "decision must be APPROVED or REJECTED");
        }
        r.setStatus(decision.status());
        r.setDecidedAt(Instant.now());
        r.setDecidedBy(approverId);
        r.setDecisionNote(decision.note());
        return LeaveRequestDto.from(repo.save(r));
    }

    @Transactional
    public LeaveRequestDto cancel(UUID id) {
        LeaveRequest r = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Leave request not found"));
        if (r.getStatus() == LeaveStatus.CANCELLED) return LeaveRequestDto.from(r);
        r.setStatus(LeaveStatus.CANCELLED);
        return LeaveRequestDto.from(repo.save(r));
    }
}
