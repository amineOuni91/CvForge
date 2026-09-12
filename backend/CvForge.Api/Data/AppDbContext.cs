using CvForge.Api.Domain;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace CvForge.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : IdentityDbContext<AppUser>(options)
{
    public DbSet<Cv> Cvs => Set<Cv>();

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
    }
}
