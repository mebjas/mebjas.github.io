---
layout: post
title: How to write Image to ImageWriter in Android
categories: [android, java, Image, ImageWriter, Camera2, JPEG, YUV_420_888]
description: "Android framework provides ImageWriter class as a way for applications to produce Image data int a Surface which can then be consumed by other components like CameraDevice. I found a couple of hiccups while trying to write jpeg images to ImageWriter buffers and found that there is scarce documentation around this out in the wild. In this article I'll share briefly on how to write jpeg images or YUV images to ImageWriter in Android."
post-no: 43
toc: true
image: '/images/unsplash/google-android.jpg'
wip: false
---


<div class="blog-image-container"><div class="image"><img src="../images/unsplash/google-android.jpg"></div><div class="caption">Photo by <a href="https://unsplash.com/@rmrdnl" target="new">
Daniel Romero</a> on <a href="https://unsplash.com/photos/yp-BBMj_4wM" target="new">Unsplash</a>.</div></div>


Android framework provides `ImageWriter` class as a way for applications to produce Image data int a `Surface` which can then be consumed by other components like `CameraDevice`. I found a couple of hiccups while trying to write jpeg images to `ImageWriter` buffers and found that there is scarce documentation around this out in the wild. In this article I'll share briefly on how to write jpeg images or YUV images to ImageWriter in Android.

Here are steps to get `Image` from `ImageWriter` and writing image data to it.

## Create ImageWriter and dequeue Image
I'll assume you have some output [Surface](https://developer.android.com/reference/android/view/Surface) to create an `ImageWriter`.

With that you can create a new `ImageWriter` instance using [newInstance()](https://developer.android.com/reference/android/media/ImageWriter#newInstance(android.view.Surface,%20int,%20int)) API.

```java
int maxImages = 2;
int format = ImageFormat.JPEG;
// ^ replace this with other formats based on your needs.
// All formats: https://developer.android.com/reference/android/graphics/ImageFormat

ImageWriter imageWriter = ImageWriter.newInstance(outputSurface, maxImages, format);
```

**Important** The size of the image is controlled by the Surface that is provided by the consumer. 

Now dequeue an image form it when you need to write publish an image.

```java
Image outputImage = imageWriter.dequeueInputImage();
```

**Important** This call will block if there is no available buffer in the `imageWriter` so be cautious about the needs of
your applications and set the `maxImages` accordingly. If you want to keep track of the available buffers you can subscribe to [onImageReleased()](https://developer.android.com/reference/android/media/ImageWriter.OnImageReleasedListener#onImageReleased(android.media.ImageWriter)) callback on `ImageWriter` object.
This will be called when the consumer releases the buffer.

## Write to the Image
Once you have the `Image` the next step would be writing to it. How to write to
the `Image` depends on the image format. For example

-   If you are writing data of `YUV_420_888` format, you'd have to write to three different `ByteBuffer`s.
-   If you are writing dat of `JPEG` format, you only need to write to single buffer. 

Across formats the common part is to get the `ByteBuffer` from the image and then put data to it.

### Writing YUV_420_888

For this image format, you need to write to three planes, one each for `Y`, `U` and `V`. You can get the `ByteBuffer` and strides using these apis.

```java
if (outputImage.getFormat() != ImageFormat.YUV_420_888) {
    fail(); // assuming you have some way to fail.
}

Image.Plane[] planes = outputImage.getPlanes();
if (planes.length != 3) {
    fail(); // this should almost never happen as it's guaranteed by the format.
}


ByteBuffer yBuffer = planes[0].getBuffer();
yBuffer.position(0);
int yRowStride = planes[0].getRowStride();
int yPixelStride = planes[0].getPixelStride();

ByteBuffer uBuffer = planes[1].getBuffer();
uBuffer.position(0);
ByteBuffer vBuffer = planes[2].getBuffer();
vBuffer.position(0);
int uvRowStride = planes[1].getRowStride();
int uvPixelStride = planes[1].getPixelStride();

// .. rest of writing
```

Once you have these information, you can write the YUV data to buffers directly in Java layer or in Native layer, depending on where you have the data handy and your expertise. I don't have end to end code about writing `YUV_420_888` format in hand but you can take inspiration form this article.


<div class="embedded-post">
    <div class="embedded-post-title">
        <a href="https://blog.minhazav.dev/how-to-convert-yuv-420-sp-android.media.Image-to-Bitmap-or-jpeg/">
        How to use YUV (YUV_420_888) Image in Android
        </a>
    </div>
<a href='https://developer.android.com/reference/android/graphics/ImageFormat#YUV_420_888' target='new'>ImageFormat#YUV_420_888</a> is one of the most common image format supported by Android Cameras. It's a multi-plane YUV (YCbCr) format represented by three separate planes in <a href='https://developer.android.com/reference/android/media/Image' target='new'>android.media.Image</a>. This format can be used for processing the input frames before saving to disk or some other action. A very common question around YUV is how to consume it in Android. In this article, I'd describe different ways it can be used. The most common question is <b>how to convert YUV to Bitmap or jpeg format in Android?</b>
</div>

Let me know over comments, if you would like to have full code examples for this problem or if you have full code example yourself, I am happy to add a pointer here.

### Writing Jpeg

Writing JPEG is easier. I'll assume you somehow have the jpeg data in `byte[]` format in Java. You can do similar stuff in native layer (take inspiration from the link above).

```java
byte[] jpegData = getJpegDataSomeHow();
int inputLength = jpegData.length;

if (outputImage.getFormat() != ImageFormat.JPEG) {
    fail("Invalid format"); // assuming you have some way to fail.
}

Image.Plane[] planes = outputImage.getPlanes();
if (planes.length != 1) {
    fail("Expected image to have single plane.");
    // ^ this should almost never happen as it's guaranteed by the format.
}

ByteBuffer jpegBuffer = planes[0].getBuffer().duplicate();
jpegBuffer.position(/* newPosition= */ 0);
// Note that duplicate() API doesn't duplicate the data but just the buffer.
int jpegBufferCapacity = jpegBuffer.remaining();

if (jpegBufferCapacity < inputLength) {
    fail("outputImage doesn't have enough size to write the jpeg data");
}

jpegBuffer.put(jpegData, /* offset= */ 0, inputLength);
jpegBuffer.position(/* newPosition= */ 0);
jpegBuffer.limit(bytesRemaining);
```

> **Important**: Be careful while writing jpeg data.

Since the size of JPEG images cannot be determined, the usual industry practice is to create buffers of same size that a `YUV_420_888` image of same dimension would take. For an image with `WIDTH` and `HEIGHT` dimensions it's usually computed as

```
SIZE = WIDTH * HEIGHT * 1.5;
```

`1.5` because `YUV_420_888` requires `1.5 bytes per pixel` storage.

> I know this is storage wastage but what else can be done? We want to reuse the memory buffers instead of creating them on the fly for the camera use-cases particularly when the buffers are shared across processes. 

This is why we need to update the limit of the output buffer so the consumer can read only the relevant data and not any garbage data that might be present in the buffer from former reads.

## Put the image back to queue or discard
The final step is to put this image back to the `imageWriter` for consumption. This can be done as

```java
imageWriter.queueInputImage(outputImage);
```

This will queue the `outputImage` back to imageWriter and will make it available for downstream consumers to read. This must of course be the same image that was dequeued form this `imageWriter`.

Or for some reason you want to discard the `outputImage` just call `outputImage.close()`. This should free up the buffer as well.

## References
-    [ImageWriter - Android documentation](https://developer.android.com/reference/android/media/ImageWriter)
-    [Surface - Android documentation](https://developer.android.com/reference/android/view/Surface)
