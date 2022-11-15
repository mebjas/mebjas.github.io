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
wip: true
---

<div class="blog-image-container"><div class="image"><img src="../images/posts/post42/header.jpg"></div><div class="caption">Photo by <a href="https://unsplash.com/@olafval" targer="new">Olaf Val</a> on Unsplash.</div></div>


Software development in Android can be done using the Java SDK or [Native Development Kit aka NDK](https://developer.android.com/ndk) made available by Android Open Source Project (AOSP). NDK is often used for writing high performance code like image processing algorithms. There may be times when you would want to load image from disk.

The usual approach available on internet is to

-   Load the image as a [Bitmap](https://developer.android.com/reference/android/graphics/Bitmap).
-   Marshall it to the native layer with JNI.
-   Do read / write operations in the native layer.

There maybe times you want to read the image directly in the native layer.

> When I say "native layer" it means in C++ code.

In this article I'll cover how we can read an image or any file format in native layer directly with the modern Android constructs and best practices in place.

There is ofcourse an open question of 

> Why read the image in native layer to begin with?

I'll cover it after the "how part".

> I have been told not everyone is interested in the why part that I go on about. Not by my fellow readers but my wife. Please let me know if that is indeed the case.

## How to read image with NDK?

If you are reading this article I expect you to be familiar with concepts like fundamentals of Android development, NDK, Java Native Interface (JNI) et cetera.

I hope you are also familiar with scoped storage concepts in Android.
> TODO(minhazav): More on this later.

This is why it's more scalable to deal with [Uri](https://developer.android.com/reference/android/net/Uri). Let's start with reading file [Uri](https://developer.android.com/reference/android/net/Uri) first.

### Read image as Uri
Unlike earlier versions of Android, you can no longer directly access files in any directory on the device. Instead you can get [Uri](https://developer.android.com/reference/android/net/Uri) of the file using [Mediastore](https://developer.android.com/reference/android/provider/MediaStore) APIs or by using file picker. The latter is better because you'd don't need to add extra read permissions like `READ_EXTERNAL_STORAGE` (this is not needed after API 33 though).

A simple image picker can be handled in the activity like this

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

For the rest of this article, I'll assume that you have the [Uri](https://developer.android.com/reference/android/net/Uri) in the manner I described or in some other ways. Later I'll also cover some default Java approaches to load images from disk based on usecases.

### Get file descriptor from Uri
In Unix and Unix like OS, a file descriptor (FD) is a unique identifier for a file or other IO resource like a pipe or network socket. They typically have non negative integer values. Negative values used as error values.

In Android we can use the [Uri](https://developer.android.com/reference/android/net/Uri) to get [AssetFileDescriptor](https://developer.android.com/reference/android/content/res/AssetFileDescriptor) and use it to open the file in Java layer and get it's `FD` value. Once we get the native `FD` value we can marshall it to native layer via JNI for reading the file directly.

> **Important** In this case the Java layer should continue to own the file and hence the native layer shouldn't close the file. Similarly, it's important the Java layer doesn't close the file while it's being accessed by the native layer. Make sure the resources in Java layer holding the file aren't getting GCed while they are necessary.

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
    // TODO: Handle failure scenario
}
```

### Marshall the FD value to native layer via JNI
For the rest of the content, I expect the readers to be familiar with

-    Setting up JNI with Android
-    Basics of JNI in Android

So for reading a file in native layer, we need a skeleton of Java API and corresponding JNI file

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

And let's say we have a `image-loader-jni.cc` file baked into the `libimage-loader-jni.so` binary created by building the native libraries.

```c++
// image-loader-jni

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

Well, turns out there are several ways to go about it from here.

#### Read image with Image decoder in NDK
NDK has `ImageDecoder` API which can be used to read images of different formats like JPEG, PNG, GIF, WebP etc.

**Pros**
-   It's part of NDK, so you can leverage it without adding extra libraries to your project.
-   Same as above, but it also means lower APK size.
-   Support for several image formats and image format detection opaquely handled.
-   Since it's part of platform, you get critical updates for free.

**Cons**
-   Most of the relevant APIs were added in API 30 onwards :)
-   Similar to Bitmap, decodes images to one of the `Bitmap` formats ([examples](https://developer.android.com/ndk/reference/group/bitmap#androidbitmapformat)). By default the image is decoded in `ARGB_8888` format (4 bytes per pixel).

Here's how you could use it to read the image and return back some information back to Java layer.

> I could have written it all in the JNI itself, but, let's agree - we are not that kind of people.
> 
> We love some structure in our code. So let's write a new library called 'image'.

```c++
// image.h
#include <memory>

#include <assert.h>
#include <android/imagedecoder.h>

// Holds image data and associated info.
// Current implementation only allows read operations but can be extended to 
// support write operations.
class Image {
public:
    friend class ImageFactory;

    Image(int width, int height, int channels, int stride) :
        width_(width),
        height_(height),
        channels_(channels),
        stride_(stride) {
        this->pixels_ = std::make_unique<uint8_t[]>(width * height * channels);
    }

    // Get pixel value of image at (x, y, c).
    uint8_t operator()(int x, int y, int c) const {
        assert(c >= 0 && c < 4);
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

    // Creates an instance of 'Image' from file descriptor 'fd'.
    //
    // Will return 'nullptr' if it's unable to decode image successfully.
    //
    // Not the best design, but livable. If you got this code from someone nicer
    // they'd have returned 'absl::StatusOr<Image'> instead.
    static std::unique_ptr<Image> FromFd(int fd);
}
```

`ImageFactory#FromFd(..)` will hold the code you have been looking for.

```c++
// image.cc
#include "image.h"

#include <android/imagedecoder.h>

static std::unique_ptr<Image ImageFactory::FromFd(int fd) {
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

    int min_stride = AImageDecoder_getMinimumStride(decoder);
    int width = AImageDecoderHeaderInfo_getWidth(header_info);
    int height = AImageDecoderHeaderInfo_getHeight(header_info);

    constexpr int kChannels = 4;
    std::unique_ptr<Image> image_ptr = std::make_unique<Image>(
        width, height, kChannels, min_stride);

    size_t stride = min_stride;
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

And now include this library in the JNI and read the image from `fd`.

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
    std::string message = "Image load success: Dimension = "
        + std::to_string(image->width()) + "x" + std::to_string(image->height())
        + " Stride = " + std::to_string(image->stride());
    return env->NewStringUTF(message.c_str());
}
```

Some more pointers:

-    You can use APIs like [AImageDecoder_setTargetSize](https://developer.android.com/ndk/reference/group/image-decoder#aimagedecoder_settargetsize) to read rescaled image directly.
-    Similarly, you can use API like [AImageDecoder_setCrop](https://developer.android.com/ndk/reference/group/image-decoder#group___image_decoder_1gaf281588607767ff1232c704c7f7d57ec) to crop before consumption.

#### Read image with custom decoders

>  I see, so the solution above doesn't work for you. I suppose you have a variety of reasons it. Maybe the cons I stated above were too big for you!

Well it's legitimate issue that there are a lot of devices out there which are running on Android below API 30 and you may want to support such devices. Let's try to read the image the old way.

**Unix way!**

For this approach, we need a little more information from our Java side. Just the start offset and the length of the file descriptor. Once can query it using [AssetFileDescriptor#getStartOffset](https://developer.android.com/reference/android/content/res/AssetFileDescriptor#getStartOffset()) & [AssetFileDescriptor#getLength()](https://developer.android.com/reference/android/content/res/AssetFileDescriptor#getLength()) API respectively. I'll assume that we have marshalled this two info to JNI as well.

The initial code will look a lot simpler than everything you saw above, but it comes with a caveat of it's own. More on that later. As a first step we shall read the file into a string as we don't know the image format. It could be a `JPEG` or `PNG` or some other format.

```c++
// In the JNI (image-loader-jni.cc)

std::string image_buffer;
image_buffer.resize(fd_length);
int remaining_length = read(fd, &image_buffer[0], length);
if (remaining_length != 0) {
    return env->NewStringUTF("Failed to read full image");
}

// Now the encoded image is loaded into 'image_buffer'.
// Decode the string using your image decoder.
```

## References
-    [File descriptor - Wikipedia](https://en.wikipedia.org/wiki/File_descriptor)

## Appendix

Here's a bunch of more resources in case you get stuck at any of these steps.

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

