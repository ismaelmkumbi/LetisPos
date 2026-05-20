-- Variants uses the existing products list variant mode.
UPDATE menu_definitions
SET route = '/smartpos/products?variant=true'
WHERE key = 'menu-variants';
