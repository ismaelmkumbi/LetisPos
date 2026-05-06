package io.smartpos.hrm.domain.repository;

import io.smartpos.hrm.domain.model.Holiday;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface HolidayRepository extends JpaRepository<Holiday, UUID> {
    @Query("""
           SELECT h FROM Holiday h
           WHERE h.holidayDate BETWEEN :from AND :to
             AND h.tenantId = :tenantId
           """)
    List<Holiday> findByHolidayDateBetween(@Param("from") LocalDate from,
                                           @Param("to") LocalDate to,
                                           @Param("tenantId") UUID tenantId);
}
