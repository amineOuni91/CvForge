namespace CvForge.Api.Services;

/// <summary>Validates uploaded files by magic bytes, not just extension — an attacker can rename any file.</summary>
public static class FileValidator
{
    public const long MaxImportSizeBytes = 5 * 1024 * 1024;
    public const long MaxPhotoSizeBytes = 2 * 1024 * 1024;

    private static readonly byte[] PdfMagic = [0x25, 0x50, 0x44, 0x46]; // %PDF
    private static readonly byte[] ZipMagic = [0x50, 0x4B, 0x03, 0x04]; // PK.. (docx is a zip container)

    public static bool IsPdf(Stream stream) => HasMagicBytes(stream, PdfMagic);

    public static bool IsDocx(Stream stream) => HasMagicBytes(stream, ZipMagic);

    private static bool HasMagicBytes(Stream stream, byte[] magic)
    {
        if (stream.Length < magic.Length) return false;

        var originalPosition = stream.Position;
        stream.Position = 0;
        var buffer = new byte[magic.Length];
        stream.ReadExactly(buffer);
        stream.Position = originalPosition;

        return buffer.AsSpan().SequenceEqual(magic);
    }
}
