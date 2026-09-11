using CvForge.Api.Services;

namespace CvForge.Tests;

public class FileValidatorTests
{
    private static readonly byte[] ValidPdfBytes = [0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34];
    private static readonly byte[] ValidZipBytes = [0x50, 0x4B, 0x03, 0x04, 0x00, 0x00, 0x00, 0x00];
    private static readonly byte[] TextFileBytes = "not a pdf or docx"u8.ToArray();

    [Fact]
    public void IsPdf_WithValidPdfMagicBytes_ReturnsTrue()
    {
        using var stream = new MemoryStream(ValidPdfBytes);

        Assert.True(FileValidator.IsPdf(stream));
    }

    [Fact]
    public void IsPdf_WithPlainTextContent_ReturnsFalse()
    {
        using var stream = new MemoryStream(TextFileBytes);

        Assert.False(FileValidator.IsPdf(stream));
    }

    [Fact]
    public void IsPdf_WithZipMagicBytes_ReturnsFalse()
    {
        using var stream = new MemoryStream(ValidZipBytes);

        Assert.False(FileValidator.IsPdf(stream));
    }

    [Fact]
    public void IsDocx_WithValidZipMagicBytes_ReturnsTrue()
    {
        using var stream = new MemoryStream(ValidZipBytes);

        Assert.True(FileValidator.IsDocx(stream));
    }

    [Fact]
    public void IsDocx_WithPdfMagicBytes_ReturnsFalse()
    {
        using var stream = new MemoryStream(ValidPdfBytes);

        Assert.False(FileValidator.IsDocx(stream));
    }

    [Fact]
    public void IsPdf_DoesNotConsumeStreamPosition()
    {
        using var stream = new MemoryStream(ValidPdfBytes);
        stream.Position = 2;

        FileValidator.IsPdf(stream);

        Assert.Equal(2, stream.Position);
    }

    [Fact]
    public void IsPdf_WithEmptyStream_ReturnsFalseWithoutThrowing()
    {
        using var stream = new MemoryStream([]);

        Assert.False(FileValidator.IsPdf(stream));
    }

    [Fact]
    public void IsPdf_WithStreamShorterThanMagicBytes_ReturnsFalse()
    {
        using var stream = new MemoryStream([0x25, 0x50]);

        Assert.False(FileValidator.IsPdf(stream));
    }
}
