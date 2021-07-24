---
layout: post
title: How to use RenderScript to convert YUV_420_888 YUV Image to Bitmap
categories: [android, camera2, YUV_420_888, android.media.Image, YUV, Bitmap, optimisation, RenderScript, ScriptIntrinsicYuvToRGB]
description: "RenderScript turns out to be one of the best APIs for running
computationally-intensive code on the CPU or GPU (that too, without having to
make use of the NDK or GPU-specific APIs). We can use some existing
intrinsics or create our new kernels that describe the computation and the
framework takes care of scheduling & execution. In this code I have explained
how to use<code>ScriptIntrinsicYuvToRGB</code> intrinsic that is available in Android APIs
to convert an <code>android.media.Image</code> in <code>YUV_420_888</code> format
to <code>Bitmap</code>."
post-no: 27
toc: true
image: '../images/post21_image1.png'
---
RenderScript turns out to be one of the best APIs for running
computationally-intensive code on the CPU or GPU (that too, without having to
make use of the NDK or GPU-specific APIs). We can use some existing
intrinsics or create our new kernels that describe the computation and the
framework takes care of scheduling & execution. In this code I have explained
how to use `ScriptIntrinsicYuvToRGB` intrinsic that is available in Android APIs
to convert an `android.media.Image` in `YUV_420_888` format to `Bitmap`.

## Note to readers
<img src="../images/common_note2.jpg" style="width: 50%; margin-left: 25%"><br>

-   I have a habit of explaining concepts before showing the code, if you want to see the money, no code - go to [Java code section](#java-code).
-   Despite lacking a good sense of humor, I tend to try to write funny.
-   For this article, I expect readers to be familiar with Android, Java, JNI, Images in YUV and Bitmap formats.
-   This article also serves as an example of how to use `RenderScript` in Android, and it's performance benefits — even if this is not the exact use case you are targeting.

## RenderScript
You can read much more about RenderScript in
[Android's documentation](https://developer.android.com/guide/topics/renderscript/compute). In short:

-   RenderScript is a framework for running computationally intensive tasks at high performance on Android.
-   Primarily oriented for data-parallel computation (very well suited for image processing).
-   Runtime parallelizes the work across available processors such as multi-core CPUs & GPUs.
-   Developers can focus on the algorithm rather than it's scheduling.
-   Language derived from [C99](https://en.wikipedia.org/wiki/C99)

## YUV_420_888 to Bitmap in Android using RenderScript
If you are here, I assume you are fairly aware of `YUV_420_888` format & `Bitmap`.

If you are not, and you want to learn more or find other ways to convert `YUV_420_888` to `Bitmap`
in Android, you can check out another article:

<div class="embedded-post">
    <div class="embedded-post-title">
        <a href="https://blog.minhazav.dev/how-to-convert-yuv-420-sp-android.media.Image-to-Bitmap-or-jpeg/">
        How to use YUV (YUV_420_888) Image in Android
        </a>
    </div>
<a href='https://developer.android.com/reference/android/graphics/ImageFormat#YUV_420_888' target='new'>ImageFormat#YUV_420_888</a> is one of the most common image format supported by Android Cameras. It's a multi-plane YUV (YCbCr) format represented by three separate planes in <a href='https://developer.android.com/reference/android/media/Image' target='new'>android.media.Image</a>. This format can be used for processing the input frames before saving to disk or some other action. A very common question around YUV is how to consume it in Android. In this article, I'd describe different ways it can be used. The most common question is <b>how to convert YUV to Bitmap or jpeg format in Android?</b>
</div>

### ScriptIntrinsicYuvToRGB
[ScriptIntrinsicYuvToRGB](https://developer.android.com/reference/android/renderscript/ScriptIntrinsicYuvToRGB) is an intrinsic for converting Android YUV buffer to
RGB. The input allocation is expected to be in `NV21` format and the output will
be RGBA with alpha channel set to 255.

> In NV21 format, we have full Y channels and subsampled U & V channels. That is
each U & V pixel caters to 4 pixels in the Y channel. Also, the NV21 format is
single plane with Y channel data first followed by interleaved V & U pixels.
For a 4X4 image it would look like YYYYYYYYYYYYYYYYVUVUVUVU.

BTW if you are wondering what an `intrinsic` means:
> intrinsic: Normally, "intrinsics" refers to functions that are built-in -- i.e. most standard library functions that the compiler can/will generate inline instead of calling an actual function in the library.

(source: [What are intrinsics? — StackOverflow](https://stackoverflow.com/questions/2268562/what-are-intrinsics))

### How to use this intrinsic
So basically, lets say we want to use the Java APIs available. We:
1.  Initialize a `RenderScript` Context.
2.  Create input and output `Allocations`.
    - An Allocation is a `RenderScript` object that provides storage for a fixed amount of data.
    This needs to be provided by the caller.
    - Allocations are of type [Element](https://developer.android.com/reference/android/renderscript/Element).
    In this case we would want to create one allocation for input (YUV) and other for output (`Bitmap`).
    - For `Bitmap` we can directly use the `Element` of type [RGBA_8888](https://developer.android.com/reference/android/renderscript/Element#RGBA_8888(android.renderscript.RenderScript)).
    - For `Image` we don't have a direct element type, and we need to convert the data into a flat
    `NV21` `byte[]`.
3.  Copy input and output to the allocations.
4.  Execute the kernel.

### Java Code
Since the allocations are expensive, I'd design the allocations to be reusable.

> Note: In this example I am not taking care of the thread-safety or making the
code asynchronous or whether we should do resource allocation in the constructor.
> Leaving all of those tasks to you :)

So we can start with a skeleton of our YuvConvertor class:

```java
class YuvConvertor {
    private final Allocation in, out;
    private final ScriptIntrinsicYuvToRGB script;

    public YuvConvertor(Context context, int width, int height) {
        // Setup
    }

    public Bitmap toBitmap(Image image) {
        if (image.getFormat() != ImageFormat.YUV_420_888) {
            throw new IllegalArgumentException("Only supports YUV_420_888.");
        }

        // Convert ..
    }
}
```

#### Constructor
```java
class YuvConvertor {
    private final Allocation in, out;
    private final ScriptIntrinsicYuvToRGB script;

    public YuvConvertor(Context context, int width, int height) {
        RenderScript rs = RenderScript.create(context);
        this.script = ScriptIntrinsicYuvToRGB.create(
            rs, Element.U8_4(rs));

        // NV21 YUV image of dimension 4 X 4 has following packing:
        // YYYYYYYYYYYYYYYYVUVUVUVU
        // With each pixel (of any channel) taking 8 bits.
        int yuvByteArrayLength = (int) (width * height * 1.5f);
        Type.Builder yuvType = new Type.Builder(rs, Element.U8(rs))
            .setX(yuvByteArrayLength);
        this.in = Allocation.createTyped(
            rs, yuvType.create(), Allocation.USAGE_SCRIPT);

        Type.Builder rgbaType = new Type.Builder(rs, Element.RGBA_8888(rs))
            .setX(width)
            .setY(height);
        this.out = Allocation.createTyped(
            rs, rgbaType.create(), Allocation.USAGE_SCRIPT);
    }
}
```

> Note: There is a certain overhead associated with construction of this object 
(driven by initialization cost). Be mindful of when to initialize this. On a
mid-tier Android device I observed it to take between `0ms - 14ms`. The cost
could be higher on a low-end device.

#### toBitmap(Image image) method.
```java
public Bitmap toBitmap(Image image) {
    if (image.getFormat() != ImageFormat.YUV_420_888) {
        throw new IllegalArgumentException("Only supports YUV_420_888.");
    }

    byte[] yuvByteArray = toNv21(image);
    in.copyFrom(yuvByteArray);
    script.setInput(in);
    script.forEach(out);

    // Allocate memory for the bitmap to return. If you have a reusable Bitmap
    // I recommending using that.
    Bitmap bitmap = Bitmap.createBitmap(
        image.getWidth(), image.getHeight(), Config.ARGB_8888);
    out.copyTo(bitmap);

    return bitmap;
}

private byte[] toNv21(Image image) {
    // TODO: Implement this.
}
```

Since `RenderScript` inherently doesn't support `YUV_420_888` `Image` - we need
to convert the `Image` to a `byte[]`. This is going to be slow down every thing.

<image src="../images/post27_image1.webp" style="width: 60%; margin-left: 15%" /><br>

Unless of course we can write a fast highly parallelized way to do so (which should be doable).
So I have found two ways to do it - one is fast other is not. Also, important to note that
neither of these approaches leverage the parallelizability of this copy.

Let's start with our Java approach which is slower.

#### toNv21(Image image) Java Approach
```java
private byte[] toNv21(Image image) {
    int width = yuv420Image.getWidth();
    int height = yuv420Image.getHeight();

    // Order of U/V channel guaranteed, read more:
    // https://developer.android.com/reference/android/graphics/ImageFormat#YUV_420_888
    Plane yPlane = yuv420Image.getPlanes()[0];
    Plane uPlane = yuv420Image.getPlanes()[1];
    Plane vPlane = yuv420Image.getPlanes()[2];

    ByteBuffer yBuffer = yPlane.getBuffer();
    ByteBuffer uBuffer = uPlane.getBuffer();
    ByteBuffer vBuffer = vPlane.getBuffer();

    // Full size Y channel and quarter size U+V channels.
    int numPixels = (int) (width * height * 1.5f);
    byte[] nv21 = new byte[numPixels];
    int idY = 0;
    int idUV = width * height;
    int uvWidth = width / 2;
    int uvHeight = height / 2;

    // Copy Y & UV channel.
    // NV21 format is expected to have YYYYVU packaging.
    // The U/V planes are guaranteed to have the same row stride and pixel stride.
    int uvRowStride = uPlane.getRowStride();
    int uvPixelStride = uPlane.getPixelStride();
    int yRowStride = yPlane.getRowStride();
    int yPixelStride = yPlane.getPixelStride();
    for(int y = 0; y < height; ++y) {
      int yOffset = y * yRowStride;
      int uvOffset = y * uvRowStride;

      for (int x = 0; x < width; ++x) {
        nv21[idY++] = yBuffer.get(yOffset + x * yPixelStride);

        if (y < uvHeight && x < uvWidth) {
          int bufferIndex = uvOffset + (x * uvPixelStride);
          // V channel.
          nv21[idUV++] = vBuffer.get(bufferIndex);
          // U channel.
          nv21[idUV++] = uBuffer.get(bufferIndex);
        }
      }
    }

    return nv21;
}
```

I have the split the performance numbers into two part:
1.   Full `toBitmap(..)` method.
2.   `toBitmap(..)` without `toNv21(..)` to show the cost difference of the intrinsic and the buffer copy.

{:class="styled-table"}
| # | Average | Max | Min
| ------ | ----- | -- | -- |
| Full `toBitmap(..)`| 195.10 ms | 233 ms | 178 ms |
| Without `toNv21(..)`| 32.00 ms | 40 ms | 27 ms |

_Table: The numbers are computed on Pixel 4a for an 8MP (3264x2448) image_

Do you see just how sad that Java copy was? It took `83%` of net computation time. BTW, this total time is still faster
than pure Java approach but slower than full native approach mentioned in [How to use YUV (YUV_420_888) Image in Android](https://blog.minhazav.dev/how-to-convert-yuv-420-sp-android.media.Image-to-Bitmap-or-jpeg/).

Let's do better with a native `toNv21(..)` method.

#### toNv21(Image image) Java Native (JNI) Approach
In this case we basically port the java copy code to native and plug it in to the Android code with JNI.
Here I am assuming you know how to set up JNI.

Java code:

```java
class YuvConvertor {

    // .. Other stuff
    static {
        System.loadLibrary("yuv2rgb-lib");
    }

    // In practice I don't recommend nullable byte[], Use optional?
    @Nullable
    public static byte[] toNv21(Image image) {
        byte[] nv21 = new byte[(int) (image.getWidth() * image.getHeight() * 1.5f)];
        if (!yuv420toNv21(
            image.getWidth(),
            image.getHeight(),
            image.getPlanes()[0].getBuffer(),       // Y buffer
            image.getPlanes()[1].getBuffer(),       // U buffer
            image.getPlanes()[2].getBuffer(),       // V buffer
            image.getPlanes()[0].getPixelStride(),  // Y pixel stride
            image.getPlanes()[1].getPixelStride(),  // U/V pixel stride
            image.getPlanes()[0].getRowStride(),    // Y row stride
            image.getPlanes()[1].getRowStride(),    // U/V row stride
            nv21)) {
            return null;
        }
        return nv21;
    }

    public static native boolean yuv420toNv21(
        int imageWidth,
        int imageHeight,
        ByteBuffer yByteBuffer,
        ByteBuffer uByteBuffer,
        ByteBuffer vByteBuffer,
        int yPixelStride,
        int uvPixelStride,
        int yRowStride,
        int uvRowStride,
        byte[] nv21Output);
}
```

JNI code:
```c++
// yuv2rgb-lib.cc JNI code.

namespace {

void yuv420toNv21(int image_width, int image_height, const int8_t* y_buffer,
                  const int8_t* u_buffer, const int8_t* v_buffer, int y_pixel_stride,
                  int uv_pixel_stride, int y_row_stride, int uv_row_stride,
                  int8_t *nv21) {
  // Copy Y channel.
  for(int y = 0; y < image_height; ++y) {
    int destOffset = image_width * y;
    int yOffset = y * y_row_stride;
    memcpy(nv21 + destOffset, y_buffer + yOffset, image_width);
  }

  if (v_buffer - u_buffer == sizeof(int8_t)) {
    // format = nv21
    // TODO: If the format is VUVUVU & pixel stride == 1 we can simply the copy
    // with memcpy. In Android Camera2 I have mostly come across UVUVUV packaging
    // though.
  }

  // Copy UV Channel.
  int idUV = image_width * image_height;
  int uv_width = image_width / 2;
  int uv_height = image_height / 2;
  for(int y = 0; y < uv_height; ++y) {
    int uvOffset = y * uv_row_stride;
    for (int x = 0; x < uv_width; ++x) {
      int bufferIndex = uvOffset + (x * uv_pixel_stride);
      // V channel.
      nv21[idUV++] = v_buffer[bufferIndex];
      // U channel.
      nv21[idUV++] = u_buffer[bufferIndex];
    }
  }
}

}  // nampespace

extern "C" {

jboolean Java_com_example_androidcv_camera_processing_YuvConvertor_yuv420toNv21(
    JNIEnv *env, jclass clazz,
    jint image_width, jint image_height, jobject y_byte_buffer,
    jobject u_byte_buffer, jobject v_byte_buffer, jint y_pixel_stride,
    jint uv_pixel_stride, jint y_row_stride, jint uv_row_stride,
    jbyteArray nv21_array) {

    auto y_buffer = static_cast<jbyte*>(env->GetDirectBufferAddress(y_byte_buffer));
    auto u_buffer = static_cast<jbyte*>(env->GetDirectBufferAddress(u_byte_buffer));
    auto v_buffer = static_cast<jbyte*>(env->GetDirectBufferAddress(v_byte_buffer));

    jbyte* nv21 = env->GetByteArrayElements(nv21_array, nullptr);
    if (nv21 == nullptr || y_buffer == nullptr || u_buffer == nullptr
        || v_buffer == nullptr) {
        // Log this.
        return false;
    }

    yuv420toNv21(image_width, image_height, y_buffer, u_buffer, v_buffer,
               y_pixel_stride, uv_pixel_stride, y_row_stride, uv_row_stride,
               nv21);

    env->ReleaseByteArrayElements(nv21_array, nv21, 0);
    return true;
}

}  // extern "C"
```

I have the split the performance numbers into two part:
1.   Full `toBitmap(..)` method.
2.   `toBitmap(..)` without `toNv21(..)` to show the cost difference.


{:class="styled-table"}
| # | Average | Max | Min
| ------ | ----- | -- | -- |
| Full `toBitmap(..)` | 31.5 ms | 62 ms | 41 ms |
| Without `toNv21(..)`| 24.6 ms | 30 ms | 23 ms |

_Table: The numbers are computed on Pixel 4a for an 8MP (3264x2448) image_


I hope we can make do with these numbers! This is faster than the Java or Native implementation we had in
[How to use YUV (YUV_420_888) Image in Android](https://blog.minhazav.dev/how-to-convert-yuv-420-sp-android.media.Image-to-Bitmap-or-jpeg/).

#### Even faster?
I am fairly sure this can be made much faster by:
1.   Either, a custom RenderScript kernel than can read the three planes in Y, U & V directly.
2.   Faster NEON based implementation of native code.

### Link to full code
<img src="../images/common_takeitall.jpg" style="width: 60%; margin-left: 15%" /> <br>
> Ok fine, take what you came for!


[YUV_420_888 Image to Bitmap using ScriptIntrinsicYuvToRGB — GitHub Gist](https://gist.github.com/mebjas/a3a6b39e7288d23a2fc7188fa883dc5f)

## Performance verdict

Appraoch with **Native YUV 420 --> NV21 byte[] is faster that java or direct native implementations**. 
See [How to use YUV (YUV_420_888) Image in Android](https://blog.minhazav.dev/how-to-convert-yuv-420-sp-android.media.Image-to-Bitmap-or-jpeg/) for more numbers.


{:class="styled-table"}
| # | Average | Max | Min | Comparison |
| ------ | ----- | -- | -- | -- |
| Pure Java approach | 353 ms | 362 ms | 334 ms | 11.2x slower |
| Standard Native approach | 89.5 ms | 91 ms | 88 ms | 2.8x slower |
| ScriptIntrinsicYuvToRGB approach | 31.5 ms | 62 ms | 41 ms | NA |

_Table: The numbers are computed on Pixel 4a for an 8MP (3264x2448) image. There are potential faster native approaches not included here._

But the GPU implementation using Vulcan or NEON extensions could be faster. I plan to do this full investigation soon.
(I'll update this article).

## Just FYI, RenderScript is being deprecated in Android S (Android 12)
> What why? I just learned about it `:(`
>
> And why the hell, did you just explain the whole stuff?
>
>
> Relax, read more below first!

With Android S (Android 12), the team seems to have announced deprecation of RenderScript for following reasons in
[the blog post](https://android-developers.googleblog.com/2021/04/android-gpu-compute-going-forward.html):

-   RenderScript was introduced to allow developers to run computationally intensive code on CPU/GPU without making use of NDK or GPU specific APIs. It was abstracted by RenderScript.
-   With Android's evolution, NDK and GPU libraries using OpenGL have significantly improved. They give low level access to GPU hardware buffers and RenderScript no longer seems the most optimal way to accomplish the most performance critical tasks.
-   Your current RenderScript will continue to work on existing devices, it would still compile for Android but on future Android devices, the internal implementation may be CPU only.
-   Android team seems to have written a toolkit for migrating core intrinsics in RenderScript to highly optimized C++ implementations — [android/renderscript-intrinsics-replacement-toolki](https://github.com/android/renderscript-intrinsics-replacement-toolkit/blob/main/README.md)

> I'll try out the intrinsic example by Android team and write about it!

**If you know of a faster way** to get this done with RenderScript or with other APIs in Android please let me know in the comment section.

## References
1.  [RenderScript — Android documentation](https://developer.android.com/guide/topics/renderscript/compute)
2.  [C99 language — Wikipedia](https://en.wikipedia.org/wiki/C99)
3.  [How to use YUV (YUV_420_888) Image in Android](https://blog.minhazav.dev/how-to-convert-yuv-420-sp-android.media.Image-to-Bitmap-or-jpeg/)
4.  [What are intrinsics? — StackOverflow](https://stackoverflow.com/questions/2268562/what-are-intrinsics)
5.  [RenderScript depreciation — Google Blog](https://android-developers.googleblog.com/2021/04/android-gpu-compute-going-forward.html)
6.  [RenderScript migration — Android documentation](https://developer.android.com/guide/topics/renderscript/migrate)

## Attributions
1.  [People vector created by freepik — www.freepik.com](https://www.freepik.com/vectors/people)