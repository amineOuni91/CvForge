using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace CvForge.Api.Data;

// SQL Server's datetime2 has no timezone info, so EF Core loses DateTimeKind.Utc on read and
// returns Kind=Unspecified — System.Text.Json then serializes without a "Z" suffix, and the
// frontend misreads the UTC value as local time. Stamping Kind=Utc back on read fixes this
// at the one place all DateTime columns route through, instead of patching every DTO.
public class UtcDateTimeConverter : ValueConverter<DateTime, DateTime>
{
    public UtcDateTimeConverter() : base(
        v => v,
        v => DateTime.SpecifyKind(v, DateTimeKind.Utc))
    {
    }
}
