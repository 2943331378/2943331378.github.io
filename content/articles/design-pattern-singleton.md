---
title: 设计模式：单例模式的七种写法
date: 2024-03-30
tags: [设计模式, Java]
summary: 从懒汉、饿汉、双重检查锁到枚举单例，逐个推演单例模式每种写法的利弊，讲清楚一个懒汉单例为什么需要 volatile。
featured: false
---

单例模式保证一个类只有一个实例，是 Java 里最常被问到的设计模式。写法从简单到刁钻有七种，真正该背的就两种。

## 饿汉与懒汉

```java
// 饿汉：类加载即初始化，简单且无线程问题，但可能浪费
public class EagerSingleton {
    private static final EagerSingleton INSTANCE = new EagerSingleton();
    private EagerSingleton() {}
    public static EagerSingleton getInstance() { return INSTANCE; }
}
```

```java
// 懒汉（线程不安全）：首次调用才创建，但多线程下可能 new 多个实例
public class LazySingleton {
    private static LazySingleton instance;
    private LazySingleton() {}
    public static LazySingleton getInstance() {
        if (instance == null) instance = new LazySingleton();
        return instance;
    }
}
```

## 双重检查锁（最常考）

```java
public class DclSingleton {
    // volatile 必不可少：防止指令重排导致其他线程拿到半初始化的对象
    private static volatile DclSingleton instance;

    private DclSingleton() {}

    public static DclSingleton getInstance() {
        if (instance == null) {                    // 第一次检查：命中直接返回
            synchronized (DclSingleton.class) {
                if (instance == null) {            // 第二次检查：杜绝重复创建
                    instance = new DclSingleton();
                }
            }
        }
        return instance;
    }
}
```

`new DclSingleton()` 编译后是三步：分配内存 → 构造对象 → 引用赋值。没有 volatile，CPU 可能先执行赋值、再构造，别的线程就拿到了未初始化对象。

## 枚举单例（推荐）

```java
public enum EnumSingleton {
    INSTANCE;
    public void doSomething() { /* ... */ }
}
```

**为什么最好**：JVM 天然保证枚举实例唯一,反序列化/反射也拿不到第二个实例。这是《Effective Java》推荐的写法。

## 静态内部类与 ThreadLocal

还有两种：静态内部类（只有 getInstance 时才加载，兼具懒汉与线程安全）、ThreadLocal 版本（一个线程一个实例，不算严格单例），各自使用频率低，了解即可。

## 总结

实际工程里二选一：**需要立即创建用饿汉，想延迟加枚举**。面试被问七种写法时，从懒汉不安全、DCL、最后引出枚举即可，重点是讲明白 volatile 与指令重排。
