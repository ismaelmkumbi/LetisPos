---
title: Stock Counting and Reconciliation
category: inventory
tags: [stock take, counting, reconciliation, adjustment]
---

# Stock Counting and Reconciliation

## Starting a Stock Count
1. Go to Inventory > Stock Count
2. Click "New Count"
3. Select the warehouse and optionally filter by product category
4. Click "Start Count" — this freezes inventory records for counting
5. Enter the physical count for each product shown
6. Submit the count for review

## Reconciling Differences
1. After submitting, the system shows variances (differences between system and count)
2. Review each variance line:
   - Positive variance = more stock than system thought (possible data entry error)
   - Negative variance = less stock than system thought (possible theft or damage)
3. Add notes explaining each variance
4. Click "Approve" to update inventory levels

## Notes
- Stock counts require the `inventory.count` permission
- Approval requires the `inventory.adjust` permission
- You can pause a count and resume later — progress is saved
- Conduct full stock takes at least monthly for accurate reporting
