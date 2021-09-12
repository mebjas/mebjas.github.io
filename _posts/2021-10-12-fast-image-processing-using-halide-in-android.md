---
layout: post
title: Fast image processing using Halide in Android
categories: [android, camera2, YUV_420_888, Halide, YUV, Bitmap, optimisation, JNI]
description: "RenderScript turns out to be one of the best APIs for running
computationally-intensive code on the CPU or GPU (that too, without having to
make use of the NDK or GPU-specific APIs). We can use some existing
intrinsics or create our new kernels that describe the computation and the
framework takes care of scheduling & execution. In this code I have explained
how to use<code>ScriptIntrinsicYuvToRGB</code> intrinsic that is available in Android APIs
to convert an <code>android.media.Image</code> in <code>YUV_420_888</code> format
to <code>Bitmap</code>."
post-no: 33
toc: true
image: '../images/post21_image1.png'
wip: true
---