package io.smartpos.payment.api.dto;

import io.smartpos.payment.domain.model.AccountClass;
import io.smartpos.payment.domain.model.ChartOfAccount;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record ChartOfAccountDto(
        UUID id,
        UUID parentId,
        String code,
        String name,
        AccountClass accountClass,
        String normalBalance,
        boolean postable,
        boolean active,
        String description
) {
    public static ChartOfAccountDto from(ChartOfAccount c) {
        return new ChartOfAccountDto(c.getId(), c.getParentId(), c.getCode(), c.getName(),
                c.getAccountClass(), c.getNormalBalance(), c.isPostable(), c.isActive(),
                c.getDescription());
    }

    public record CreateRequest(
            UUID parentId,
            @NotBlank @Size(max = 32)  String code,
            @NotBlank @Size(max = 150) String name,
            @NotNull AccountClass accountClass,
            String normalBalance,
            Boolean postable,
            Boolean active,
            String description
    ) {}

    public record UpdateRequest(
            String name,
            UUID parentId,
            String normalBalance,
            Boolean postable,
            Boolean active,
            String description
    ) {}
}
