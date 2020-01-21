---
layout: post
title: Basic image processing steps done in Android Camera HAL
categories: [android, android-camera, hal, image-processing, computational-photograhpy]
description: "Android is most popular mobile operation system in the market today. It's an open source mobile operating system by Google and is shipped by several OEMs like Samsung, Redmi, Oppo, Vivo, Nokia etc. It's 2020 and Camera has emerged as one major factor that contributes towards smartphone sales and different OEMs are trying to stay at the top of best camera throne. Differnt android devices including Google owned Pixel(s) have been directly competing with Apple Iphone over the years and giving a touch competition. In this post I'll going breifly over low level architecture of Android Camera that is consistent across OEMs and basic image processing steps that are done in the hardware level to produce stunning images that we capture from Camera Applications."
post-no: 11
toc: true
draft: true
---

## DRAFT

Android is most popular mobile operation system in the market today. It's an open source mobile operating system by Google and is shipped by several OEMs like Samsung, Redmi, Oppo, Vivo, Nokia etc. It's 2020 and Camera has emerged as one major factor that contributes towards smartphone sales and different OEMs are trying to stay at the top of best camera throne. Differnt android devices including Google owned Pixel(s) have been directly competing with Apple Iphone over the years and giving a touch competition. In this post I'll going breifly over low level architecture of Android Camera that is consistent across OEMs and basic image processing steps that are done in the hardware level to produce stunning images that we capture from Camera Applications.

### Legends:
 - HAL: Hardware Access Layer
 - ISP: Image Signal Processor
 - DSP: Digital Singal Processor
