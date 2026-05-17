package io.smartpos.report.domain.repository;

import io.smartpos.report.domain.model.DataFreshness;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface DataFreshnessRepository extends JpaRepository<DataFreshness, String> {
    List<DataFreshness> findAllByOrderBySourceAsc();
}
