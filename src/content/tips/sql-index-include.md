---
title: "Cover a query with INCLUDE columns on an index"
date: "2026-03-31"
tags: ["SQL", "Performance", "Indexes"]
language: "sql"
draft: false
---

A covering index satisfies a query entirely from the index without touching the base table. The `INCLUDE` clause adds non-key columns to the index leaf level.

```sql
-- Query you want to cover
SELECT OrderId, CustomerId, TotalAmount
FROM Orders
WHERE CustomerId = @id AND StatusId = 1;

-- Index that covers it
CREATE INDEX IX_Orders_Customer_Status
ON Orders (CustomerId, StatusId)
INCLUDE (TotalAmount);
```

`CustomerId` and `StatusId` are the key columns (used for seeking). `TotalAmount` is included so SQL Server can return it without a key lookup back to the clustered index.

Without `INCLUDE`, SQL Server does a key lookup for every row the index finds — visible as a "Key Lookup" operator in the execution plan, often the bottleneck on high-traffic queries.

Check your execution plan first. If you see Key Lookup with high estimated rows, `INCLUDE` the columns it's fetching.
