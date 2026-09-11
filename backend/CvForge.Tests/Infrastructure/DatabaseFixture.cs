namespace CvForge.Tests.Infrastructure;

/// <summary>Shared across all test classes in the collection so migrations run exactly once.</summary>
public class DatabaseFixture : IAsyncLifetime
{
    public CvForgeWebApplicationFactory Factory { get; } = new();

    public async Task InitializeAsync() => await Factory.InitializeDatabaseAsync();

    public async Task DisposeAsync()
    {
        await Factory.DisposeAsync();
    }
}

[CollectionDefinition("Database collection")]
public class DatabaseCollection : ICollectionFixture<DatabaseFixture>;
