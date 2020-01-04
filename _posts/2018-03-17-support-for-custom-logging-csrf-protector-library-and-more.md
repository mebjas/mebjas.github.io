---
layout: post
title: Support for custom logging in CSRF Protector Library and more
category: csrf, javascript, open-source, owasp, security, web-security, php
description: "Added some new feature to CSRF Protector library (version 1.0.1) like: <ol><li>Support for custom logger.</li><li>X-CSRF-Protection removed from response header.</li><li>Options added to make CSRF Token in cookie https only and it’s expiry time configurable.</li><li>More...</li></ol>"
post-no: 6
toc: false
---

# Here are a few updates to CSRF Protector Library. Let’s call it version 1.0.1

## Major features
### 1. Support for custom logger
So with insufficient logging and monitoring in OWASP Top 10 2017, logging and monitoring is more serious concern than ever now. So far, CSRF Protector had support for file based logging only, and it was required by the library to have logging path (absolute or relative) mentioned in the config file. It’s a problem for developers who try to integrate it with an existing application which has it’s own logger implemented or if there are organisational policies in place which enforces certain kind of logging.

Only way to deal with this was modifying the logger method coupled with the library. In latest change I have decoupled the logger object with the library and developer can initialize the library to use custom logger.The `csrfProtector::init` method now accepts an additional optional parameter `$logger`.

```php
public static function init($length = null, $action = null, $logger = null);
```

This is supposed to be an object of a class that implements the [LoggerInterface](https://github.com/mebjas/CSRF-Protector-PHP/blob/master/libs/csrf/LoggerInterface.php) interface.

```php
interface LoggerInterface {
    public function log($message, $context = array());
}
```

In case the parameter is not provided – the default file based logger – [csrfpDefaultLogger](https://github.com/mebjas/CSRF-Protector-PHP/blob/master/libs/csrf/csrfpDefaultLogger.php) is used;

### 2. X-CSRF-Protection removed from response header.
This can make applications vulnerable to known vulnerabilities in libraries. This was reported by a developer.

### And more minor improvements like:
 3. Options added to make CSRF Token in cookie https only and it’s expiry time configurable.
 4. Log path in configuration file (logDirectory) can be absolute or relative.
 5. Url path in the configuration file can be set to false if developers want to include it themselves in HTML output.

Last three changes (including this) were done by [Brad Stoney](https://github.com/bstoney), thanks to him! 

Also, here’s link to latest release: [https://github.com/mebjas/CSRF-Protector-PHP/releases](https://github.com/mebjas/CSRF-Protector-PHP/releases)

<!--

comment
> Michael : August 6, 2018
Hi Hector,
I am a developer and I use structured PHP for my websites. How do I implement CSRF protection the simplest way posible??

>> admin: September 9, 2018

Hello Michael,
You can either use composer to install this library or download this offline and place this in appropriate location with respect to the project you want to protect against CSRF;

After that, you need to copy the config file ./libs/config.sample.php to ./libs/config.php and change certain values as explained here – https://github.com/mebjas/CSRF-Protector-PHP/blob/master/libs/README.md

After that, just add this to the files you want to protect or one common file included by all;


< ?php
include_once __DIR__ .’/vendor/owasp/csrf-protector-php/libs/csrf/csrfprotector.php’;

//Initialise CSRFGuard library
csrfProtector::init();

Find more details here – https://github.com/mebjas/CSRF-Protector-PHP

> faten hamamah : September 25, 2018
hi hector,
I am a developer and I use structured PHP for my website. I’d already implement CSRF protection and included in my config but when I try to login to my website, it always display “403” error. how do i fix this?
 
>> admin : October 14, 2018
Thanks for creating an issue for this at Github Repository; I’ll follow up there – https://github.com/mebjas/CSRF-Protector-PHP/issues/100

-->