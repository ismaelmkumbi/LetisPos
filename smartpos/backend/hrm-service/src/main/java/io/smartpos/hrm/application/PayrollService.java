package io.smartpos.hrm.application;

import io.smartpos.hrm.api.dto.PayrollDto;
import io.smartpos.hrm.domain.model.Employee;
import io.smartpos.hrm.domain.model.PayrollLine;
import io.smartpos.hrm.domain.model.PayrollRun;
import io.smartpos.hrm.domain.model.PayrollStatus;
import io.smartpos.hrm.domain.repository.EmployeeRepository;
import io.smartpos.hrm.domain.repository.PayrollRunRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Payroll lifecycle:
 *   create  → DRAFT (lines pre-filled with employees' base salary if omitted)
 *   approve → APPROVED (locks the figures)
 *   pay     → PAID (records paid_at; downstream Accounting can post the JE)
 */
@Service
@RequiredArgsConstructor
public class PayrollService {

    private final PayrollRunRepository repo;
    private final EmployeeRepository employeeRepo;

    @Transactional(readOnly = true)
    public PayrollDto get(UUID id) {
        return repo.findById(id).map(PayrollDto::from)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payroll not found"));
    }

    @Transactional(readOnly = true)
    public List<PayrollDto> list() {
        return repo.findAll().stream().map(PayrollDto::from).toList();
    }

    @Transactional
    public PayrollDto create(PayrollDto.CreateRequest req) {
        if (repo.existsByRefIgnoreCase(req.ref())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Payroll ref exists");
        }
        if (req.periodEnd().isBefore(req.periodStart())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "periodEnd before periodStart");
        }
        PayrollRun r = PayrollRun.builder()
                .ref(req.ref())
                .periodStart(req.periodStart()).periodEnd(req.periodEnd())
                .notes(req.notes())
                .status(PayrollStatus.DRAFT)
                .build();

        if (req.lines() != null) {
            for (PayrollDto.LineInput in : req.lines()) {
                Employee emp = employeeRepo.findById(in.employeeId())
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                                "Unknown employee: " + in.employeeId()));
                PayrollLine line = PayrollLine.builder()
                        .employeeId(emp.getId())
                        .baseSalary(Optional.ofNullable(in.baseSalary()).orElse(emp.getBaseSalary()))
                        .allowances(Optional.ofNullable(in.allowances()).orElse(BigDecimal.ZERO))
                        .deductions(Optional.ofNullable(in.deductions()).orElse(BigDecimal.ZERO))
                        .overtime(Optional.ofNullable(in.overtime()).orElse(BigDecimal.ZERO))
                        .tax(Optional.ofNullable(in.tax()).orElse(BigDecimal.ZERO))
                        .build();
                line.recalcNet();
                r.getLines().add(line);
            }
        }
        r.recalcTotals();
        return PayrollDto.from(repo.save(r));
    }

    @Transactional
    public PayrollDto approve(UUID id) {
        PayrollRun r = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payroll not found"));
        if (r.getStatus() != PayrollStatus.DRAFT) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only DRAFT can be approved");
        }
        r.setStatus(PayrollStatus.APPROVED);
        r.setApprovedAt(Instant.now());
        return PayrollDto.from(repo.save(r));
    }

    @Transactional
    public PayrollDto pay(UUID id) {
        PayrollRun r = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payroll not found"));
        if (r.getStatus() != PayrollStatus.APPROVED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only APPROVED can be paid");
        }
        Instant now = Instant.now();
        r.setStatus(PayrollStatus.PAID);
        r.setPaidAt(now);
        r.getLines().forEach(l -> l.setPaidAt(now));
        return PayrollDto.from(repo.save(r));
    }
}
