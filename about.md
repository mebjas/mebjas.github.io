---
layout: about
title: About
permalink: /about/
---
> TL;DR; Mostly 404 otherwise figuring out solutions or next problem to solve.

[LinkedIn](https://www.linkedin.com/in/minhazav/) . [Github](https://github.com/mebjas) . [Twitter](https://twitter.com/minhazav) . [My recent clicks](../photography/) . [500px](https://500px.com/mebjas)

## Key area of expertise

{:class="styled-table"}
|Area | Remarks |
|-----|---------|
|Camera | Particularly Android App side, Camera2, Good knowledge of ISP pipeline |
|Computer Vision | Primarily around Camera needs, Night Mode, HDR imaging |
|Android Performance | JNI, Native, Android Image processing, Realtime processing (OpenGL), Renderscript, Tflite inference on device |
|Android Memory| Android Internals, Java and Native memory, ION memory manager |
|Distributed Systems| High Availability, Resilience & Robustness |

## `now()` Software Engineer III @Google
> ⚓ Singapore, May 2019 to present

I work for a team called **[NBU: Next Billion Users](https://www.blog.google/technology/next-billion-users)** where we build technologies for emerging markets. In these markets, resource-constrained Android devices are very popular. These days I spend most of my time writing code to deliver seamless user experiences for such devices => thus for all markets.

Currently working on **[CameraGo](https://blog.google/products/android/android-go-camera-go/) (the camera for low-end Android devices)**.
 - Led launches of features like [Night Mode](https://www.xda-developers.com/google-camera-android-go-mod-night-mode-low-light-photography/) and [HDR](https://www.xda-developers.com/google-camera-go-rolling-out-hdr-support/) that run on devices with as low as 1Gb ram & low CPU specs.
 - Designed and implemented the processing pipeline responsible for scheduling processing of multi-stage image processing on resource-constrained devices.

 > TIL: Did you know a 1Gb Android device only has ~880Mb of available RAM of which only about ~450 Mb is left for applications to run on? [Learn about carveout memory in Linux](https://developer.toradex.com/knowledge-base/carveout-memory-(linux))

#### Areas I work on these days
 - Android, Android Fundamentals, Android Camera, Android storage
 - Linux Fundamentals, Memory management in Android
 - Image Processing
 
## `now(/* index= */ -1)` - Software Engineer II at Microsoft
> 🇮🇳 Hyderabad, India, June 2016 to May 2019, ~3 years

Worked primarily with **Microsoft Azure**. My day to day involved applied data science, Azure cloud services, distributed systems and some part of Azure UI. My team was working on an intelligent alerting platform in Azure on features like Smart Grouping capable of automatically grouping user alerts from different sources to reduce mean time to mitigation for customers.
 - Led design and implementation of **99.99% available Azure Alerting platform** (4 9s of availability). The effort centered around making the service resilient to regional datacenter outages,
 - Led design and implementation of **alerts correlation service** that could group similar Azure alerts to surface relevant alerts to customers and reduce noise.
 - Awards:
    - **1st prize (Microsoft wide)** in the annual hackathon in the Universal Windows App category. The project involved HoloLens and IOT.
    - Runner ups in short paper presentation in Synapse - **AI Meet 2017** (Microsoft IDC).

> Did you know 99.99% availability means only acceptable downtime of only **4m 23.0s** per month :O

#### Areas I worked on:
 - Applied ML, Unsupervised Learning, Bayesian Networks, Knowledge Graphs
 - Distributed Systems, Systems design, High Availability

## `now(/* index= */ -2)` - All roles @Todofy
> Built in my hostel room @New Delhi, Delhi Technological University, ~6 months in 2015

[Todody](https://todofy.org/) was an ambitious project to organize more than 100 million `TODOs` present in Github codebase at the moment. The goal was to build a platform to add life-cycles for those todos and get them to completion and collaborate on them. See [mebjas/csrf-protector-php](https://todofy.org/r/mebjas/CSRF-Protector-PHP) for example. I built this from scratch in the final year of my engineering and hence my roles involved that of an Engineer, Product Manager, PMM, TPM, UX, UXR, and so on. I still feel the problem exists and this could be rebuilt with a much more matured design probably as a `PaaS` service if not `SaaS` solution and could leverage the huge corpus of data on Github to make it super powerful. 

## Open Source Contributions
#### [HTML5 QRCode](https://github.com/mebjas/html5-qrcode) | Author, Maintainer | Since 2014

<a class="github-button" href="https://github.com/mebjas/html5-qrcode" data-icon="octicon-star" data-show-count="true" aria-label="Star mebjas/html5-qrcode on GitHub">Star</a> 
<a class="github-button" href="https://github.com/mebjas/html5-qrcode/fork" data-show-count="true" aria-label="Fork mebjas/html5-qrcode on GitHub">Fork</a>
<a class="github-button" href="https://github.com/sponsors/mebjas" aria-label="Sponsor @mebjas on GitHub">Sponsor</a>
<a class="github-button" href="https://github.com/mebjas/html5-qrcode/issues" data-show-count="true" aria-label="Issue mebjas/html5-qrcode on GitHub">Issue</a>

It's a QR code reader for the web, built on vanilla js works for different frameworks, operating systems and platforms. Check [demo](https://blog.minhazav.dev/research/html5-qrcode.html) here. Getting more traction everyday!
 - [Html5QrcodeScanner - End to end QR Code scanner for web, not just a library](https://blog.minhazav.dev/qr-code-scanner-end-to-end/)

#### [OWASP CSRF Protector](https://github.com/mebjas/CSRF-Protector-PHP) | Author, Lead Maintainer | Since 2014

<a class="github-button" href="https://github.com/mebjas/CSRF-protector-php" data-icon="octicon-star" data-show-count="true" aria-label="Star mebjas/CSRF-protector-php on GitHub">Star</a> 
<a class="github-button" href="https://github.com/mebjas/CSRF-protector-php/fork" data-show-count="true" aria-label="Fork mebjas/CSRF-protector-php on GitHub">Fork</a>
<a class="github-button" href="https://github.com/sponsors/mebjas" aria-label="Sponsor @mebjas on GitHub">Sponsor</a>
<a class="github-button" href="https://github.com/mebjas/CSRF-protector-php/issues" data-show-count="true" aria-label="Issue mebjas/CSRF-protector-php on GitHub">Issue</a>

Author and main maintainer of this OWASP project since 2014. This project started with my participation in Google Summer of Code with OWASP in 2014 under the mentorship of K. W. Walls and Abbas Naderi. Read more about the project in [the OWASP Wiki](https://owasp.org/www-project-csrfprotector/).

> OWASP CSRF Protector Project is an effort by a group of developers in securing web applications against Cross-Site Request Forgery, providing a PHP library and an Apache Module (to be used differently) for easy mitigation.


