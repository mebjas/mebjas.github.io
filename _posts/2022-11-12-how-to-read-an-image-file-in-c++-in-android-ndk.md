---
layout: post
title: How to read an image file in C++ in Android with NDK
categories: [android, c++, ndk, file, image, image-processing]
description: "Software development in Android can be done using the Java SDK or Native Development Kit aka NDK made available by Android Open Source Project (AOSP). NDK is often used for writing high performance code like image processing algorithms. There may be times when you would want to load image from disk.<br> <br> In this article I'll cover how to read an image file in C++ with NDK and JNI. The approach can in general be used to load any file in native layer."
post-no: 42
toc: true
image: '../images/posts/post42/header.jpg'
author: Minhaz
author_url: https://medium.com/@minhazav
---

<div class="blog-image-container"><div class="image"><img src="../images/posts/post42/header.jpg"></div><div class="caption">Photo by <a href="https://unsplash.com/@olafval" target="new">Olaf Val</a> on <a href="https://unsplash.com/photos/UTk9cXzYWAg" target="new">Unsplash</a>.</div></div>


Software development in Android can be done using the Java SDK or [Native Development Kit aka NDK](https://developer.android.com/ndk) made available by Android Open Source Project (AOSP). NDK is often used for writing high performance code like image processing algorithms.

Many apps have requirements to read files from disk. For reading image files, the usual approach is to read files using Java APIs that are available in Android SDK or use higher level abstractions like MediaStore APIs. I won't cover reading different file formats in Java layer in this article.

Sometimes, there maybe need to process the image files in native layer (C++). In such cases the usual approach is to

-   Load the image as a [Bitmap](https://developer.android.com/reference/android/graphics/Bitmap).
-   Marshall it to the native layer with JNI.
-   Do read / write operations in the native layer.

However, under certain circumstances you may want to read the image directly in the native layer. If you have such circumstances - this article is for you!

> FYI, When I say "native layer" or "native code" it means in C++ code. I may use
> these terms interchangeably in the article.

Also, while the article is primarily about reading image files in C++ - the concepts can easily be extrapolated to **reading any file format in native layer in Android**.

--- 

Before getting started with steps and code examples, there is yet another elephant in the room that needs to be addressed.

> Why read the image in native layer to begin with?

I'll cover it after the "how part".

> I have been told not everyone is interested in the why part that usually I go on about.
>
> By my wife (-_-)!
>
> Please let me know if that is indeed the case.

## How to read image in native layer

If you are reading this article I expect you to be familiar with concepts like fundamentals of Android development, NDK, Java Native Interface (JNI) et cetera.

I hope you are also familiar with scoped storage concepts in Android.

> Basically for improved protection to app and user data on external storage Android has tightened how applications can access files on Android. TL;DR; is without asking excessive permissions you cannot access files directly anymore. This is good for users! Good thing is you can still ask user to grant permissions to specific files like by using a file picker.

So we don't use `File` anymore. It's more scalable to deal with [Uri](https://developer.android.com/reference/android/net/Uri) in Android.

Let's start with reading image file's [Uri](https://developer.android.com/reference/android/net/Uri).

### Get Uri of image to read

You can get [Uri](https://developer.android.com/reference/android/net/Uri) of a file using [Mediastore](https://developer.android.com/reference/android/provider/MediaStore) APIs or by using file picker kind of UI.

A simple image picker can be implemented in an `Activity` like this

```java
public class MainActivity extends AppCompatActivity {

  private final ActivityResultLauncher<String[]> galleryActivityLauncher
      = registerForActivityResult(new ActivityResultContracts.OpenDocument(),
     this::onPickImage);

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    setContentView(R.layout.activity_main);
  }

  // Assuming this is called on clicking a button or something.
  public void pickImage(View unused) {
    galleryActivityLauncher.launch(new String[]{"image/*"});
  }

  private void onPickImage(Uri imageUri) {
    // TODO: Load the selected image from URI.
  }
}
```

For the rest of this article, I'll assume that you have the [Uri](https://developer.android.com/reference/android/net/Uri) in hand.

Next step is to get file descriptor from this [Uri](https://developer.android.com/reference/android/net/Uri).

### Get file descriptor from Uri
In Unix and Unix like OS, a file descriptor (FD) is a unique identifier for a file or other IO resource like a pipe or network socket. They typically have non negative integer values. Negative values used as error values.

In Android we can use the [Uri](https://developer.android.com/reference/android/net/Uri) to get corresponding [AssetFileDescriptor](https://developer.android.com/reference/android/content/res/AssetFileDescriptor) and use it to open the file in Java layer and get it's `FD` value. Once we get the native `FD` value we can marshall this tiny integer value to the native layer via JNI for reading the file directly.

**Important** In this kind of approach, where the resource is opened by the Java layer and consumed by the Native layer, make sure that

-    Java layer continues to own the file, i.e. the native layer shouldn't close the file stream.
-    Java layer continues to keep the file open until the native layer has read the file or no longer require the file to be open.

Breaking these rules can lead to unexpected race conditions.

Here's how you'd get the native `FD` in Java layer

```java
Context context = getApplicationContext();
ContentResolver contentResolver = context.getContentResolver();
try (AssetFileDescriptor assetFileDescriptor
    = contentResolver.openAssetFileDescriptor(imageUri, "r")) {
    ParcelFileDescriptor parcelFileDescriptor = assetFileDescriptor.getParcelFileDescriptor();
    int fd = parcelFileDescriptor.getFd();

    // TODO: Read file using the fd in native layer.
    // Important: Native layer shouldn't assume ownership of this fd and close it.

    parcelFileDescriptor.close();
} catch (IOException ioException) {
    // TODO: Handle failure scenario.
}
```

### Marshall the FD value to native layer via JNI
For the rest of the content, I expect the readers to be familiar with

-    Setting up JNI with Android.
-    Basics of JNI in Android.

> JNI stands for Java Native Interface - [Reference to hello-jni sample from Android](https://developer.android.com/ndk/samples/sample_hellojni).

So for reading a file in native layer, we need a basic Java library and corresponding JNI file. Here's example of Java library

```java
/** Wrapper class for loading image in native layer. */
public final class NativeImageLoader {

    static {
        System.loadLibrary("image-loader-jni");
    }

    /** Reads the image represented by {@code fd} in native layer.
     *
     * <p>For apparently no reason!
     *
     * @return Some information about the file.
     */
    public static native String readFile(int fd);
}
```

And let's say we have a corresponding JNI file called `image-loader-jni.cc` that is baked into the `libimage-loader-jni.so` binary created by building the JNI build targets.

```c++
// image-loader-jni.cc

#include <jni.h>

// Corresponding to NativeImageLoader class in
// dev.minhazav.samples package.
extern "C" JNIEXPORT jstring JNICALL
Java_dev_minhazav_samples_NativeImageLoader_readFile(
    JNIEnv* env, jclass, jint fd) {
    if (fd < 0) {
        return env->NewStringUTF("Invalid fd");
    }

    // TODO: read the image.

    return env->NewStringUTF("Dummy string");
}
```

### Read the file in native layer
> And return some information about the file

There are multiple ways to handle this. I'll list two of them

#### Read image with Image decoder in NDK
NDK has [ImageDecoder](https://developer.android.com/ndk/guides/image-decoder) API which can be used to read images in different formats like JPEG, PNG, GIF, WebP etc. 

**Pros**
-   It's part of NDK, so you can
    -   Skip hassle of adding another third party native dependency to your project.
    -   Get implicit APK size reduction, by not adding third party libraries.
    -   Since it's part of the platform, you get critical updates for free (without updating on your side).
-   Support for several image formats and allow decoding arbitrary files opaquely.

**Cons**
-   This was added in API level 30. So you can only target devices above this version!
-   Similar to Bitmap, decodes images to one of the `Bitmap` formats ([examples](https://developer.android.com/ndk/reference/group/bitmap#androidbitmapformat)). By default the image is decoded in `ARGB_8888` format (4 bytes per pixel).
-   It's an opaque library, you cannot feed in your decoder for certain file format.

Here's how you could use it to read the image and return back some information back to Java layer.

> I could have added the example doing everything in JNI code itself. But this is not stone age and we aren't that kind of people.
>
> We love some structure in our code. So let's write a new library called 'Image'.

```c++
// image.h
#include <memory>

#include <assert.h>
#include <android/imagedecoder.h>

// Data class for ARGB image (owns the memory associated with the image).
// 
// Note for readers: Current implementation only allows read operations but can
// be extended to support write operations by overloading `()=` operator.
class Image {
public:
    friend class ImageFactory;

    // Creating the image will allocate corresponding memory.
    Image(int width, int height, int channels, int stride) :
        width_(width),
        height_(height),
        channels_(channels),
        stride_(stride) {
        // Restricting the image to u8 datatype for this example.
        this->pixels_ = std::make_unique<uint8_t[]>(width * height * channels);
    }

    // Getter: Get pixel value of image at (x, y, c).
    uint8_t operator()(int x, int y, int c) const {
        // TODO: add assertions? (at your own risk).
        uint8_t* pixel = this->pixels_.get() + (y * stride_ + x * 4 + c);
        return *pixel;
    }

    int width() const { return this->width_; }
    int height() const { return this->height_; }
    int channels() const { return this->channels_; }
    int stride() const { return this->stride_; }

private:
    void* pixels() {
        return static_cast<void*>(this->pixels_.get());
    }

    std::unique_ptr<uint8_t[]> pixels_;
    const int width_;
    const int height_;
    const int channels_;
    const int stride_;
};


// Factory class for creating 'Image'.
class ImageFactory {
public:

    // Creates an instance of 'Image' from the file descriptor 'fd'.
    //
    // Will return 'nullptr' if it's unable to decode image successfully.
    //
    // Note for readers: If you can add abseil package to your code base, I
    // recommend changing this API to return
    // 'absl::StatusOr<std::unique_ptr<Image>>' instead. This will lead to much
    // cleaner API and improved error handling.
    static std::unique_ptr<Image> FromFd(int fd);
}
```

Next let's implement the logic to decode the image from `fd`. This shall be
implemented in `image.cc` under `ImageFactory#FromFd(..)`.

```c++
// image.cc
#include "image.h"

#include <android/imagedecoder.h>

static std::unique_ptr<Image> ImageFactory::FromFd(int fd) {
    // First create decoder from fd.
    AImageDecoder* decoder;
    int result = AImageDecoder_createFromFd(fd, &decoder);
    if (result != ANDROID_IMAGE_DECODER_SUCCESS) {
        // More info: https://developer.android.com/ndk/reference/group/image-decoder#aimagedecoder_createfromfd
        // Not a good idea to opaquely consume the error, it'd be a good idea to
        // use StatusOr from abseil package: https://abseil.io/
        return nullptr;
    }

    // Lambda for cleaning up the decoder when exiting.
    auto decoder_cleanup = [&decoder] () {
        AImageDecoder_delete(decoder);
    };

    const AImageDecoderHeaderInfo* header_info = AImageDecoder_getHeaderInfo(decoder);
    int bitmap_format = AImageDecoderHeaderInfo_getAndroidBitmapFormat(header_info);
    // This is just for example. I don't want to handle other cases in this
    // example, but that should be easy enough to do.
    if (bitmap_format != ANDROID_BITMAP_FORMAT_RGBA_8888) {
        decoder_cleanup();
        return nullptr;
    }
    constexpr int kChannels = 4;
    int width = AImageDecoderHeaderInfo_getWidth(header_info);
    int height = AImageDecoderHeaderInfo_getHeight(header_info);

    size_t stride = AImageDecoder_getMinimumStride(decoder);
    std::unique_ptr<Image> image_ptr = std::make_unique<Image>(
        width, height, kChannels, stride);

    size_t size = width * height * kChannels;
    int decode_result = AImageDecoder_decodeImage(
        decoder, image_ptr->pixels(), stride, size);
    if (decode_result != ANDROID_IMAGE_DECODER_SUCCESS) {
        decoder_cleanup();
        return nullptr;
    }

    decoder_cleanup();
    return image_ptr;
}
```

And now use this library in the JNI and read the image from `fd`.

```c++
// image-loader-jni.cc

#include <string>
#include <jni.h>

#include "image.h"

extern "C" JNIEXPORT jstring JNICALL
Java_dev_minhazav_samples_NativeImageLoader_readFile(
    JNIEnv* env, jclass, jint fd) {
    if (fd < 0) {
        return env->NewStringUTF("Invalid fd");
    } 

    std::unique_ptr<Image> image = ImageFactory::FromFd(fd);
    if (image == nullptr) {
        return env->NewStringUTF("Failed to read or decode image.");
    }

    // Return file info as string.
    std::string message = "Image load success: Dimension = "
        + std::to_string(image->width()) + "x" + std::to_string(image->height())
        + " Stride = " + std::to_string(image->stride());
    return env->NewStringUTF(message.c_str());
}
```

Some more pointers:

-    You can use APIs like [AImageDecoder_setTargetSize](https://developer.android.com/ndk/reference/group/image-decoder#aimagedecoder_settargetsize) to read rescaled image directly.
-    Similarly, you can use API like [AImageDecoder_setCrop](https://developer.android.com/ndk/reference/group/image-decoder#group___image_decoder_1gaf281588607767ff1232c704c7f7d57ec) to crop before consumption.

Although, in practice I found [AImageDecoder_setTargetSize](https://developer.android.com/ndk/reference/group/image-decoder#aimagedecoder_settargetsize) to be slower than I'd expect a down-sampling operation to be. If the performance of this API concerns you and you have other approach in hand, try loading the full resolution image and down-sampling `Image` separately.

---
With the solution so far, you can get a working version of image decoding in native layer.

Reasons to read further:

-   You want to decode image in native layer but you have lot of customers using Android <= API 30.
-   You want to read something other than an image.
-   You have custom & better decoder of your own.
-   You are a curious reader, you knowledge hog!
-   We sill have the pending Mr. Elephant in the room to address.

---

#### Read image with custom decoders

The following approach can be used to **read any file using `fd` value** and then
you can use your own decoder to decode the image.

For the purpose of this example, I'll assume you have some decoder of your own
and it's implemented underneath `ImageFactory` implementation. Let's assume an
interface.

```c++
class ImageFactory {
public:

    // Decodes the `image_buffer` and returns Image instance.
    //
    // Suggestion for readers: Use absl::string_view instead of string here.
    static std::unique_ptr<Image> FromString(const std::string& image_buffer);
}
```

**Reading file the Unix way!**

For this approach, before even going into the native layer details, we need two
additional information from the java layer.

1.   `start offset` of the `fd` (Very likely `0` unless you don't want to read the file from beginning). You can get this using [AssetFileDescriptor#getStartOffset()](https://developer.android.com/reference/android/content/res/AssetFileDescriptor#getStartOffset()) API.
2.   `length` of the file. You can get this using [AssetFileDescriptor#getLength()](https://developer.android.com/reference/android/content/res/AssetFileDescriptor#getLength()) API.

After you get this info in the Java layer, marshall it to the native layer via JNI. For
the following example I'll assume you want to decode an image file and your decoder can handle it.

```c++
// In the JNI (image-loader-jni.cc)

// Read the image
std::unique_ptr<Image> image = nullptr;
{
    std::string image_buffer;
    image_buffer.resize(fd_length);
    int remaining_length = read(fd, &image_buffer[0], length);
    if (remaining_length != 0) {
        return env->NewStringUTF("Failed to read full image");
    }

    image = ImageFactory::FromString(image_buffer);
}
```

If your decoder supports buffered data, you could read the image file in buffers
as well, with the approach above.

## Why you should read the file in native layer (or shouldn't)

<div class="blog-image-container"><div class="image"><img src="../images/posts/post42/stable-diffusion-elephant2.jpeg" alt="Elephant in the room"></div><div class="caption">Elephant in the room - Image generated by Author using <a href="https://huggingface.co/spaces/stabilityai/stable-diffusion">stable-diffusion</a>.</div></div>

Well, why you may want to read the file in native layer instead of Java layer is
your problem.

However, I would like to demystify a few misconception based on my experience using examples of different use-cases.

### Consuming image in native layer
If your concern is high latency of reading or decoding image in Java layer.. Note that Android Java SDK also comes with [ImageDecoder also have a Java API](https://developer.android.com/reference/android/graphics/ImageDecoder)  which is likely backed by the same native implementation. You can use these APIs to read images as [Drawable](https://developer.android.com/reference/android/graphics/drawable/Drawable) or [Bitmap](https://developer.android.com/reference/android/graphics/Bitmap).

For any kind of post-processing you might want to do in the native layer, you can easily marshall `Bitmap` reference to the native layer. NDK has good support for [Bitmap](https://developer.android.com/ndk/reference/group/bitmap) and it allows you to process them between Java and Native with little overhead.

> I plan to write more about it in a separate article.

You might not get latency benefit by using `ImageDecoder` in the native layer as compared to the Java layer. You may get latency benefits if you have some decoder implementation that can handle decoding faster that what NDK library does.

One valid reason to still read the file in native layer might be to get rid of holding nasty `Bitmaps` in Java layer when you don't need to. 

For example if you just want to read an image, do some post processing, encode it as jpeg and save to disk - you can avoid holding a `Bitmap` reference in Java.

I have often found holding large `Bitmaps` can lead to visible performance issues likely because we have to rely on GC to reclaim the memory held by `Bitmap` when they are no longer referenced. GC may not always work in predictable fashion. However, [Bitmap#recycle()](https://developer.android.com/reference/android/graphics/Bitmap#recycle()) API might help you with this as well.

### Avoiding marshalling of file data across JNI boundary
It's a good idea to use native approach if

You need to read alternative file format and you have your custom decoder implementation for it. This way you can avoid first reading it in the Java layer as `String` and later marshalling it to the native layer via JNI.

I am not 100% sure how exactly data marshalling works across Java Native boundary but it is [#1 tip around JNI by Android developer website](https://developer.android.com/training/articles/perf-jni#general-tips) to avoid marshalling large data.

It "might" be more performant to pass `fd` to native layer instead.

### Consume C++ only libraries
This is similar to the point above. If you have third party libraries for decoding your image or custom file format which doesn't come in Java variant or the pure Java variant is less performant - it'd be a good idea to use the shared approach.

### You like C++ more than Java

> No comments, I hear you! Do as you see fit - for this world is thy canvas!

## References
-    [File descriptor - Wikipedia](https://en.wikipedia.org/wiki/File_descriptor)
-    [AssetFileDescriptor - Android documentation](https://developer.android.com/reference/android/content/res/AssetFileDescriptor)
-    [Reference to hello-jni sample from Android](https://developer.android.com/ndk/samples/sample_hellojni)
-    [NDK guide on ImageDecoder](https://developer.android.com/ndk/guides/image-decoder)
-    [JNI tips by Android developer website](https://developer.android.com/training/articles/perf-jni#general-tips)


## Appendix

Some more resources in case you get stuck at any of these steps.

### fatal error: 'imagedecoder.h' file not found
> So you stumbled upon this too! If you spent a lot of hours at this, let me know over comments as I did too! Let's share the misery :)

There can be a couple of reasons why you are facing this.

**1. You didn't like the right target library**

If you are using `CMake` based approach, add `jnigraphics` to `target_link_libraries`.

In the above example, it would look like

```c++
target_link_libraries( # Specifies the target library.
    image-loader-jni

    ${log-lib}
    jnigraphics)
```

**2. You didn't include it right**

> This is what I didn't realize.

The library path is `android/imagedecoder.h` and not `imagedecoder.h`. So include correctly

```c++
#include <jni.h>
#include <android/imagedecoder.h>
```

If this doesn't help either, make sure you are targeting min SDK version to be >= 30.


## Image license
Image generated using stable diffusion is free to use under [CreativeML Open RAIL-M](https://huggingface.co/spaces/CompVis/stable-diffusion-license) by [huggingface.co](https://huggingface.co/spaces/stabilityai/stable-diffusion).