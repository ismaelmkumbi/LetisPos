---
title: Handling Expiring Stock
category: inventory
tags: [expiry, waste, discount, FEFO]
---

# Handling Expiring Stock

## Finding Expiring Products
1. Go to Inventory > Expiry Tracking
2. The dashboard shows products expiring within 30, 60, and 90 days
3. Click any product to see batch details and exact expiry dates
4. Sort by days remaining to prioritize

## Recommended Actions
- **14-30 days out:** Apply a discount (10-20%) to move stock faster
- **7-14 days out:** Aggressive discount (30-50%) or bundle with popular items
- **0-7 days out:** Remove from shelves, record as waste if expired

## Setting Up Expiry Alerts
1. Go to Inventory > Settings
2. Set alert thresholds (default: warn at 30 days, critical at 14 days)
3. Enable email/SMS notifications for managers

## Notes
- LetisPOS follows FEFO (First Expired, First Out) automatically
- Expiry alerts appear on the dashboard and in the assistant briefing
- Recording waste requires the `inventory.write` permission
