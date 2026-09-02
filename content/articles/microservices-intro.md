---
title: 微服务架构入门与实践
date: 2026-08-10
tags: [微服务, Spring Cloud]
summary: 从单体到微服务，掌握服务注册发现、配置中心、网关、熔断器等核心组件，手写一个简单的微服务示例。
featured: false
---

微服务架构是现代分布式系统的主流架构模式。本文从单体应用的问题出发，介绍微服务的基本概念，并通过 Spring Cloud 实现一个简单的微服务示例。

## 从单体到微服务

### 单体应用的痛点

- **扩展性差**：整个应用作为一个整体，无法针对不同模块进行独立扩展。
- **技术栈锁定**：使用单一技术栈，难以引入新技术。
- **部署复杂**：一个小改动需要重新部署整个应用。
- **团队协作困难**：多人同时开发容易冲突。

### 微服务的优势

- **独立部署**：每个服务可以独立部署和扩展。
- **技术异构**：不同服务可以使用不同的技术栈。
- **团队自治**：小团队负责特定服务，提高开发效率。
- **容错性**：一个服务的故障不会影响整个系统。

## 微服务核心组件

### 服务注册与发现

- **服务注册**：服务启动时向注册中心注册自己的地址。
- **服务发现**：服务调用方从注册中心获取服务地址。

**Spring Cloud Netflix Eureka**：

```java
// 服务提供者
@SpringBootApplication
@EnableEurekaClient
public class UserServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(UserServiceApplication.class, args);
    }
}

// 服务消费者
@SpringBootApplication
@EnableDiscoveryClient
public class OrderServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(OrderServiceApplication.class, args);
    }
}
```

### 配置中心

- **集中管理配置**：所有服务的配置统一管理。
- **动态刷新**：配置变更时无需重启服务。

**Spring Cloud Config**：

```java
// 配置服务器
@SpringBootApplication
@EnableConfigServer
public class ConfigServerApplication {
    public static void main(String[] args) {
        SpringApplication.run(ConfigServerApplication.class, args);
    }
}

// 服务配置
spring:
  application:
    name: user-service
  cloud:
    config:
      uri: http://localhost:8888
```

### API 网关

- **路由**：将请求路由到相应的服务。
- **负载均衡**：使用 Ribbon 或 Spring Cloud LoadBalancer。
- **认证授权**：统一处理认证和授权。

**Spring Cloud Gateway**：

```java
@SpringBootApplication
public class GatewayApplication {
    public static void main(String[] args) {
        SpringApplication.run(GatewayApplication.class, args);
    }
}

// 路由配置
spring:
  cloud:
    gateway:
      routes:
        - id: user-service
          uri: lb://user-service
          predicates:
            - Path=/api/users/**
```

### 熔断器

- **防止雪崩**：当一个服务故障时，快速失败，避免级联故障。

**Spring Cloud Hystrix**：

```java
@Service
public class UserService {
    @HystrixCommand(fallbackMethod = "fallbackGetUser")
    public User getUser(Long id) {
        // 调用远程服务
        return restTemplate.getForObject("http://user-service/users/" + id, User.class);
    }

    public User fallbackGetUser(Long id) {
        return new User("default", 0);
    }
}
```

## 手写微服务示例

假设我们要实现一个简单的电商系统，包含用户服务、订单服务和网关。

### 1. 创建父项目

```xml
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.2.0</version>
    <relativePath/>
</parent>

<modules>
    <module>user-service</module>
    <module>order-service</module>
    <module>gateway</module>
</modules>
```

### 2. 用户服务（user-service）

```java
// 启动类
@SpringBootApplication
@EnableDiscoveryClient
public class UserServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(UserServiceApplication.class, args);
    }
}

// 控制器
@RestController
@RequestMapping("/users")
public class UserController {
    @GetMapping("/{id}")
    public User getUser(@PathVariable Long id) {
        return new User(id, "User" + id, 20 + id.intValue());
    }
}
```

### 3. 订单服务（order-service）

```java
// 启动类
@SpringBootApplication
@EnableDiscoveryClient
public class OrderServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(OrderServiceApplication.class, args);
    }
}

// 控制器
@RestController
@RequestMapping("/orders")
public class OrderController {
    @GetMapping("/{id}")
    public Order getOrder(@PathVariable Long id) {
        return new Order(id, "Order" + id, "User" + (id % 10));
    }
}
```

### 4. 网关（gateway）

```java
// 启动类
@SpringBootApplication
public class GatewayApplication {
    public static void main(String[] args) {
        SpringApplication.run(GatewayApplication.class, args);
    }
}

// 路由配置
spring:
  cloud:
    gateway:
      routes:
        - id: user-service
          uri: lb://user-service
          predicates:
            - Path=/api/users/**
        - id: order-service
          uri: lb://order-service
          predicates:
            - Path=/api/orders/**
```

### 5. 服务注册中心（eureka-server）

```java
// 启动类
@SpringBootApplication
@EnableEurekaServer
public class EurekaServerApplication {
    public static void main(String[] args) {
        SpringApplication.run(EurekaServerApplication.class, args);
    }
}
```

### 6. 运行步骤

1. 启动 Eureka Server：`java -jar eureka-server.jar`
2. 启动 User Service：`java -jar user-service.jar --spring.application.name=user-service`
3. 启动 Order Service：`java -jar order-service.jar --spring.application.name=order-service`
4. 启动 Gateway：`java -jar gateway.jar`

访问 `http://localhost:8080/api/users/1`，网关会路由到用户服务。

## 微服务不是银弹

微服务架构虽然有很多优势，但也带来了一些挑战：

- **分布式系统复杂性**：服务间通信、数据一致性、分布式事务等。
- **运维成本**：需要更多的监控、日志、部署工具。
- **团队技能要求**：需要团队成员具备分布式系统知识。

微服务架构适合大型、复杂的应用，对于小型项目，单体架构可能更简单高效。选择合适的架构，需要根据业务需求和团队情况综合考虑。