using CvForge.Api.Services;

namespace CvForge.Tests;

public class FileValidatorTests
{
    private static readonly byte[] ValidJpegBytes = [0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10];
    private static readonly byte[] ValidPngBytes = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];

    [Fact]
    public void IsJpeg_DoesNotConsumeStreamPosition()
    {
        using var stream = new MemoryStream(ValidJpegBytes);
        stream.Position = 2;

        FileValidator.IsJpeg(stream);

        Assert.Equal(2, stream.Position);
    }

    [Fact]
    public void IsJpeg_WithEmptyStream_ReturnsFalseWithoutThrowing()
    {
        using var stream = new MemoryStream([]);

        Assert.False(FileValidator.IsJpeg(stream));
    }

    [Fact]
    public void IsJpeg_WithStreamShorterThanMagicBytes_ReturnsFalse()
    {
        using var stream = new MemoryStream([0xFF, 0xD8]);

        Assert.False(FileValidator.IsJpeg(stream));
    }

    [Fact]
    public void IsJpeg_WithValidJpegMagicBytes_ReturnsTrue()
    {
        using var stream = new MemoryStream(ValidJpegBytes);

        Assert.True(FileValidator.IsJpeg(stream));
    }

    [Fact]
    public void IsJpeg_WithPngMagicBytes_ReturnsFalse()
    {
        using var stream = new MemoryStream(ValidPngBytes);

        Assert.False(FileValidator.IsJpeg(stream));
    }

    [Fact]
    public void IsPng_WithValidPngMagicBytes_ReturnsTrue()
    {
        using var stream = new MemoryStream(ValidPngBytes);

        Assert.True(FileValidator.IsPng(stream));
    }

    [Fact]
    public void IsPng_WithJpegMagicBytes_ReturnsFalse()
    {
        using var stream = new MemoryStream(ValidJpegBytes);

        Assert.False(FileValidator.IsPng(stream));
    }
}
