using CvForge.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace CvForge.Api.Data;

public static class CvAuthorization
{
    /// <summary>Loads a CV only if owned by userId; filters in the query so an unowned CV never loads (returns null, callers respond 404, not 403).</summary>
    public static Task<Cv?> LoadOwnedCvAsync(this AppDbContext db, string userId, Guid cvId) =>
        db.Cvs.FirstOrDefaultAsync(c => c.Id == cvId && c.UserId == userId);

    /// <summary>Same guarantee as LoadOwnedCvAsync, for cover letters.</summary>
    public static Task<CoverLetter?> LoadOwnedLetterAsync(this AppDbContext db, string userId, Guid letterId) =>
        db.CoverLetters.FirstOrDefaultAsync(c => c.Id == letterId && c.UserId == userId);
}
