---
layout: post
title: Android Camera Subsystem - basic image processing steps done at hardware level in Android Camera
categories: [android, android-camera, hal, image-processing, computational-photograhpy]
description: "Android is the most popular mobile operation system in the market today. It's an open source mobile operating system by Google and is shipped by several OEMs like Samsung, Redmi, Oppo, Vivo, Nokia etc. Towards the end of last decade camera has emerged as one of the most important factor that contributes towards smartphone sales and different OEMs are trying to stay at the top of the throne. Differnt android flagships including Google owned Pixel(s) have been directly competing with Apple Iphone over the years and giving it a touch competition. In this post I'll be describing various algorithms implemented in Android camera subsystem that is consistent across OEMs which are used to produce stunning images that we capture from Camera Applications."
post-no: 11
toc: false
wip: true
---
## Draft: This is work in progress

## Introduction
Android is the most popular mobile operation system in the market today. It's an open source mobile operating system by Google and is shipped by several OEMs like Samsung, Redmi, Oppo, Vivo, Nokia etc. Towards the end of last decade camera has emerged as one of the most important factor that contributes towards smartphone sales and different OEMs are trying to stay at the top of the throne. Differnt android flagships including Google owned Pixel(s) have been directly competing with Apple Iphone over the years and giving it a touch competition. In this post I'll be describing various algorithms implemented in Android camera subsystem that is consistent across OEMs which are used to produce stunning images that we capture from Camera Applications.

### Legends:
 - HAL: Hardware Access Layer
 - ISP: Image Signal Processor
 - DSP: Digital Singal Processor
 - 3A: Auto Exposure, Auto Focus, Auto White-Balance

## Camera Subsystem in Android
As per [source.android.com](https://source.android.com/devices/camera) on Android Camera:
> Android's camera hardware abstraction layer (HAL) connects the higher-level camera framework APIs in Camera 2 to your underlying camera driver and hardware. __The camera subsystem includes implementations for camera pipeline components__ while __the camera HAL provides interfaces__ for use in implementing your version of these components.

The camera susbsystem includes implementation of fundamental image processing algorithms that converts input on Camera Sensor to an image that can be consumed by applications.

![Camera Pipeline](../images/post11_image1.png){:width="500px"}<br>
<span class="image-caption">_Figure: Camera Pipeline as per Android Source_</span>

### Camera Sensor and RAW input
#### TODO(mebjas): Validate information below.
The camera sensor senses light signals and produce analog signals which is first converted into a RAW image. RAW image is often called digital negatives. A RAW image can only be consumed by specialized image viewing tools but is popular amongst photographers as it preserves the image as it was captured by Camera without loosing information. 

Most OEMs add support for JPEG and YUV image from camera. You can think of YUV as a processed image which is ready to be consumed. While JPEG is compressed image format that represents a processed image.

### Image Processing done in Camera Subsystem

#### Hot pixel correction
TBD

#### Demosaic
TBD

#### Noise reduction
TBD

#### Shading correction
TBD

#### Geometric correction
TBD

#### Color correction
TBD

#### Tone Curve adjustment
TBD

#### Edge enhancement
TBD 




