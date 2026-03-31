---
title: "Pattern matching switch expressions in C#"
date: "2026-03-31"
tags: ["C#", "Pattern Matching", "Switch"]
language: "csharp"
draft: false
---

Switch expressions (C# 8+) replace verbose switch statements with a concise expression that returns a value.

```csharp
// Old switch statement
string result;
switch (status)
{
    case OrderStatus.Pending:   result = "Waiting"; break;
    case OrderStatus.Shipped:   result = "On the way"; break;
    case OrderStatus.Delivered: result = "Done"; break;
    default:                    result = "Unknown"; break;
}

// Switch expression
string result = status switch
{
    OrderStatus.Pending   => "Waiting",
    OrderStatus.Shipped   => "On the way",
    OrderStatus.Delivered => "Done",
    _                     => "Unknown"
};
```

Goes further with type patterns — useful when dealing with a base type or interface:

```csharp
decimal discount = customer switch
{
    PremiumCustomer c when c.YearsActive > 5 => 0.20m,
    PremiumCustomer                           => 0.10m,
    StandardCustomer                          => 0.05m,
    _                                         => 0m
};
```

The compiler enforces exhaustiveness — if you forget a case, you get a warning (or error with nullable enabled).
