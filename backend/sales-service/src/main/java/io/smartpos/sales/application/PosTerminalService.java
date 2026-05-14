package io.smartpos.sales.application;

import io.smartpos.sales.api.dto.PosTerminalDto;
import io.smartpos.sales.domain.model.PosTerminal;
import io.smartpos.sales.domain.repository.PosTerminalRepository;
import io.smartpos.common.context.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PosTerminalService {

    private final PosTerminalRepository repo;

    @Transactional(readOnly = true)
    public List<PosTerminalDto> list(UUID warehouseId) {
        return (warehouseId == null ? repo.findAll() : repo.findByWarehouseId(warehouseId, TenantContext.get().orElse(null)))
                .stream().map(PosTerminalDto::from).toList();
    }

    @Transactional(readOnly = true)
    public PosTerminalDto get(UUID id) {
        return repo.findById(id).map(PosTerminalDto::from)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Terminal not found"));
    }

    @Transactional
    public PosTerminalDto create(PosTerminalDto.CreateRequest req) {
        if (repo.existsByCodeIgnoreCase(req.code())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Terminal code already exists");
        }
        return PosTerminalDto.from(repo.save(PosTerminal.builder()
                .name(req.name()).code(req.code()).warehouseId(req.warehouseId())
                .notes(req.notes())
                .tenantId(TenantContext.require())
                .build()));
    }

    /** Used by the customer display to find its paired terminal. */
    @Transactional
    public PosTerminalDto pair(String token) {
        PosTerminal t = repo.findByPairingToken(token)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invalid pairing token"));
        t.setLastSeenAt(Instant.now());
        return PosTerminalDto.from(repo.save(t));
    }

    /** Rotate the pairing token (e.g. on staff change). */
    @Transactional
    public PosTerminalDto rotateToken(UUID id) {
        PosTerminal t = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Terminal not found"));
        t.setPairingToken(PosTerminal.newPairingToken());
        return PosTerminalDto.from(repo.save(t));
    }
}
