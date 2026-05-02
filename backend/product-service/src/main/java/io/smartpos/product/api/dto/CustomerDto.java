package io.smartpos.product.api.dto;

import io.smartpos.product.domain.model.Customer;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;
import java.util.UUID;

public record CustomerDto(
        UUID id, String code, String name, String email, String phone,
        String taxNumber, String address, String city, String country,
        BigDecimal creditLimit, String notes, boolean active
) {
    public static CustomerDto from(Customer c) {
        return new CustomerDto(c.getId(), c.getCode(), c.getName(), c.getEmail(), c.getPhone(),
                c.getTaxNumber(), c.getAddress(), c.getCity(), c.getCountry(),
                c.getCreditLimit(), c.getNotes(), c.isActive());
    }
    public record CreateRequest(
            String code,
            @NotBlank String name,
            @Email String email,
            String phone,
            String taxNumber,
            String address,
            String city,
            String country,
            BigDecimal creditLimit,
            String notes
    ) {}
}
