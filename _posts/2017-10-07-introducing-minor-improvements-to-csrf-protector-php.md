---
layout: post
title: Introducing minor improvements to CSRF Protector PHP
categories: csrf, javascript, open-source, owasp, security, web-security, php
description: "The OWASP CSRF Protector project started with an aim to develop a solution that can mitigate Cross Site Request Forgery in web applications without much developer effort. We have recently released v1.0.0 of CSRF Protector PHP. These improvements / fixes were based on issues raised by different users. Here’s the two major changes that we have introduced and why:<ol><li>Added support for application/json content-type.</li><li>Made path, domain and secure property of CSRF Token Cookie configurable.</li></ol>"
post-no: 5
toc: false
---
The OWASP CSRF Protector project started with an aim to develop a solution that can mitigate Cross Site Request Forgery in web applications without much developer effort. The most common solution for mitigating CSRF is using a token which cannot be retrieved by the attacker, thus ensuring the authenticity of the incoming request to the server. [OWASP Wiki on CSRF](https://www.owasp.org/index.php/Cross-Site_Request_Forgery_(CSRF)) is a good place to learn more about CSRF. Unlike most of other solutions CSRFProtector works as an interceptor and take care of the inner details like – attaching the token with every request from client and validating them at the server. This project started as a part of Google Summer of Code 2014.

We have recently released v1.0.0 of [CSRF Protector PHP](https://github.com/mebjas/CSRF-Protector-PHP). These improvements / fixes were based on issues raised by different users. Here’s the two major changes that we have introduced and why:

### 1. Added support for application/json content-type.
This issue was raised by couple of users – [issue#80](https://github.com/mebjas/CSRF-Protector-PHP/issues/80). The problem here was:
> we were getting false negative when requests were sent as a POST request with application/json Content-Type.

The reason for this was the design of the library itself. Until now, for all POST requests the CSRF token was expected to come as a POST payload. The server read it from super global `$_POST` array. Now in case of POST request the payload can also be sent with request body and in such cases the payload is not available in `$_POST` array. The payload is then retrieved via php input stream (`php://input`). That was causing the false negative in this case.

#### To solve this, we thought of couple of solutions like:
If the `Content-Type header` is set as `application/json` on client side, we have a wrapper around the `XMLHttpRequest` Send method, which can intercept the stringified JSON payload, deserialize it, attach the token as a `{key: value}` and send it to server. On the server side, the CSRFProtector interceptor will read the payload from `php://input`. You can read more about wrappers like `php://input` here.

> php://input is a read-only stream that allows you to read raw data from the request body. However the problem here is – it can only be read once, which makes it inaccessible to actual business logic.

Another suggestion was to just append the token in front of the serialized JSON and send it as a POST payload. On the server side since the length of the token in known, if the `$_REQUEST Content-Type` is `application/json` (or some variety of that) the interceptor will read X characters from the `php://input` input stream (X = length of token) such that rest of the payload will still be seekable. This however, seemed to be an ugly hack. Imagine your data being transferred like this:

```
abcde323{“key1”: “value1”, “key2”: “value2”}
```

Also, it was a lot of overhead from client side as well.

##### Final Solution
So to deal with this issue, some fundamental design changes were made. So far, the CSRF Token was always carried by the GET request query parameters or simple POST Form payload. With this change, the token will now be carried by a request header in case of AJAX POST request. This is done in the `XMLHttpRequest` Send method wrapper by calling `setRequestHeader()` method of `XMLHttpRequest` class. On the server side, in case of POST request the token is first fetched from `$_POST` super global variable. After that it falls back to look for token in request header. If the token is found it’s validated against the values stored at server otherwise the request is set as failed.

It was fixed with this [pull request](https://github.com/mebjas/CSRF-Protector-PHP/pull/88).

### 2. Made path, domain and secure property of CSRF Token Cookie configurable.

This issue was raised by different users – [issue#87](https://github.com/mebjas/CSRF-Protector-PHP/issues/87), [issue#86](https://github.com/mebjas/CSRF-Protector-PHP/issues/86), [issue#68](https://github.com/mebjas/CSRF-Protector-PHP/issues/68) in different manners. The CSRF token is transferred from server to client as a set cookie response header. This header has different properties like – expiry time, path, domain and secure flag. You can read more about them in the [php.net setcookie reference page](http://php.net/manual/en/function.setcookie.php).

In the previous version, these properties were set internally by the library and users didn’t have any control over them. However, some users suggested they were using different applications and the cookie was not being set in path they needed, while other asked for control over the secure flag – so that cookies are only set for https requests. In this new version, the properties like: path, domain and secure flag can now be set in config file. The expiry time shall be exposed in upcoming versions.

It was fixed with this [pull request](https://github.com/mebjas/CSRF-Protector-PHP/pull/89).

### Future Items
We have following things in pipeline based on active issues:

 - Make expiry time of the cookie configurable.
 - Full support for HHVM
 - IE <= 8 support. This issue has been there open for a while now.
That said, I’m excited to see how it’s used and what new issues are going to come up in future.

After all, issues translates to new features and improvements. The code is hosted on Github under the Apache License, Version 2.0. Feel free to use, raise issues or make improvements and send a pull request.

### References:
 - [CSRF Protector PHP OWASP Wiki](https://www.owasp.org/index.php/CSRFProtector_Project)
 - CSRF Protector PHP [Github Repo](https://github.com/mebjas/CSRF-Protector-PHP) | [Issues](https://github.com/mebjas/CSRF-Protector-PHP/issues) | [Wiki](https://github.com/mebjas/CSRF-Protector-PHP/wiki)
 - [CSRF Protector Slide Deck](https://www.slideshare.net/MinhazAv/csrf-protector)
 - [Cross Site Request Forgery](https://www.owasp.org/index.php/Cross-Site_Request_Forgery_(CSRF))


