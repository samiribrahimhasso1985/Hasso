namespace Discoveries.Core.Costs;

public enum CostCategory { AiApi, Storage, Equipment, Production, Other }

/// <summary>Estimated values (e.g. from token counts × a price the user entered) are never mixed
/// with actual invoiced amounts.</summary>
public enum CostKind { Estimated, Actual }

public sealed class CostEntry
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public DateTime DateUtc { get; set; }
    public CostCategory Category { get; set; }
    public CostKind Kind { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "EUR";
    public Guid? EpisodeId { get; set; }
    public string Description { get; set; } = "";
    /// <summary>Where the number comes from: invoice no., provider usage page, user entry …</summary>
    public string? Source { get; set; }
}

public sealed record CostTotals(string Currency, decimal Actual, decimal Estimated);

public sealed record MonthlyCostReport(int Year, int Month, IReadOnlyList<CostTotals> Totals,
    IReadOnlyDictionary<CostCategory, CostTotals> ByCategoryInMainCurrency, string MainCurrency);

public sealed record BudgetStatus(decimal Budget, decimal Actual, decimal Estimated, string Currency)
{
    public decimal RemainingAfterActual => Budget - Actual;
    public decimal RemainingIncludingEstimates => Budget - Actual - Estimated;
    public bool OverBudgetActual => Actual > Budget;
}

public static class CostCalculator
{
    public static void Validate(CostEntry e)
    {
        if (e.Amount < 0) throw new ArgumentOutOfRangeException(nameof(e), "Amount must not be negative.");
        if (string.IsNullOrWhiteSpace(e.Currency) || e.Currency.Length != 3)
            throw new ArgumentException("Currency must be a 3-letter ISO code.", nameof(e));
    }

    /// <summary>Totals per currency — different currencies are never added together.</summary>
    public static MonthlyCostReport Monthly(IEnumerable<CostEntry> entries, int year, int month, string mainCurrency = "EUR")
    {
        var inMonth = entries.Where(e => e.DateUtc.Year == year && e.DateUtc.Month == month).ToList();
        var totals = inMonth.GroupBy(e => e.Currency.ToUpperInvariant())
            .OrderBy(g => g.Key)
            .Select(g => Sum(g.Key, g))
            .ToList();
        var main = mainCurrency.ToUpperInvariant();
        var byCategory = inMonth.Where(e => e.Currency.Equals(main, StringComparison.OrdinalIgnoreCase))
            .GroupBy(e => e.Category)
            .ToDictionary(g => g.Key, g => Sum(main, g));
        return new MonthlyCostReport(year, month, totals, byCategory, main);
    }

    public static BudgetStatus Budget(IEnumerable<CostEntry> entries, Guid episodeId, decimal budget, string currency = "EUR")
    {
        var mine = entries.Where(e => e.EpisodeId == episodeId && e.Currency.Equals(currency, StringComparison.OrdinalIgnoreCase)).ToList();
        var t = Sum(currency.ToUpperInvariant(), mine);
        return new BudgetStatus(budget, t.Actual, t.Estimated, t.Currency);
    }

    /// <summary>Estimate an API call from token counts and prices the user entered (per million
    /// tokens). Always returns an <see cref="CostKind.Estimated"/> entry.</summary>
    public static CostEntry EstimateAiCall(string provider, string model, long inputTokens, long outputTokens,
        decimal inputPricePerMillion, decimal outputPricePerMillion, string currency, DateTime atUtc, Guid? episodeId = null)
    {
        if (inputTokens < 0 || outputTokens < 0) throw new ArgumentOutOfRangeException(nameof(inputTokens));
        var amount = inputTokens * inputPricePerMillion / 1_000_000m + outputTokens * outputPricePerMillion / 1_000_000m;
        return new CostEntry
        {
            DateUtc = atUtc, Category = CostCategory.AiApi, Kind = CostKind.Estimated,
            Amount = Math.Round(amount, 4), Currency = currency.ToUpperInvariant(), EpisodeId = episodeId,
            Description = $"{provider} {model}: {inputTokens} in / {outputTokens} out tokens",
            Source = "estimate from token count × user-entered price",
        };
    }

    private static CostTotals Sum(string currency, IEnumerable<CostEntry> items)
    {
        var list = items.ToList();
        return new CostTotals(currency,
            list.Where(e => e.Kind == CostKind.Actual).Sum(e => e.Amount),
            list.Where(e => e.Kind == CostKind.Estimated).Sum(e => e.Amount));
    }
}
