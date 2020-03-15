---
layout: post
title: Memory sharing in Linux with MMAP
categories: [android, linux, memory, shared memory, mmap, munmap, malloc]
description: "MMAP is a UNIX system call that maps files into memory. It's a method used for memory-mapped file I/O. It brings in the optimization of lazy loading or demand paging such that the I/O or reading file doesn't happen when the memory allocation is done, but when the memory is accessed. <br>In this article, I'll be explaining how what mmap is and how it can be used for sharing memory in Linux. It kind of is the backbone of shared memory in Android."
post-no: 15
toc: true
image: '../images/post15_image1.jpg'
---

`MMAP` is a UNIX system call that maps files into memory. It's a method used for memory-mapped file I/O. It brings in the optimization of `lazy loading` or `demand paging` such that the I/O or reading file doesn't happen when the memory allocation is done, but when the memory is accessed. After the memory is no longer needed it can be cleared with `munmap` call. `MMAP` supports certain flags or argument which makes it suitable for allocating memory without file mapping as well. In Linux kernel, the `malloc` call uses `mmap` with `MAP_ANONYMOUS` flag for large allocations.

In this article, I'll be explaining how what `mmap` is and how it can be used for sharing memory in Linux. It kind of is the backbone of shared memory in Android.

## Arguments and flags
`mmap()` creates a new mapping in the virtual address space of the calling process. If you check out the Linux kernel page for [mmap](http://man7.org/linux/man-pages/man2/mmap.2.html) you'll see several arguments and flags. On the other hand, `munmap()` is used to free the allocated memory.

### MMAP definition

{% highlight c %}
void *mmap(void *addr, size_t length, int prot, int flags, int fd, off_t offset);
{% endhighlight %}

 - The `addr` specifies the starting address of the allocation and if it's passed as `NULL` the kernel chooses the starting address.
 - The `length` argument specifies the length of allocation in bytes and should be `> 0`.
 - The `prot` argument describes the protection level
    - `PROT_EXEC` Pages may be executed.
    - `PROT_READ` Pages may be read. 
    - `PROT_WRITE` Pages may be written. 
    - `PROT_NONE` Pages may be not be accessed.

    The flags can be passed with bitwise OR operator and the default protection level is
    ```
    PROT_EXEC | PROT_READ | PROT_WRITE
    ```
 - The `flags` argument is used to do various customizations, the interesting ones are:
    - `MAP_SHARED` or `MAP_PRIVATE` determines if the pages would be shared across processes or owned by a single process.
    - `MAP_ANONYMOUS` (or `MAP_ANON`) is used to indicate that the pages are not backed by any file and are anonymous. `malloc` could use this flag to create a large memory allocation.
    {% highlight c %}
    // This is not a real implementation but meant for giving an idea
    void *malloc(size_t length) {
        return mmap(
            /* addr= */ NULL, 
            /* length= */ length, 
            /* prot= */ PROT_EXEC | PROT_READ | PROT_WRITE, 
            /* flags= */ MAP_ANONYMOUS, 
            /* fd */ -1, // Passing an invalid file descriptor
            /* offset= */ 0);
    }
    {% endhighlight %}
 - The `fd` indicates the file descriptor that represents the file backing the memory. This is not needed when using `MAP_ANON` flag and can be set to `-1`.
    {% highlight c %}
    // Creating a file backed memory allocation
    struct stat statbuf;
    int fd = open("/some/shared/resource/file", "r");
    fstat(fd, &statbuf);

    // Creating a read only, shared, file backed memory allocation
    int *shared = mmap(
        /* addr= */ NULL,
        /* length= */ statbuf.st_size - 1,
        /* prot= */ PROT_READ,
        /* flags= */ MAP_SHARED,
        /* fd= */ fd,
        /* offset= */ 0);
    {% endhighlight %}
 - The `offset` indicates the offset in bytes from which the file should be read to memory. The allocated memory will load `offset` to `offset + length` bytes from the file when the memory access happens.

### MUNMAP definition
> The `munmap()` system call deletes the mappings for the specified address range and causes further references to addresses within the range to generate invalid memory references.  The region is also automatically unmapped when the process is terminated.  On the other hand, closing the file descriptor does not unmap the region.

```c
int munmap(void *addr, size_t length);
```

 - The `addr` is the address of allocation to free, essentially what you got from calling the `mmap()`. After calling `munmap()`, any access on the memory address shall raise `SIGSEV` errors.
 - The `length` determines the area of memory to clear. The area of memory from `addr` to `addr + length` would be freed on this call.

## Sharing memory with MMAP
`MMAP` can be thought of as the core memory allocation API in Linux and several high-level constructs take advantage of this for providing various features. Linux kernel is the core of Android OS and components like `ASHMEM` uses `MMAP` in its core. `ASHMEM` is used for sharing memory in Android in different components like ContentProviders or Binder IPC.

### Sharing between parent and child
This is fairly simple to visualize. A `mmap` allocation with `MAP_SHARED` flag can be accessed directly by the child process.

{% highlight c %}
int main(void) {
    struct stat statbuf;
    int fp = open("/some/shared/resource/file", "r");
    fstat(fp, &statbuf);

    int *shared = mmap(
        /* addr= */ NULL,
        /* length= */ statbuf.st_size - 1,
        /* prot= */ PROT_READ | PROT_WRITE,
        /* flags= */ MAP_SHARED,
        /* fd= */ fp,
        /* offset= */ 0);

    pid_t child;
    if ((child = fork()) == 0) {
        // process forked. The child can access the 'shared'
        // object and perform read and write operations on it.
    }
}
{% endhighlight %}

This is very helpful in sharing the memory of core components in Android. All applications in Android are forked from a bare-bone process called `Zygote` which loads the core libraries and code required by all applications with `mmap`. `Zygote` is loaded into memory on device boot and when a user attempts to open an application for the first time the system forks `Zygote` and then the application logic is initialized.

### Sharing between siblings
While it's easy to visualize how memory can be shared in ancestry between a parent and child. The logic is very similar but involves Inter-Process Communication (IPC). Two common ways to achieve this could be:

#### Without extra management layer
The concept is similar, the two processes say `Process 1` and `Process 2` can communicate with each other via certain IPC technology.

 - `Process 1` creates a file and allocates memory on that with `MAP_SHARED` flag and appropriate protection level and length. This process can write some data in the allocated memory space.
 - `Process 1` shares this file descriptor with Process 2 via a certain IPC method.
 - `Process 2` receives this file descriptor and calls `mmap` on that. So the system returns the virtual address of the same memory allocation and based on the protection levels set by `Process 1`, `Process 2` can read, write or execute the shared memory pages.

However, these processes are responsible for explicitly deallocating memory, otherwise, it cannot be reused by another process in need of memory.

#### With an extra management layer
In this case, another process acts as the manager of shared memory and exposes interface or methods to allocate or retrieve memory allocations. Let's say there is a memory manager called `XMAN` and exposes APIs like this:

{% highlight c %}
// Hypothetical XMAN APIS
struct Xman_allocation {
    void *addr; // address of allocation
    int fd;     // file descriptor
};

Xman_allocation Xman_allocate(size_t length, int prot);
Xman_allocation Xman_get(int fd);
void Xman_free(Xman_allocation allocation);
{% endhighlight %}

 - `Process 1` could allocate a chunk of memory using `Xman_allocate()` and share the `Xman_allocation.fd` with another process via a certain IPC mechanism.
 - `Process 2` could use `Xman_get()` to get the same allocation and act on it.
 - Any of these processes could use the `Xman_free()` to explicitly free the memory.

While the way of dealing with shared memory seems very similar with or without a manager instance, a centralized manager can abstract some memory freeing techniques thus taking away the expectation of being good citizens from the calling processes like:
 - Freeing memory after use, the Manager can take care of freeing when the calling processes die.
 - Some components like ASHMEM, support features like PINNING and UNPINNING section of memory which allows the consumer process to set which part of memory can be cleared when the system is out of free memory. This protects the consumer apps from being killed by the Low Memory Killer (LMK) when it's reclaiming memory. ASHMEM has its process on deciding which UNPINNED memory to clear when available memory is system goes below a certain threshold.

## MISC: MMAP is faster than reading a file in blocks
While exploring these concepts I was wondering how file-backed memory manages to be performant while file IO operation like `read()` is generally considered much slower than memory operations. There are a few interesting StackOverflow questions like [Why mmap() is faster than sequential IO?](https://stackoverflow.com/questions/9817233/why-mmap-is-faster-than-sequential-io) and [mmap() vs. reading blocks](https://stackoverflow.com/questions/45972/mmap-vs-reading-blocks) which answer this questions pretty well.

> But they won't give you a short answer like - _Because MMAP is magic!_ They are long reads.

I wish I could add a TL;DR; answer to this question here but there isn't one. Both `mmap()` and `read()` have their pros and cons and could be more performant in different situations. While `mmap()` seems like magic, it's simply not.

## Future readings
In the future, I intend to write about what ASHMEM is, how it works, why it was brought when MMAP existed and examples of how it's been used in Android. Another interesting memory manager in Android is the ION memory manager which was added to Linux kernel in 2011 by a patch from Google to solve issues around large memory allocations needed by components like GPU, display, camera, etc.

## References
 - [MMAP - Wikipedia](https://en.wikipedia.org/wiki/Mmap)
 - [mmap and munmap - Linux man pages](http://man7.org/linux/man-pages/man2/mmap.2.html)
 - [ASHMEM - lwn.net](https://lwn.net/Articles/473080/)
 - [CursorWindor soruce code - ASHMEM usage in ContentProvider](https://android.googlesource.com/platform/frameworks/base/+/master/libs/androidfw/CursorWindow.cpp)
 - [IPC - Wikipedia](https://en.wikipedia.org/wiki/Inter-process_communication)