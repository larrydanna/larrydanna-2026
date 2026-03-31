---
title: "Null-coalescing assignment ??= in C#"
date: "2026-03-31"
tags: ["C#", "Null", "Operators"]
language: "csharp"
draft: false
---

`??=` assigns a value only if the left side is null. Introduced in C# 8.

```csharp
// Before
if (_cache == null)
    _cache = LoadFromDatabase();

// After
_cache ??= LoadFromDatabase();
```

Useful for lazy initialization. The right side is only evaluated if the left side is actually null — so `LoadFromDatabase()` doesn't get called if `_cache` already has a value.

Works with any nullable reference type or `Nullable<T>`. Pairs well with `??` for read-only access:

```csharp
// Return cached value, or load and cache it
return _cache ??= LoadFromDatabase();
```
