package io.smartpos.payment.domain.model;

public enum ReferenceType {
    SALE,
    PURCHASE,
    SALE_RETURN,
    PURCHASE_RETURN,
    EXPENSE,
    DEPOSIT,
    TRANSFER;

    /**
     * Does money flow INTO the company's cash account for this reference type?
     *   SALE / PURCHASE_RETURN / DEPOSIT  → yes (debit the account)
     *   PURCHASE / SALE_RETURN / EXPENSE  → no  (credit the account)
     *   TRANSFER                          → depends on leg (handled by caller)
     */
    public boolean incomingForAccount() {
        return switch (this) {
            case SALE, PURCHASE_RETURN, DEPOSIT -> true;
            case PURCHASE, SALE_RETURN, EXPENSE -> false;
            case TRANSFER                       -> throw new IllegalStateException("TRANSFER is two-legged");
        };
    }
}
