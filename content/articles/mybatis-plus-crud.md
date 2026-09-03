---
title: MyBatis Plus 入门：从 CRUD 到分页
date: 2024-08-25
tags: [MyBatis Plus, Java]
summary: MyBatis Plus 在 MyBatis 之上只多做了一件事：免写 SQL 的通用 CRUD。本文从 Mapper 接口到分页插件，带你快速上手。
featured: false
---

MyBatis Plus（MP）是 MyBatis 的增强工具，不改变原有 MyBatis 用法，只是把单表 CRUD 从「写 SQL」变成「调方法」。

## 三步搭起来

依赖引入、DataMapper、实体注解：

```java
// 1. Mapper 接口：继承 BaseMapper，零 XML
public interface UserMapper extends BaseMapper<User> {}

// 2. 实体类：@TableName 映射表名，@TableId 指定主键
@TableName("user")
public class User {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String name;
    private Integer age;
}
```

## 常用 CRUD

```java
@Autowired
private UserMapper userMapper;

// 插入
User user = new User();
user.setName("Alice");
userMapper.insert(user);

// 按主键查询 / 更新
userMapper.selectById(1L);
userMapper.updateById(user);

// 条件查询：QueryWrapper
LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();
wrapper.eq(User::getAge, 25).like(User::getName, "A");
List<User> list = userMapper.selectList(wrapper);
```

## 分页插件配置

MP 的分页不是开箱即用，需要注册 PaginationInnerInterceptor：

```java
@Configuration
public class MybatisPlusConfig {
    @Bean
    public MybatisPlusInterceptor mybatisPlusInterceptor() {
        MybatisPlusInterceptor interceptor = new MybatisPlusInterceptor();
        interceptor.addInnerInterceptor(new PaginationInnerInterceptor(DbType.MYSQL));
        return interceptor;
    }
}

// 使用：Page 对象 + selectPage
Page<User> page = new Page<>(1, 10);
userMapper.selectPage(page, wrapper);
System.out.println(page.getTotal());   // 总条数
System.out.println(page.getRecords()); // 当前页数据
```

## 碰到的两个坑

1. **字段映射**：驼峰转下划线是默认配置 `map-underscore-to-camel-case: true`，表字段为 `create_time` 时实体写 `createTime` 即可。
2. **逻辑删除**：配置 `@TableLogic` 字段 + `logic-delete-field: deleted`，删除变成 UPDATE，查询自动过滤。

小结：单表 CRUD 用 MP 提效明显，多表复杂查询仍然保留 XML 手写 SQL，两者不冲突。
