package io.smartpos.product.api.dto;

import io.smartpos.product.domain.model.PriceList;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record PriceListDto(
        UUID id,
        String name,
        String description,
        String customerGroup,
        String currency,
        boolean active,
        LocalDate startDate,
        LocalDate endDate,
        List<PriceListLineDto> lines
) {
    public static PriceListDto from(PriceList pl, List<PriceListLineDto> lines) {
        return new PriceListDto(
                pl.getId(), pl.getName(), pl.getDescription(),
                pl.getCustomerGroup(), pl.getCurrency(), pl.isActive(),
                pl.getStartDate(), pl.getEndDate(), lines);
    }

    public static PriceListDto headerOnly(PriceList pl) {
        return new PriceListDto(
                pl.getId(), pl.getName(), pl.getDescription(),
                pl.getCustomerGroup(), pl.getCurrency(), pl.isActive(),
                pl.getStartDate(), pl.getEndDate(), null);
    }
}
