---
title: RESTful API 设计与规范实践
date: 2024-06-18
tags: [后端, HTTP]
summary: URL 命名、HTTP 方法语义、状态码选择、统一响应结构，一次把 RESTful 设计要点串起来，附上一个可直接照抄的响应模板。
featured: false
---

RESTful 的核心是「面向资源」：一切皆资源，用 HTTP 方法表达动作。

## URL 设计

**名词 + 复数资源层级**，用 `/` 表达嵌套，不用动词：

```
GET    /users                # 用户列表
GET    /users/{id}           # 单个用户
POST   /users                # 新建
PUT    /users/{id}           # 全量更新
DELETE /users/{id}           # 删除
GET    /users/{id}/orders    # 子资源：用户下的订单
```

避免这种风格：`GET /getUserById`、`POST /deleteUser`——动作已经由 HTTP 方法表达了。

## 状态码选择

| 状态码 | 场景 |
|---|---|
| 200 | 查询/更新成功 |
| 201 | POST 创建成功，响应带 Location |
| 204 | 删除成功，无响应体 |
| 400 | 参数校验失败 |
| 401 | 未认证 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 409 | 资源冲突（如重复注册） |

## 统一响应结构

**错误用 HTTP 状态码表达**，错误信息随状态码返回；成功直接返回业务数据，避免再套一层 `code` 导致的双重语义：

```json
// 成功：直接返回数据
GET /users/1
{ "id": 1, "name": "Alice" }

// 失败：错误码 + 可读信息 + 明细
GET /users/9999
{ "error": "用户不存在", "detail": "user id 9999 not found" }
```

## 一个参考模板

```java
@RestController
@RequestMapping("/api/users")
public class UserController {

    @GetMapping("/{id}")
    public ResponseEntity<?> getUser(@PathVariable Long id) {
        User user = userService.find(id);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("error", "用户不存在"));
        }
        return ResponseEntity.ok(user);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Long createUser(@RequestBody @Valid CreateUserReq req) {
        return userService.create(req);
    }
}
```

REST 不是教条。中小项目里，保持 URL 名词化 + 状态码语义正确 + 错误可读，基本就是合格的 API。
