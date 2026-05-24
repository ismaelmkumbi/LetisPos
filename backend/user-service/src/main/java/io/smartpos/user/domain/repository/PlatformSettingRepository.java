package io.smartpos.user.domain.repository;

import io.smartpos.user.domain.model.PlatformSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PlatformSettingRepository extends JpaRepository<PlatformSetting, String> {
    List<PlatformSetting> findByCategoryOrderByKeyAsc(String category);
}
