---
title: "Concatenate rows into a string with STRING_AGG()"
date: "2026-03-31"
tags: ["SQL", "Aggregation", "String"]
language: "sql"
draft: false
---

`STRING_AGG()` collapses multiple rows into a single comma-separated string. No more XML tricks or cursor loops.

```sql
SELECT
    CustomerId,
    STRING_AGG(ProductName, ', ') WITHIN GROUP (ORDER BY ProductName) AS Products
FROM OrderItems
GROUP BY CustomerId;
```

`WITHIN GROUP (ORDER BY ...)` controls the order of items in the output string. Available in SQL Server 2017+.

The old way with `FOR XML PATH('')` still works on older servers, but `STRING_AGG` is cleaner and handles `NULL` values automatically — null items are simply skipped.
