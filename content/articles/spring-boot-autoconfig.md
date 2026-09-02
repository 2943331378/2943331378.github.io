---
title: Spring Boot 自动配置原理剖析
date: 2025-12-18
tags: [Spring Boot, 框架]
summary: 从 @SpringBootApplication 拆解，到 spring.factories 与 AutoConfiguration.imports，深入理解条件注解家族与 Starter 的开发机制，手写一个自定义 Starter。
featured: true
---

Spring Boot 的自动配置是"约定优于配置"的极致体现，它让开发者几乎不用写 XML，但背后有一套精巧的机制。本文拆解自动配置的原理，并手写一个 Starter，让你不仅会用，还能自定义。

## @SpringBootApplication 拆解

`@SpringBootApplication` 是一个组合注解，它包含三个核心：

```java
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
@Inherited
@SpringBootConfiguration
@EnableAutoConfiguration
@ComponentScan(excludeFilters = { @Filter(type = FilterType.CUSTOM, classes = TypeExcludeFilter.class) })
public @interface SpringBootApplication {}
```

- **`@SpringBootConfiguration`**：本质是 `@Configuration`，标记当前类为配置类。
- **`@ComponentScan`**：默认扫描当前包及其子包的 `@Component`、`@Service`、`@Repository`、`@Controller`。
- **`@EnableAutoConfiguration`**：自动配置的核心开关，它会加载 `META-INF/spring.factories` 中定义的 `org.springframework.boot.autoconfigure.EnableAutoConfiguration` 配置类。

## 从 spring.factories 到 AutoConfiguration.imports

Spring Boot 3.0 之后，引入了 `AutoConfiguration.imports` 作为 spring.factories 的补充，解决了 spring.factories 文件过大、加载慢的问题。

- **spring.factories**：传统方式，一个文件包含所有自动配置类，适合小项目。
- **AutoConfiguration.imports**：每个模块一个文件，加载时按需扫描，性能更好。

```properties
# spring-boot-autoconfigure/META-INF/spring.factories
org.springframework.boot.autoconfigure.EnableAutoConfiguration=\
org.springframework.boot.autoconfigure.context.PropertyPlaceholderAutoConfiguration,\
org.springframework.boot.autoconfigure.web.servlet.WebMvcAutoConfiguration,\
org.springframework.boot.autoconfigure.data.jpa.JpaRepositoriesAutoConfiguration
```

```properties
# spring-boot-starter-web/META-INF/AutoConfiguration.imports
org.springframework.boot.autoconfigure.web.servlet.WebMvcAutoConfiguration,\
org.springframework.boot.autoconfigure.web.servlet.error.ErrorMvcAutoConfiguration
```

## 条件注解家族

自动配置类不会无条件生效，而是通过一系列条件注解来决定是否加载：

- **`@ConditionalOnClass`**：类路径上存在指定类时生效。
- **`@ConditionalOnMissingBean`**：容器中不存在指定 Bean 时生效。
- **`@ConditionalOnProperty`**：配置属性满足条件时生效。
- **`@ConditionalOnWebApplication`**：Web 环境下生效。
- **`@ConditionalOnNotWebApplication`**：非 Web 环境下生效。

```java
@Configuration
@ConditionalOnClass({DataSource.class, JdbcTemplate.class})
@ConditionalOnMissingBean(DataSource.class)
@ConditionalOnProperty(prefix = "spring.datasource", name = "url")
@EnableConfigurationProperties(DataSourceProperties.class)
public class DataSourceAutoConfiguration {}
```

这个配置类只有在类路径有 `DataSource` 和 `JdbcTemplate`，且容器中没有 `DataSource` Bean，且 `spring.datasource.url` 配置存在时才会生效。

## 源码走读：DataAutoConfiguration

以 `DataAutoConfiguration` 为例，它负责配置 `DataSource`、`JdbcTemplate` 等：

```java
@Configuration(proxyBeanMethods = false)
@ConditionalOnClass({DataSource.class, JdbcTemplate.class})
@ConditionalOnMissingBean(DataSource.class)
@ConditionalOnSingleCandidate(DataSource.class)
@EnableConfigurationProperties(DataSourceProperties.class)
@AutoConfigureAfter({HibernateJpaAutoConfiguration.class})
public class DataAutoConfiguration {}
```

- `@ConditionalOnClass`：确保 `DataSource` 和 `JdbcTemplate` 存在。
- `@ConditionalOnMissingBean`：容器中没有 `DataSource` 时才配置。
- `@ConditionalOnSingleCandidate`：当 `DataSource` 是唯一候选时才生效（避免多个数据源冲突）。
- `@AutoConfigureAfter`：在 HibernateJPA 配置之后加载。

## 实战：手写一个自定义 Starter

假设我们要开发一个 "hello-world" Starter，提供 `HelloService`。

1. **创建项目**：`hello-world-spring-boot-starter`，引入 `spring-boot-starter`。

2. **编写配置类**：

```java
@Configuration
@ConditionalOnClass(HelloService.class)
@ConditionalOnMissingBean(HelloService.class)
@EnableConfigurationProperties(HelloProperties.class)
public class HelloAutoConfiguration {
    @Bean
    public HelloService helloService(HelloProperties properties) {
        return new HelloService(properties.getMessage());
    }
}
```

3. **编写配置属性类**：

```java
@ConfigurationProperties(prefix = "hello")
public class HelloProperties {
    private String message = "Hello, World!";
    // getters and setters
}
```

4. **创建配置文件**：

```properties
# src/main/resources/META-INF/spring.factories
org.springframework.boot.autoconfigure.EnableAutoConfiguration=\
com.example.hello.HelloAutoConfiguration
```

5. **创建 AutoConfiguration.imports**：

```properties
# src/main/resources/META-INF/AutoConfiguration.imports
com.example.hello.HelloAutoConfiguration
```

6. **使用 Starter**：

```java
@SpringBootApplication
public class DemoApplication {
    public static void main(String[] args) {
        SpringApplication.run(DemoApplication.class, args);
    }
}

@RestController
public class HelloController {
    @Autowired
    private HelloService helloService;
    
    @GetMapping("/hello")
    public String hello() {
        return helloService.sayHello();
    }
}
```

在 `application.properties` 中可以配置：

```properties
hello.message=Hello from custom starter!
```

## 常见问题

- **自动配置不生效**：检查条件注解是否满足，使用 `@EnableAutoConfiguration` 或 `@SpringBootApplication`。
- **配置属性不生效**：确保配置类使用了 `@EnableConfigurationProperties`，并且属性前缀正确。
- **Bean 冲突**：使用 `@ConditionalOnMissingBean` 避免重复创建 Bean。

Spring Boot 的自动配置机制是框架设计的典范，理解它不仅有助于日常开发，还能让你在需要时自定义 Starter，扩展框架功能。