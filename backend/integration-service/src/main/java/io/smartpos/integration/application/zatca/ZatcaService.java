package io.smartpos.integration.application.zatca;

import io.smartpos.common.context.TenantContext;
import io.smartpos.integration.application.IntegrationProperties;
import io.smartpos.integration.domain.model.IntegrationSync;
import io.smartpos.integration.domain.repository.IntegrationSyncRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;

/**
 * KSA / ZATCA e-invoicing — Phase 1 (B2C simplified) implementation.
 *
 * Produces the QR-code payload as required by ZATCA Phase 1: a base64-encoded
 * TLV (tag-length-value) blob with these tags:
 *   1: seller name, 2: VAT number, 3: timestamp (ISO 8601),
 *   4: invoice total (with VAT), 5: VAT total.
 *
 * Phase 2 (CSID, hash chain, signed XML, clearance) would add a UBL invoice
 * builder + ZATCA portal calls — out of scope for the initial implementation,
 * but the persistence + sync log are reusable.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ZatcaService {

    private final IntegrationProperties props;
    private final IntegrationSyncRepository syncRepo;

    /** Build the ZATCA Phase-1 QR string for a sale. */
    public String buildQrCode(String invoiceTimestampIso, String invoiceTotal, String vatTotal) {
        if (!props.zatca().enabled()) {
            throw new IllegalStateException("ZATCA integration disabled");
        }
        byte[] tlv = tlv(
                tlvField(1, props.zatca().sellerName()),
                tlvField(2, props.zatca().vatNumber()),
                tlvField(3, invoiceTimestampIso),
                tlvField(4, invoiceTotal),
                tlvField(5, vatTotal));
        return Base64.getEncoder().encodeToString(tlv);
    }

    /** Log the QR generation for an invoice — used as audit trail / reconciliation. */
    @Transactional
    public IntegrationSync recordInvoice(UUID saleId, Map<String, Object> payload, String qr) {
        return syncRepo.save(IntegrationSync.builder()
                .provider("ZATCA").direction("OUT")
                .entityType("Sale").entityId(saleId)
                .status("OK").attempts(1)
                .requestBody(payload.toString())
                .responseBody(qr)
                .tenantId(TenantContext.require())
                .completedAt(Instant.now())
                .build());
    }

    // ---------- TLV helpers ----------
    private static byte[] tlvField(int tag, String value) {
        byte[] bytes = (value == null ? "" : value).getBytes(StandardCharsets.UTF_8);
        byte[] out = new byte[2 + bytes.length];
        out[0] = (byte) tag;
        out[1] = (byte) bytes.length;
        System.arraycopy(bytes, 0, out, 2, bytes.length);
        return out;
    }

    private static byte[] tlv(byte[]... fields) {
        int len = 0;
        for (byte[] f : fields) len += f.length;
        byte[] out = new byte[len];
        int p = 0;
        for (byte[] f : fields) {
            System.arraycopy(f, 0, out, p, f.length);
            p += f.length;
        }
        return out;
    }
}
