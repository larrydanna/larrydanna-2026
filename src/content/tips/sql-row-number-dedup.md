---
title: "Remove duplicates with ROW_NUMBER()"
date: "2026-03-31"
tags: ["SQL", "Duplicates", "CTE"]
language: "sql"
draft: false
---

When you need to deduplicate a table while keeping one row per group, `ROW_NUMBER()` inside a CTE is the cleanest approach.

```sql
WITH Ranked AS (
    SELECT
        *,
        ROW_NUMBER() OVER (
            PARTITION BY CustomerId
            ORDER BY CreatedDate DESC
        ) AS rn
    FROM Orders
)
DELETE FROM Ranked WHERE rn > 1;
```

`PARTITION BY` defines what makes a "duplicate" — here, same `CustomerId`. `ORDER BY` controls which row survives — here, the most recent by `CreatedDate`. Rows where `rn > 1` are the extras.

Works in SQL Server. For a dry run, replace `DELETE` with `SELECT *` to see what would be removed before committing.
