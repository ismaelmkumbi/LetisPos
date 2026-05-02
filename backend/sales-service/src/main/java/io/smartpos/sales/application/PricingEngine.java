package io.smartpos.sales.application;

import io.smartpos.sales.domain.model.DiscountType;
import io.smartpos.sales.domain.model.TaxMethod;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Stateless tax/discount math.
 *
 * Line-level math (per line):
 *   gross           = unit_price * qty
 *   discount_amount = FIXED → discount,   PERCENT → gross * discount / 100
 *   net             = gross - discount_amount                (tax-exclusive base)
 *   EXCLUSIVE tax:  subtotal = net
 *                   tax      = net * tax_rate / 100
 *                   total    = net + tax
 *   INCLUSIVE tax:  total    = net           (already includes tax)
 *                   subtotal = net / (1 + tax_rate/100)
 *                   tax      = total - subtotal
 *
 * Header-level math:
 *   sum_subtotal = Σ line_subtotal
 *   sum_tax      = Σ line_tax
 *   doc_discount — applied AFTER line totals; reduces grand_total only.
 *                  For reporting, store as discount_total at header; lines
 *                  are unchanged. Tax is NOT recomputed because it already
 *                  reflects the net values.
 *   grand_total  = sum_subtotal + sum_tax - doc_discount + shipping
 *
 * All BigDecimal math uses HALF_UP rounding at 4 dp (matches DB NUMERIC(19,4)).
 */
@Component
public class PricingEngine {

    private static final int  MONEY_SCALE = 4;
    private static final RoundingMode RM = RoundingMode.HALF_UP;
    private static final BigDecimal ONE_HUNDRED = new BigDecimal("100");

    public record LineCalc(
            BigDecimal subtotal,   // tax-exclusive base AFTER discount
            BigDecimal tax,
            BigDecimal total       // subtotal + tax (what the customer pays for this line)
    ) {}

    public LineCalc calcLine(BigDecimal unitPrice, BigDecimal qty,
                             BigDecimal discount, DiscountType discountType,
                             BigDecimal taxRate, TaxMethod taxMethod) {
        BigDecimal gross = nz(unitPrice).multiply(nz(qty)).setScale(MONEY_SCALE, RM);
        BigDecimal discountAmount;
        if (discountType == DiscountType.PERCENT) {
            discountAmount = gross.multiply(nz(discount))
                                  .divide(ONE_HUNDRED, MONEY_SCALE, RM);
        } else {
            discountAmount = nz(discount).setScale(MONEY_SCALE, RM);
        }
        // Don't let discount flip the sign
        if (discountAmount.compareTo(gross) > 0) discountAmount = gross;

        BigDecimal netAfterDiscount = gross.subtract(discountAmount);
        BigDecimal rate = nz(taxRate);

        if (taxMethod == TaxMethod.INCLUSIVE) {
            // netAfterDiscount is the gross (tax-inclusive) price the customer pays
            BigDecimal subtotal = netAfterDiscount
                    .multiply(ONE_HUNDRED)
                    .divide(ONE_HUNDRED.add(rate), MONEY_SCALE, RM);
            BigDecimal tax = netAfterDiscount.subtract(subtotal).setScale(MONEY_SCALE, RM);
            return new LineCalc(subtotal, tax, netAfterDiscount);
        } else {
            BigDecimal tax = netAfterDiscount
                    .multiply(rate)
                    .divide(ONE_HUNDRED, MONEY_SCALE, RM);
            BigDecimal total = netAfterDiscount.add(tax);
            return new LineCalc(netAfterDiscount, tax, total);
        }
    }

    public record DocCalc(
            BigDecimal subtotal,        // sum of line subtotals
            BigDecimal taxTotal,        // sum of line taxes
            BigDecimal discountTotal,   // header discount (not line discounts)
            BigDecimal shipping,
            BigDecimal grandTotal
    ) {}

    public DocCalc calcDocument(BigDecimal sumSubtotal, BigDecimal sumTax,
                                BigDecimal headerDiscount, BigDecimal shipping) {
        BigDecimal sub  = nz(sumSubtotal).setScale(MONEY_SCALE, RM);
        BigDecimal tax  = nz(sumTax).setScale(MONEY_SCALE, RM);
        BigDecimal disc = nz(headerDiscount).setScale(MONEY_SCALE, RM);
        BigDecimal ship = nz(shipping).setScale(MONEY_SCALE, RM);
        BigDecimal grand = sub.add(tax).subtract(disc).add(ship);
        if (grand.signum() < 0) grand = BigDecimal.ZERO;
        return new DocCalc(sub, tax, disc, ship, grand.setScale(MONEY_SCALE, RM));
    }

    private static BigDecimal nz(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }
}
