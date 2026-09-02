---
title: MySQL 索引优化实战指南
date: 2026-01-15
tags: [MySQL, 数据库]
summary: 从 B+ 树说起，到聚簇索引与回表，再到最左前缀原则，最后通过 EXPLAIN 执行计划分析，掌握索引设计的核心技巧。
featured: false
---

索引是数据库性能的基石。本文从索引底层原理出发，结合实际案例，带你掌握 MySQL 索引优化的实战技巧。

## 从 B+ 树说起

MySQL 的索引大多基于 B+ 树（InnoDB）或 B 树（MyISAM）。B+ 树的特点：

- **叶子节点存储数据**：InnoDB 的聚簇索引，叶子节点就是数据行；非聚簇索引的叶子节点存储主键。
- **有序性**：叶子节点按索引键排序，便于范围查询。
- **高度平衡**：所有叶子节点在同一层，查询效率稳定（O(log n)）。

```sql
-- 创建表
CREATE TABLE users (
    id INT PRIMARY KEY,
    name VARCHAR(50),
    age INT,
    email VARCHAR(100),
    INDEX idx_name (name),
    INDEX idx_age_name (age, name)
) ENGINE=InnoDB;

-- 插入数据
INSERT INTO users VALUES (1, 'Alice', 25, 'alice@example.com');
INSERT INTO users VALUES (2, 'Bob', 30, 'bob@example.com');
INSERT INTO users VALUES (3, 'Charlie', 25, 'charlie@example.com');
```

## 聚簇索引与回表

- **聚簇索引**：数据行按主键顺序存储，叶子节点就是数据本身。
- **非聚簇索引**：叶子节点存储主键，查询时需要通过主键回表获取数据。

```sql
-- 查询 name='Alice'，使用 idx_name 索引
EXPLAIN SELECT * FROM users WHERE name = 'Alice';
```

输出：

```
+----+-------------+-------+------------+------+----------------+----------+---------+-------+------+-------+
| id | select_type | table | partitions | type | possible_keys  | key      | key_len | ref   | rows | Extra |
+----+-------------+-------+------------+------+----------------+----------+---------+-------+------+-------+
|  1 | SIMPLE      | users | NULL       | ref  | idx_name       | idx_name | 152     | const |    1 | NULL  |
+----+-------------+-------+------------+------+----------------+----------+---------+-------+------+-------+
```

- **type: ref**：使用了非聚簇索引。
- **key: idx_name**：使用了 name 索引。
- **Extra: NULL**：没有回表（因为索引覆盖了查询列）。

如果查询 `age` 和 `name`：

```sql
EXPLAIN SELECT age, name FROM users WHERE name = 'Alice';
```

- **type: ref**，**Extra: Using index**：索引覆盖，无需回表。

如果查询 `email`（不在索引中）：

```sql
EXPLAIN SELECT * FROM users WHERE name = 'Alice';
```

- **type: ref**，**Extra: Using where; Backward index scan**：需要回表获取 email 列。

## 最左前缀原则

复合索引 `(age, name)` 的使用规则：

- **最左前缀**：必须从最左边开始使用，可以跳过中间列，但不能跳过最左列。

```sql
-- 有效：使用 (age, name) 索引
EXPLAIN SELECT * FROM users WHERE age = 25 AND name = 'Alice';
EXPLAIN SELECT * FROM users WHERE age = 25;  -- 使用 age 部分

-- 无效：跳过 age，直接使用 name
EXPLAIN SELECT * FROM users WHERE name = 'Alice';  -- 不会使用复合索引
```

## 索引失效的六大场景

1. **对索引列进行计算**：`WHERE age + 1 = 26` → 应改为 `WHERE age = 25`。
2. **使用函数**：`WHERE UPPER(name) = 'ALICE'` → 应改为 `WHERE name = 'Alice'`。
3. **类型不匹配**：`WHERE age = '25'`（字符串 vs 数值）→ 应改为 `WHERE age = 25`。
4. **LIKE 以 % 开头**：`WHERE name LIKE '%lice'` → 无法使用索引。
5. **OR 条件**：`WHERE age = 25 OR name = 'Alice'` → 如果 age 和 name 是不同索引，可能无法同时使用。
6. **NOT IN / <>**：`WHERE age <> 25` → 可能无法使用索引。

## EXPLAIN 执行计划实战

`EXPLAIN` 是优化 SQL 的利器，重点关注：

- **type**：访问类型，从好到坏：system → const → eq_ref → ref → range → index → ALL。
- **key**：实际使用的索引。
- **rows**：预估扫描行数，越小越好。
- **Extra**：额外信息，如 Using index（索引覆盖）、Using where（回表）、Using filesort（文件排序）。

```sql
-- 慢查询示例
SELECT * FROM orders WHERE user_id = 123 AND status = 'pending' ORDER BY create_time DESC LIMIT 10;
```

优化步骤：

1. **添加复合索引**：`(user_id, status, create_time)`。
2. **检查执行计划**：确保使用了新索引，且 rows 很小。
3. **避免文件排序**：`ORDER BY` 列在索引中。

```sql
-- 优化后的查询
EXPLAIN SELECT * FROM orders 
WHERE user_id = 123 AND status = 'pending' 
ORDER BY create_time DESC 
LIMIT 10;
```

理想输出：`type: ref`，`key: idx_user_status_time`，`rows: 10`，`Extra: Using index`。

## 索引设计原则

1. **高选择性列在前**：选择性越高（唯一值越多），索引效果越好。
2. **避免过多索引**：索引会降低写入性能，每个表索引数建议不超过 5 个。
3. **覆盖索引**：尽量让查询列都在索引中，避免回表。
4. **复合索引顺序**：按查询频率和选择性排列，最左前缀原则。
5. **定期维护**：`ANALYZE TABLE` 更新统计信息，`OPTIMIZE TABLE` 碎片整理。

## 常见误区

- **索引越多越好**：索引会占用空间，降低写入速度，需要平衡。
- **所有列都建索引**：复合索引不是越多越好，遵循最左前缀。
- **忽略统计信息**：MySQL 依赖统计信息选择最优执行计划，定期分析表。

索引优化是一个持续的过程，需要结合业务场景和实际数据不断调整。通过 EXPLAIN 分析，理解 MySQL 的执行计划，是成为数据库高手的关键一步。