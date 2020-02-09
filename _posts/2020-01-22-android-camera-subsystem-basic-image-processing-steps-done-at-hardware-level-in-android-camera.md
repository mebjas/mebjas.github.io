---
layout: post
title: Android Camera Subsystem - basic image processing steps done at hardware level in Android Camera
categories: [android, android-camera, hal, image-processing, computational-photograhpy]
description: "Android is one of the most popular mobile operation system in the market today. It's an open source mobile operating system by Google and is shipped by several OEMs like Samsung, Redmi, Oppo, Vivo, Nokia etc. Towards the end of last decade camera has emerged as one of the most important factor that contributes towards smartphone sales and different OEMs are trying to stay at the top of the throne. Differnt android flagships including Google owned Pixel(s) have been directly competing with Apple Iphone over the years and giving it a touch competition. In this post I'll be describing various algorithms implemented in Android camera subsystem that is consistent across OEMs which are used to produce stunning images that we capture from Camera Applications."
post-no: 11
toc: false
wip: true
---
## Draft: This is work in progress

## Introduction
Android is one of the most popular mobile operation system in the market today. It's an open source mobile operating system by Google and is shipped by several OEMs like Samsung, Redmi, Oppo, Vivo, Nokia etc. Towards the end of last decade camera has emerged as one of the most important factor that contributes towards smartphone sales and different OEMs are trying to stay at the top of the throne. Differnt android flagships including Google owned Pixel(s) have been directly competing with Apple Iphone over the years and giving it a touch competition. In this post I'll be describing various algorithms implemented in Android camera subsystem that is consistent across OEMs which are used to produce stunning images that we capture from Camera Applications.

### Legends:
 - HAL: Hardware Access Layer
 - ISP: Image Signal Processor
 - DSP: Digital Singal Processor
 - 3A: Auto Exposure, Auto Focus, Auto White-Balance

## Camera Subsystem in Android
As per [source.android.com](https://source.android.com/devices/camera) on Android Camera:
> Android's camera hardware abstraction layer (HAL) connects the higher-level camera framework APIs in Camera 2 to your underlying camera driver and hardware. __The camera subsystem includes implementations for camera pipeline components__ while __the camera HAL provides interfaces__ for use in implementing your version of these components.

The camera susbsystem includes implementation of fundamental image processing algorithms that converts `RAW Bayer output` from camera sensor to full fledged image that can be consumed by applications and users. I have explained [Android camera hardware architecture](https://blog.minhazav.dev/android-camera-hardware-explained/) in detail in another article.

![Camera Pipeline](../images/post11_image1.png){:width="500px"}<br>
<span class="image-caption">_Figure: Camera Pipeline as per Android Source_</span>

### Camera Sensor and RAW output
As described in [this post](https://blog.minhazav.dev/android-camera-hardware-explained/#sensor) the output of camera sensor only contains information on one color per pixel as compared to three color (RGB) per pixel we intutively assume.

![Output from sensor](../images/post12_image4.png){:width="500px"}<br>
<span class="image-caption">_Figure: Output from camera sensor._</span>

The output from camera sensors are preserved in a format called RAW. RAW image is often called digital negatives. A RAW image can only be consumed by specialized image viewing tools but is popular amongst photographers as it preserves the image as it was captured by Camera without loosing information.

The output of Android camera subsystem are consumed by applications or application layer. Most OEMs add support for JPEG and YUV image as output from the camera, while some add support for returning RAW image directly as well. You can think of YUV as a processed image which is ready to be consumed. While JPEG is compressed image format that represents a compressed version of processed image.

### Image Processing done in Camera Subsystem

#### Hot pixel correction
 ![hot pixe correction](../images/common_hot_pixel.jpg){:width="500px"} <br>
 <span class="image-caption">_Figure: Image with incorrect red pixel ([Image via Shutterstock](http://www.shutterstock.com/pic-84216661/stock-photo-closeup-portrait-of-a-halloween-black-cat.html?src=M6Qs_EDxVIIVJ36sl_5sqQ-1-1))._</span>

Every sensor has pixels that do not react linearly to incident light. Often, these pixels appear brighter and especially in dark images they disturb as colored dots. This could easily happen if any pixel in the sensor array produce an incorrect result due to over heating or other hardware issues.

##### Detection
A bad pixel (superset of hot pixel) can be defined as a pixel that does not behave as expected, producing anomalous values and therefore, no valuable information. While many advanced methods exists, in naive terms the way to detect hot pixel is to check if a pixel is anamolous w.r.t it's neighbourhood.

##### Correction
Hot pixel correction is usually done with nearest neightbour interpolation techniques. The most naive algorithm would be to take average of all 8 neighbours (for non corner pixels) and apply it.

#### Demosaic
 ![demosaic](../images/common_demosaic.png){:width="500px"} <br>
 <span class="image-caption">_Figure: Image as captured by sensor (Right) and Image produced after processing (Left)._</span>

> **Did you know almost 2/3 of image you see is made up?**

As mentioned in detail in [this article](https://blog.minhazav.dev/android-camera-hardware-explained/#isp-image-signal-processor) - the CMOS sensors doesn't sense <span style="color:red; font-weight:bold">RED</span>, <span style="color:blue; font-weight:bold">BLUE</span> and <span style="color:green; font-weight:bold">GREEN</span> for each pixel. The sensor senses one of these color per pixel (usually 2 Green, 1 Red and 1 Blue in 4 pixel group) and rest of the image is guessed programatically in the ISP. The input to the algorithm is called RAW Bayer Image.

![raw bayer image](../images/common_raw_bayer.png){:width="400px"}<br>
<span class="image-caption">_Figure: The Bayer arrangement of color filters on the pixel array of an image sensor. Each two-by-two cell contains two green, one blue, and one red filter._</span>

The reconstruction of the image from the bayer image is done using different type of  [multivariate interpolation](https://en.wikipedia.org/wiki/Multivariate_interpolation) techniques. To dig more into different types of algorithms present today - refer to [this Wikipedia](https://en.wikipedia.org/wiki/Demosaicing) article.

#### Noise reduction
![noisy image](../images/common_noisy_image.jpg){:width="400px"} <br>
<span class="image-caption">_Figure: Image with noise._</span>

Image noise is random variation in brightness or color in the produced image and is usually an aspect of electronic noise. It can be produced due to errors in camera sensor. The image noise can be of following types or more:
 - [Gaussian Noise](https://en.wikipedia.org/wiki/Gaussian_noise)
 - [Salt and Pepper Noise](https://en.wikipedia.org/wiki/Salt-and-pepper_noise)
 - [Shot Noise](https://en.wikipedia.org/wiki/Shot_noise)
 - Quantization Noise
 - [Read more on Wikipedia](https://en.wikipedia.org/wiki/Image_noise)

##### Causes of noise
 - In low light conditions the shutter speed, aperture or ISO (sensor's sensitivity) is increased to get higher exposure. On most cameras, slower shutter speeds lead to increased salt-and-pepper noise.
 - The size of the image sensor, or effective light collection area per pixel sensor, is the largest determinant of signal levels that determine signal-to-noise ratio and hence apparent noise levels.
 - Sensor heating - temperature can also have an effect on the amount of noise produced by an image sensor due to leakage. 
 > Would your camera be more noisy in Summer as compared to winters?

##### Noise Reduction (NR) techniques
Noise reduction is a difficult problem and there is no sure shot algorithm that can deterministically fix any kind of noise. Noise identification and applying fix for that kind of noise can be one tecnique. For example, for Guassian noise one may want to apply a simple filter which apply average operation on certain convolution for each pixel.

It's noteworthy that noise reduction is usually done separately for `luma` and `chroma` component of the image. In fact, NR is done more aggresively on `chroma` as most people find chrome noise more objectionable than luma noise. These days technique involving capturing multiple frames in short succession and merging them is also used for NR particularly in low light conditions.

#### Shading correction
![geometric correction](../images/common_lens_shading.jpg){:width="500px"} <br>
<span class="image-caption">_Figure: (Right) Image with vignetting from sensor and (Left) after applying lens shading correction._</span>

TBD

#### Geometric correction
![geometric correction](../images/common_geometric.png){:width="500px"} <br>
<span class="image-caption">_Figure: Image before geometric correction._</span>

TBD

#### Color correction
TBD

#### Tone Curve adjustment
TBD

#### Edge enhancement
TBD 

After applying these steps (or more as implemented by HAL of different OEMs) RAW image can be converted to YUV. YUV images are usually large in size with `1.5 Bytes per pixel`. This means a `12 MP image (4000 X 3000)` will occupy around `17.2 MB` in memory. To save size of output image written to disk an image is usually compressed and JPEG is more popular format for this at the moment. Jpeg encoding is supported at HAL level as it can be efficiently done at hardware level.

If you are writing an application on top of Android Camera and intend to perform your own processing on top of image returned by framework you should request image in `YUV` format. OTOH, if the goal is to directly write the image to disk `JPEG` image should be used.

> If the goal is to just save the image to disk and then act on it, it'd both easier and faster to use [Android Camera Intent](https://developer.android.com/training/camera/photobasics) than implementing the camera.

If you request a YUV image and perform some image processing on top of it and finally save to disk, you'd still need to pay cost of JPEG encoding. Jpeg encoding usually takes around `~ 800 ms` vs `~ 90 ms` at software vs hardware layer respectively for a 8MP image on a simple quad core system. This can however be optimised by using Reprocessing APIs supported in later version of Android. I'll be writing more about it soon.
<!-- TODO(mebjas): add link to article on reporcessing API. -->

## References
 - [Android Camera Architecture explained - minhazav.dev](https://blog.minhazav.dev/android-camera-hardware-explained/)
 - [Android Camera - source.google.com](https://source.android.com/devices/camera)
- [Hot pixel correction - ids-imaging.com](https://en.ids-imaging.com/tl_files/downloads/techtip/TechTip_uEyeHotpixelEditor_EN.pdf)