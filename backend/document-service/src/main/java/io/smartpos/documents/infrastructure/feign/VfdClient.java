package io.smartpos.documents.infrastructure.feign;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@FeignClient(name = "tra-vfd", url = "${smartpos.tra.vfd-url}")
public interface VfdClient {
    @PostMapping("/register")
    Map<String, Object> registerInvoice(@RequestBody Map<String, Object> request);

    @GetMapping("/status/{fiscalCode}")
    Map<String, Object> checkStatus(@PathVariable String fiscalCode);
}
