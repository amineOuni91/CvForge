using CvForge.Api.Domain;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace CvForge.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : IdentityDbContext<AppUser>(options)
{
    public DbSet<Cv> Cvs => Set<Cv>();
    public DbSet<CoverLetter> CoverLetters => Set<CoverLetter>();
    public DbSet<JobOffer> JobOffers => Set<JobOffer>();

    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        configurationBuilder.Properties<DateTime>().HaveConversion<UtcDateTimeConverter>();
    }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<Cv>(entity =>
        {
            entity.HasIndex(c => new { c.UserId, c.UpdatedAt });
            entity.HasOne<AppUser>().WithMany().HasForeignKey(c => c.UserId).OnDelete(DeleteBehavior.Cascade);
            // NoAction: SQL Server rejects SET NULL (multiple cascade paths User->Cvs / User->JobOffers->Cvs); detach in C# before deleting an offer.
            entity.HasOne<JobOffer>().WithMany().HasForeignKey(c => c.JobOfferId).OnDelete(DeleteBehavior.NoAction);

            entity.OwnsOne(c => c.Document, document =>
            {
                document.ToJson();
                document.OwnsOne(d => d.Settings);
                document.OwnsOne(d => d.PersonalInfo);
                document.OwnsMany(d => d.Experiences);
                document.OwnsMany(d => d.Projects);
                document.OwnsMany(d => d.Education);
                document.OwnsMany(d => d.SkillCategories);
                document.OwnsMany(d => d.Languages);
                document.OwnsMany(d => d.Certifications);
            });
        });

        builder.Entity<CoverLetter>(entity =>
        {
            entity.HasIndex(c => new { c.UserId, c.UpdatedAt });
            entity.HasOne<AppUser>().WithMany().HasForeignKey(c => c.UserId).OnDelete(DeleteBehavior.Cascade);

            entity.OwnsOne(c => c.Document, document =>
            {
                document.ToJson();
                document.OwnsOne(d => d.Settings);
                document.OwnsOne(d => d.Sender);
                document.OwnsOne(d => d.Recipient);
            });
        });

        builder.Entity<JobOffer>(entity =>
        {
            entity.HasIndex(o => new { o.UserId, o.UpdatedAt });
            entity.HasOne<AppUser>().WithMany().HasForeignKey(o => o.UserId).OnDelete(DeleteBehavior.Cascade);

            entity.OwnsOne(o => o.Document, document =>
            {
                document.ToJson();
                document.OwnsMany(d => d.Steps);
            });
        });

        builder.Entity<AppUser>().OwnsOne(u => u.ProfileInfo, info => info.ToJson());
    }
}
