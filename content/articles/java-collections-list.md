---
title: Java 集合框架：ArrayList 与 LinkedList 对比
date: 2024-10-12
tags: [Java, 集合框架]
summary: 同是 List 接口实现，为何 ArrayList 是默认选择？从底层结构、扩容机制、插入删除差异三个角度，把两者的适用场景讲清楚。
featured: false
---

刚学 Java 时，老师总说「List 用 ArrayList」。本文讲讲它为什么是默认选择，以及何时该考虑 LinkedList。

## 底层结构差异

ArrayList 基于**动态数组**，LinkedList 基于**双向链表**：

```java
// ArrayList：连续内存，随机访问 O(1)
List<String> arrayList = new ArrayList<>();
arrayList.add("a");   // 尾插：均摊 O(1)
arrayList.get(100);   // 下标直接寻址：O(1)

// LinkedList：节点串联，随机访问 O(n)
List<String> linkedList = new LinkedList<>();
linkedList.add("a");          // 尾插：O(1)
linkedList.get(100);          // 从头遍历 100 次：O(n)
linkedList.add(1, "x");       // 找到位置后插入：O(n) + O(1)
```

## ArrayList 的扩容机制

默认容量 10，满 3 / 4 时触发 `grow()`，新容量 = 旧容量的 1.5 倍：

```java
// 查看源码核心逻辑
int newCapacity = oldCapacity + (oldCapacity >> 1); // × 1.5
```

频繁扩容需要数组拷贝，所以**能预估大小时指定初始容量**：

```java
List<String> list = new ArrayList<>(1_000_000); // 一次性到位，避免多次拷贝
```

## 别再用 LinkedList 当队列

LinkedList 实现了 Deque，可以当队列用，但 `ArrayDeque` 更快、内存更省：

```java
// 推荐
Queue<String> queue = new ArrayDeque<>();

// 曾经的做法（不推荐）：节点多、缓存命中差
Queue<String> queue2 = new LinkedList<>();
```

## 总结

- 遍历和随机访问为主 → ArrayList
- 队列/双端队列 → ArrayDeque
- LinkedList 擅长「头部频繁插入」，但现代工程里极少是性能瓶颈，除非你能解释为什么，否则默认 ArrayList。
