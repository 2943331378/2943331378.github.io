---
title: Redis 缓存设计与常见问题
date: 2026-03-02
tags: [Redis, 缓存]
summary: 缓存穿透、击穿、雪崩的解决方案，以及 Redis 持久化与集群配置详解，手写 Spring Boot Redis 缓存封装。
featured: false
---

Redis 是高性能的内存数据库，常用于缓存、会话存储等场景。本文从缓存设计的常见问题出发，深入探讨 Redis 的最佳实践。

## 缓存穿透、击穿、雪崩

### 缓存穿透

**问题**：查询一个不存在的数据，缓存和数据库都没有，每次都查询数据库。

**解决方案**：

1. **布隆过滤器**：预先加载所有可能存在的 key，查询前先过滤。
2. **空值缓存**：对不存在的数据缓存一个空值（TTL 短），避免重复查询数据库。

```java
public String getUser(Long userId) {
    String cacheKey = "user:" + userId;
    String user = redisTemplate.opsForValue().get(cacheKey);
    if (user != null) {
        return user;
    }
    // 缓存穿透：查询数据库前检查是否为空值
    if ("null".equals(user)) {
        return null;
    }
    User dbUser = userRepository.findById(userId).orElse(null);
    if (dbUser == null) {
        // 空值缓存，TTL 60秒
        redisTemplate.opsForValue().set(cacheKey, "null", 60, TimeUnit.SECONDS);
        return null;
    }
    String jsonUser = JSON.toJSONString(dbUser);
    redisTemplate.opsForValue().set(cacheKey, jsonUser, 30, TimeUnit.MINUTES);
    return jsonUser;
}
```

### 缓存击穿

**问题**：热点数据过期，大量请求同时查询数据库。

**解决方案**：

1. **互斥锁**：使用分布式锁，只有一个线程查询数据库，其他等待。
2. **逻辑过期**：不设置过期时间，而是通过逻辑标记过期，后台线程定时刷新。

```java
public String getHotProduct(Long productId) {
    String cacheKey = "hot:product:" + productId;
    String product = redisTemplate.opsForValue().get(cacheKey);
    if (product != null) {
        return product;
    }
    // 缓存击穿：加分布式锁
    RLock lock = redissonClient.getLock("lock:product:" + productId);
    try {
        if (lock.tryLock(3, TimeUnit.SECONDS)) {
            // 双重检查
            product = redisTemplate.opsForValue().get(cacheKey);
            if (product != null) {
                return product;
            }
            Product dbProduct = productRepository.findById(productId).orElse(null);
            if (dbProduct != null) {
                product = JSON.toJSONString(dbProduct);
                redisTemplate.opsForValue().set(cacheKey, product, 10, TimeUnit.MINUTES);
            }
            return product;
        }
    } finally {
        lock.unlock();
    }
    return null;
}
```

### 缓存雪崩

**问题**：大量缓存同时过期，导致数据库压力剧增。

**解决方案**：

1. **随机过期时间**：为缓存设置不同的过期时间，避免同时过期。
2. **熔断机制**：当数据库压力过大时，暂时不查询数据库，返回默认值或错误。
3. **多级缓存**：使用本地缓存（Caffeine）+ Redis，降低 Redis 压力。

```java
// 随机过期时间，避免雪崩
int randomExpire = 60 + new Random().nextInt(60); // 60-120秒
redisTemplate.opsForValue().set(cacheKey, value, randomExpire, TimeUnit.SECONDS);
```

## Redis 持久化

Redis 提供两种持久化方式：

- **RDB（Redis Database）**：定时快照，文件小，恢复快，但可能丢失最新数据。
- **AOF（Append Only File）**：记录每条写命令，文件大，恢复慢，数据更安全。

### RDB 配置

```redis
save 900 1      # 900秒内至少1个key变化，触发快照
save 300 10     # 300秒内至少10个key变化，触发快照
save 60 10000   # 60秒内至少10000个key变化，触发快照
```

### AOF 配置

```redis
appendonly yes
appendfsync everysec  # 每秒同步一次，平衡性能与安全
```

### 混合持久化

Redis 4.0 之后支持混合持久化，结合 RDB 和 AOF 的优点：

```redis
aof-use-rdb-preamble yes
```

## Redis 集群配置

Redis 集群通过分片实现高可用和高性能：

- **主从复制**：主节点写，从节点读，实现读写分离和高可用。
- **哨兵模式**：监控主节点，自动故障转移。
- **集群模式**：多个主从节点组成集群，数据分片存储。

### 哨兵模式配置

```redis
sentinel monitor mymaster 127.0.0.1 6379 2
sentinel down-after-milliseconds mymaster 30000
sentinel failover-timeout mymaster 180000
sentinel parallel-syncs mymaster 1
```

### 集群模式配置

```redis
cluster-enabled yes
cluster-config-file nodes.conf
cluster-node-timeout 5000
```

## Spring Boot Redis 缓存封装

封装一个通用的 Redis 缓存服务，支持多种缓存策略：

```java
@Service
public class RedisCacheService {
    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    /**
     * 缓存穿透处理
     */
    public <T> T getWithPenetration(String key, Class<T> clazz, Supplier<T> loader, long expireSeconds) {
        String value = (String) redisTemplate.opsForValue().get(key);
        if (value != null) {
            if ("null".equals(value)) {
                return null;
            }
            return JSON.parseObject(value, clazz);
        }
        T result = loader.get();
        if (result == null) {
            redisTemplate.opsForValue().set(key, "null", 60, TimeUnit.SECONDS);
            return null;
        }
        redisTemplate.opsForValue().set(key, JSON.toJSONString(result), expireSeconds, TimeUnit.SECONDS);
        return result;
    }

    /**
     * 缓存击穿处理（互斥锁）
     */
    public <T> T getWithMutex(String key, Class<T> clazz, Supplier<T> loader, long expireSeconds) {
        String value = (String) redisTemplate.opsForValue().get(key);
        if (value != null) {
            return JSON.parseObject(value, clazz);
        }
        RLock lock = redissonClient.getLock("lock:" + key);
        try {
            if (lock.tryLock(3, TimeUnit.SECONDS)) {
                value = (String) redisTemplate.opsForValue().get(key);
                if (value != null) {
                    return JSON.parseObject(value, clazz);
                }
                T result = loader.get();
                redisTemplate.opsForValue().set(key, JSON.toJSONString(result), expireSeconds, TimeUnit.SECONDS);
                return result;
            }
        } finally {
            lock.unlock();
        }
        return null;
    }

    /**
     * 缓存雪崩处理（随机过期）
     */
    public void setWithAvalanche(String key, Object value, long baseExpire, long randomRange) {
        long expire = baseExpire + new Random().nextInt((int) randomRange);
        redisTemplate.opsForValue().set(key, JSON.toJSONString(value), expire, TimeUnit.SECONDS);
    }
}
```

## 最佳实践

1. **合理设置过期时间**：根据业务场景，设置合适的 TTL。
2. **使用连接池**：避免频繁创建连接，提高性能。
3. **序列化选择**：使用 JSON 或 Protobuf，避免 Java 序列化。
4. **监控与告警**：监控 Redis 内存使用、QPS、延迟等指标。
5. **数据备份**：定期备份 RDB/AOF 文件，防止数据丢失。

Redis 缓存设计需要综合考虑性能、可用性和数据一致性。通过合理的缓存策略和 Redis 配置，可以显著提升系统性能。