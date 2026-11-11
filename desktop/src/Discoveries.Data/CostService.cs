using Discoveries.Core.Costs;
using Microsoft.EntityFrameworkCore;

namespace Discoveries.Data;

/// <summary>Stores production costs. Estimated and actual amounts are kept apart everywhere.</summary>
public sealed class CostService(IDbContextFactory<StudioDbContext> factory)
{
    public async Task AddAsync(CostEntry entry, CancellationToken ct = default)
    {
        CostCalculator.Validate(entry);
        entry.Currency = entry.Currency.ToUpperInvariant();
        await using var db = await factory.CreateDbContextAsync(ct);
        db.Costs.Add(entry);
        db.Operations.Add(new() { AtUtc = DateTime.UtcNow, Category = "Cost", Message = $"{entry.Kind} {entry.Category}: {entry.Amount} {entry.Currency}" });
        await db.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<CostEntry>> ListAsync(CancellationToken ct = default)
    {
        await using var db = await factory.CreateDbContextAsync(ct);
        return (await db.Costs.AsNoTracking().ToListAsync(ct)).OrderByDescending(c => c.DateUtc).ToList();
    }

    public async Task<MonthlyCostReport> MonthlyAsync(int year, int month, string mainCurrency = "EUR", CancellationToken ct = default) =>
        CostCalculator.Monthly(await ListAsync(ct), year, month, mainCurrency);
}
