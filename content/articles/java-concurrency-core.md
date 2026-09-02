---
title: Java 并发编程核心概念详解
date: 2025-11-20
tags: [并发编程, Java]
summary: 深入理解 JMM 内存模型、synchronized 锁升级、volatile 与 happens-before，掌握线程池的正确打开方式，避开常见的并发陷阱。
featured: false
---

并发编程是 Java 后端面试与实践中绕不开的主题。这篇文章把我学习过程中梳理的核心概念串成一条线：从"为什么并发会出错"讲起，到 JMM、锁、volatile，最后落到线程池的实战配置。

## 为什么并发会出错

一个最经典的例子：两个线程同时对同一个计数器执行 `i++`。`i++` 看起来是一步，实际上是「读取 → 加一 → 写回」三步，交错执行就会丢失更新。

```java
public class CounterDemo {
    private static int count = 0;

    public static void main(String[] args) throws InterruptedException {
        Runnable task = () -> {
            for (int i = 0; i < 10_000; i++) {
                count++; // 非原子操作：读、加、写三步
            }
        };
        Thread t1 = new Thread(task);
        Thread t2 = new Thread(task);
        t1.start(); t2.start();
        t1.join();  t2.join();
        System.out.println(count); // 期望 20000，实际往往小于 20000
    }
}
```

问题根源有两个：一是**原子性**被打破，二是**可见性**——一个线程修改了变量，另一个线程可能还在读工作内存中的旧值。

## Java 内存模型（JMM）与三大性质

JMM（Java Memory Model）并不描述 JVM 内部实现，而是一份**契约**：它规定了多线程读写共享变量时，程序应该看到什么结果。

- **主内存**：所有共享变量存放的地方。
- **工作内存**：每个线程私有的副本，线程操作变量必须先拷贝到工作内存。

JMM 围绕三个性质展开：

| 性质 | 含义 | 保证手段 |
|---|---|---|
| 原子性 | 操作不可分割 | `synchronized`、`Lock`、原子类 |
| 可见性 | 修改对其他线程立即可见 | `volatile`、`synchronized`、`final` |
| 有序性 | 禁止指令重排带来的混乱 | `volatile`、happens-before |

## synchronized 与锁升级

`synchronized` 是 JVM 内置锁，JDK 6 之后引入了**锁升级**机制，按竞争激烈程度逐步升级：

1. **无锁** → 2. **偏向锁**：只有一个线程访问时，在对象头 Mark Word 记录线程 ID → 3. **轻量级锁**：第二个线程来了，CAS 自旋获取 → 4. **重量级锁**：自旋失败次数过多，膨胀为操作系统互斥量，线程阻塞挂起。

```java
public class Singleton {
    // 双重检查锁：必须配合 volatile，防止指令重排返回半初始化对象
    private static volatile Singleton instance;

    private Singleton() {}

    public static Singleton getInstance() {
        if (instance == null) {                 // 第一次检查，避免不必要的加锁
            synchronized (Singleton.class) {
                if (instance == null) {         // 第二次检查，防止重复创建
                    instance = new Singleton();
                }
            }
        }
        return instance;
    }
}
```

## volatile 与 happens-before

`volatile` 做两件事：**保证可见性**（写立即刷回主内存，读失效本地缓存）和**禁止指令重排**。但它不保证原子性，所以 `count++` 加 `volatile` 依然会错。

happens-before 是 JMM 的核心规则，常用的几条：

- **程序顺序规则**：单线程内，前面的操作 happens-before 后面的操作。
- **volatile 规则**：volatile 写 happens-before 后续对同一变量的读。
- **传递性**：A happens-before B，B happens-before C，则 A happens-before C。
- **锁规则**：解锁 happens-before 后续对同一把锁的加锁。

## 线程池 ThreadPoolExecutor 七参数

生产环境**禁止使用 `Executors.newFixedThreadPool`** 等快捷方法——无界队列会堆积任务直到 OOM。正确姿势是手动 new `ThreadPoolExecutor`，理解七个参数：

```java
ThreadPoolExecutor executor = new ThreadPoolExecutor(
        4,                                     // corePoolSize 核心线程数
        8,                                     // maximumPoolSize 最大线程数
        60, TimeUnit.SECONDS,                  // 非核心线程空闲存活时间
        new ArrayBlockingQueue<>(100),         // workQueue 有界阻塞队列
        new ThreadFactoryBuilder().setNameFormat("biz-pool-%d").build(),
        new ThreadPoolExecutor.CallerRunsPolicy() // 拒绝策略：调用者执行，起到天然限流作用
);
```

参数怎么配？CPU 密集型任务核心线程数取 `N + 1`，IO 密集型取 `2N` 或按公式 `N × (1 + 等待时间/计算时间)` 估算，但最终一定要**压测验证**。

## 常见并发陷阱

- **ThreadLocal 忘记 remove**：线程池中线程复用，脏数据会串到下一个请求，甚至引发内存泄漏。
- **在锁内执行耗时操作**：RPC 调用、IO 放在临界区里，锁竞争会把吞吐量拖垮。
- **锁粒度错误**：给整个方法加锁 vs 只锁共享资源，性能可能差一个数量级。
- **误以为线程安全类组合起来也线程安全**：`Vector` 里先 `get` 再 `set` 依然存在竞态条件。

并发没有银弹，理解内存模型是根基，其余的锁、AQS、并发容器都是在它之上的工程化封装。
