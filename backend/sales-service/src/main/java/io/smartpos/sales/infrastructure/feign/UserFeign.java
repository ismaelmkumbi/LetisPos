package io.smartpos.sales.infrastructure.feign;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;
import java.util.UUID;

@FeignClient(name = "user-service")
public interface UserFeign {

    record UserRef(UUID id, String firstName, String lastName, String email) {}

    @GetMapping("/api/v1/users/batch")
    List<UserRef> getUsersByIds(@RequestParam("ids") List<UUID> ids);
}
