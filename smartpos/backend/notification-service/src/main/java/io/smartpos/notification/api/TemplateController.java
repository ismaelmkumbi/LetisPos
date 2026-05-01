package io.smartpos.notification.api;

import io.smartpos.notification.api.dto.TemplateDto;
import io.smartpos.notification.application.TemplateService;
import io.smartpos.notification.domain.model.Channel;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/notification-templates")
@RequiredArgsConstructor
public class TemplateController {

    private final TemplateService service;

    @GetMapping
    @PreAuthorize("hasAuthority('notification.view')")
    public List<TemplateDto> list(@RequestParam(required = false) String code,
                                  @RequestParam(required = false) Channel channel) {
        return service.list(code, channel);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('notification.view')")
    public TemplateDto get(@PathVariable UUID id) { return service.get(id); }

    @PostMapping
    @PreAuthorize("hasAuthority('notification.template.write')")
    public ResponseEntity<TemplateDto> create(@Valid @RequestBody TemplateDto.CreateRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(req));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('notification.template.write')")
    public TemplateDto update(@PathVariable UUID id, @RequestBody TemplateDto.UpdateRequest req) {
        return service.update(id, req);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('notification.template.write')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) { service.delete(id); }
}
