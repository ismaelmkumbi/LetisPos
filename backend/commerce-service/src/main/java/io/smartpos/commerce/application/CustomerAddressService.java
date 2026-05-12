package io.smartpos.commerce.application;

import io.smartpos.commerce.domain.model.CustomerAddress;
import io.smartpos.commerce.domain.repository.CustomerAddressRepository;
import io.smartpos.common.context.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class CustomerAddressService {

    private final CustomerAddressRepository addressRepository;

    @Transactional(readOnly = true)
    public List<CustomerAddress> getAddresses(UUID customerId) {
        return addressRepository.findByCustomerIdOrderByIsDefaultDesc(customerId);
    }

    @Transactional
    public CustomerAddress addAddress(UUID tenantId, UUID storeId, UUID customerId,
                                       String label, String firstName, String lastName,
                                       String line1, String line2, String city, String state,
                                       String country, String postalCode, String phone,
                                       boolean isDefault) {
        if (isDefault) {
            clearDefaultForCustomer(customerId);
        }
        CustomerAddress address = CustomerAddress.builder()
            .tenantId(tenantId)
            .storeId(storeId)
            .customerId(customerId)
            .label(label != null ? label : "Home")
            .firstName(firstName)
            .lastName(lastName)
            .line1(line1)
            .line2(line2)
            .city(city)
            .state(state)
            .country(country)
            .postalCode(postalCode)
            .phone(phone)
            .isDefault(isDefault)
            .build();
        return addressRepository.save(address);
    }

    @Transactional
    public CustomerAddress updateAddress(UUID addressId, UUID customerId,
                                          String label, String firstName, String lastName,
                                          String line1, String line2, String city, String state,
                                          String country, String postalCode, String phone,
                                          Boolean isDefault) {
        CustomerAddress address = addressRepository.findById(addressId)
            .orElseThrow(() -> new IllegalArgumentException("Address not found"));
        if (!address.getCustomerId().equals(customerId)) {
            throw new IllegalArgumentException("Address does not belong to this customer");
        }
        if (isDefault != null && isDefault) {
            clearDefaultForCustomer(customerId);
        }
        if (label != null) address.setLabel(label);
        if (firstName != null) address.setFirstName(firstName);
        if (lastName != null) address.setLastName(lastName);
        if (line1 != null) address.setLine1(line1);
        if (line2 != null) address.setLine2(line2);
        if (city != null) address.setCity(city);
        if (state != null) address.setState(state);
        if (country != null) address.setCountry(country);
        if (postalCode != null) address.setPostalCode(postalCode);
        if (phone != null) address.setPhone(phone);
        if (isDefault != null) address.setDefault(isDefault);
        return addressRepository.save(address);
    }

    @Transactional
    public void deleteAddress(UUID addressId, UUID customerId) {
        CustomerAddress address = addressRepository.findById(addressId)
            .orElseThrow(() -> new IllegalArgumentException("Address not found"));
        if (!address.getCustomerId().equals(customerId)) {
            throw new IllegalArgumentException("Address does not belong to this customer");
        }
        address.softDelete();
        addressRepository.save(address);
    }

    private void clearDefaultForCustomer(UUID customerId) {
        List<CustomerAddress> addresses = addressRepository.findByCustomerIdOrderByIsDefaultDesc(customerId);
        for (CustomerAddress addr : addresses) {
            if (addr.isDefault()) {
                addr.setDefault(false);
                addressRepository.save(addr);
            }
        }
    }
}
