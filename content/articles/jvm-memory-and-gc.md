---
title: JVM 内存模型与 GC 调优
date: 2026-05-21
tags: [JVM, 性能优化]
summary: 理解堆、栈、方法区的结构，掌握常见的 GC 算法与性能调优实践，通过 JVM 参数优化应用性能。
featured: false
---

JVM 内存模型和垃圾回收（GC）是 Java 性能调优的核心。本文从 JVM 内存结构出发，深入探讨 GC 算法，并通过实际案例讲解调优技巧。

## JVM 内存结构

JVM 内存主要分为以下几个区域：

1. **程序计数器（PC Register）**：当前线程执行的字节码指令地址。
2. **虚拟机栈（VM Stack）**：每个线程私有的栈，存储局部变量、操作数栈、方法出口等。
3. **本地方法栈（Native Method Stack）**：为 Native 方法服务。
4. **堆（Heap）**：所有线程共享，存储对象实例，是 GC 的主要区域。
5. **方法区（Method Area）**：存储类信息、常量、静态变量等，JDK 8 后称为元空间（Metaspace）。

```java
public class MemoryModelDemo {
    public static void main(String[] args) {
        // 对象在堆中分配
        User user = new User("Alice", 25);
        // 局部变量在虚拟机栈中
        int age = user.getAge();
    }
}
```

## 堆的结构

堆分为新生代和老年代：

- **新生代**：分为 Eden 区和两个 Survivor 区（S0, S1）。新对象首先在 Eden 区分配，经过 Minor GC 后存活的对象进入 Survivor 区。
- **老年代**：存活时间较长的对象进入老年代，Major GC（Full GC）主要针对老年代。

```java
// JVM 启动参数查看堆结构
java -Xms512m -Xmx512m -XX:+PrintGCDetails -XX:+PrintGCDateStamps -Xloggc:gc.log MyApplication
```

## 垃圾回收算法

### 标记-清除（Mark-Sweep）

- **标记**：标记所有可达对象。
- **清除**：清除未标记的对象。

缺点：碎片化严重，效率低。

### 复制（Copying）

- **新生代**：Eden + S0 → S1，S1 → Eden 交替进行。
- **优点**：无碎片，效率高。
- **缺点**：空间利用率低（只有一半可用）。

### 标记-整理（Mark-Compact）

- **标记**：标记所有可达对象。
- **整理**：将存活对象压缩到内存的一端。
- **优点**：无碎片，空间利用率高。
- **缺点**：效率较低。

### 分代收集（Generational Collection）

结合新生代和老年代的特性，采用不同的 GC 算法：

- **新生代**：复制算法（Minor GC）。
- **老年代**：标记-清除或标记-整理（Major GC）。

## 常见 GC 垃圾收集器

### Serial 收集器

- **单线程**，简单高效，适合客户端应用。
- **新生代**：Serial GC。
- **老年代**：Serial Old GC。

### Parallel 收集器

- **多线程**，吞吐量优先。
- **新生代**：Parallel Scavenge。
- **老年代**：Parallel Old。

### CMS 收集器（Concurrent Mark Sweep）

- **并发标记**，**STW（Stop-The-World）清除**。
- **优点**：低延迟。
- **缺点**：碎片化，并发阶段可能产生浮动垃圾。

### G1 收集器（Garbage-First）

- **分Region**，可预测的停顿时间。
- **新生代**：G1 Young GC。
- **老年代**：G1 Mixed GC / Full GC。

### ZGC 收集器

- **低延迟**，可扩展性强。
- **停顿时间**：通常在 10ms 以内。

## JVM 调优实战

### 常用参数

- **堆大小**：`-Xms`（初始堆大小），`-Xmx`（最大堆大小）。
- **新生代大小**：`-Xmn`（新生代最大大小）。
- **元空间大小**：`-XX:MetaspaceSize`（初始），`-XX:MaxMetaspaceSize`（最大）。
- **GC 日志**：`-XX:+PrintGCDetails -XX:+PrintGCDateStamps -Xloggc:gc.log`。

### 案例：OOM 调优

假设应用出现 OOM，通过 GC 日志分析：

```java
// 模拟 OOM
List<byte[]> list = new ArrayList<>();
while (true) {
    list.add(new byte[1024 * 1024]); // 每次分配 1MB
}
```

1. **分析 GC 日志**：查看 Full GC 频率，是否频繁 Full GC 但堆未释放。
2. **堆转储（Heap Dump）**：使用 `jmap -dump:live,format=b,file=heap.bin <pid>` 导出堆快照。
3. **分析堆快照**：使用 MAT（Memory Analyzer Tool）分析，找出大对象或内存泄漏。
4. **调整参数**：增加堆大小，或优化代码减少对象创建。

### GC 调优策略

1. **合理设置堆大小**：根据应用内存需求，设置合适的 `-Xms` 和 `-Xmx`。
2. **选择合适的 GC 收集器**：根据应用场景选择，如低延迟选 ZGC，吞吐量优先选 G1。
3. **避免 Full GC**：减少老年代对象，合理设置新生代大小。
4. **监控 GC 性能**：使用 `jstat`、`jconsole` 等工具监控 GC 频率和耗时。

## 最佳实践

1. **对象复用**：使用对象池，避免频繁创建和销毁对象。
2. **避免内存泄漏**：及时释放资源，如关闭数据库连接、文件流等。
3. **合理使用缓存**：避免缓存过大对象，设置合理的 TTL。
4. **监控与告警**：监控 JVM 内存使用、GC 频率、延迟等指标。

JVM 调优是一个持续的过程，需要结合业务场景和实际数据不断调整。通过合理的 JVM 参数和 GC 收集器选择，可以显著提升应用性能。