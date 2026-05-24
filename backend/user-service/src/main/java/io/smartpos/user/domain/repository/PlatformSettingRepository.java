package io.smartpos.user.domain.repository;

import io.smartpos.user.domain.model.PlatformSetting;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PlatformSettingRepository extends JpaRepository<PlatformSetting, String> {
    List<PlatformSetting> findByCategoryOrderByKeyAsc(String category);
    default List<PlatformSetting> findAllGroupedByService() {
        return findAll(Sort.by(Sort.Order.asc("serviceKey"), Sort.Order.asc("sortOrder")));
    }
}
