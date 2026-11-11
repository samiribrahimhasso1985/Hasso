using System.Text.RegularExpressions;
using Discoveries.Core.Domain;

namespace Discoveries.Core.Script;

public sealed record ParsedShot(int Number, string Text, int Words, double EstimatedSeconds);

public sealed record ParsedScene(int Number, ScriptSection Section, string Text, IReadOnlyList<ParsedShot> Shots)
{
    public double EstimatedSeconds => Shots.Sum(s => s.EstimatedSeconds);
}

public sealed record ParsedScript(IReadOnlyList<ParsedScene> Scenes)
{
    public double TotalSeconds => Scenes.Sum(s => s.EstimatedSeconds);
    public int ShotCount => Scenes.Sum(s => s.Shots.Count);
}

/// <summary>
/// Splits a narration script into INTRO / SCENES / ENDING, each scene into shots (sentences),
/// and estimates speaking time from word count. Pure text logic — no AI involved.
///
/// Explicit headings are honoured on their own line, e.g. "INTRO", "مقدمة", "مشهد 2", "Szene 3",
/// "ENDING", "خاتمة". Without headings: first paragraph = intro, last = ending (when there are at
/// least three paragraphs), every paragraph in between = one scene.
/// </summary>
public sealed partial class ScriptParser
{
    /// <summary>Default narration pace. Arabic documentary narration is typically 110–140 wpm.</summary>
    public const double DefaultWordsPerMinute = 130;

    private readonly double _wordsPerMinute;

    public ScriptParser(double wordsPerMinute = DefaultWordsPerMinute)
    {
        if (wordsPerMinute <= 0) throw new ArgumentOutOfRangeException(nameof(wordsPerMinute));
        _wordsPerMinute = wordsPerMinute;
    }

    [GeneratedRegex(@"^\s*(?<k>intro|introduction|مقدمة|المقدمة|einleitung|intro:|ending|outro|خاتمة|الخاتمة|الختام|schluss|abschluss|scene|مشهد|المشهد|szene)\s*(?<n>[0-9٠-٩]+)?\s*[:：\-–—]?\s*$",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex HeadingRegex();

    [GeneratedRegex(@"(?<=[\.!\?؟…。])\s+|\n+")]
    private static partial Regex SentenceSplitRegex();

    [GeneratedRegex(@"\S+")]
    private static partial Regex WordRegex();

    [GeneratedRegex(@"\n\s*\n")]
    private static partial Regex ParagraphSplitRegex();

    public ParsedScript Parse(string? text)
    {
        if (string.IsNullOrWhiteSpace(text)) return new ParsedScript([]);
        var normalized = text.Replace("\r\n", "\n").Replace('\r', '\n').Trim();
        var lines = normalized.Split('\n');

        var blocks = lines.Any(l => HeadingRegex().IsMatch(l))
            ? SplitByHeadings(lines)
            : SplitByParagraphs(normalized);

        var scenes = new List<ParsedScene>();
        var sceneNumber = 0;
        foreach (var (section, body) in blocks)
        {
            if (string.IsNullOrWhiteSpace(body)) continue;
            scenes.Add(new ParsedScene(++sceneNumber, section, body.Trim(), SplitShots(body)));
        }
        return new ParsedScript(scenes);
    }

    public double EstimateSeconds(int words) => Math.Round(Math.Max(words, 0) / _wordsPerMinute * 60.0, 1);

    public static int CountWords(string text) => WordRegex().Matches(text).Count;

    private IReadOnlyList<ParsedShot> SplitShots(string body)
    {
        var shots = new List<ParsedShot>();
        foreach (var raw in SentenceSplitRegex().Split(body))
        {
            var sentence = raw.Trim();
            if (sentence.Length == 0) continue;
            var words = CountWords(sentence);
            shots.Add(new ParsedShot(shots.Count + 1, sentence, words, EstimateSeconds(words)));
        }
        return shots;
    }

    private static List<(ScriptSection, string)> SplitByHeadings(string[] lines)
    {
        var result = new List<(ScriptSection, string)>();
        ScriptSection current = ScriptSection.Intro;
        var buffer = new List<string>();
        var sawHeading = false;

        void Flush()
        {
            if (buffer.Count > 0) result.Add((current, string.Join('\n', buffer)));
            buffer.Clear();
        }

        foreach (var line in lines)
        {
            var m = HeadingRegex().Match(line);
            if (m.Success)
            {
                Flush();
                current = ClassifyHeading(m.Groups["k"].Value);
                sawHeading = true;
                continue;
            }
            // Text before the first heading counts as intro.
            if (!sawHeading) current = ScriptSection.Intro;
            buffer.Add(line);
        }
        Flush();
        return result;
    }

    private static ScriptSection ClassifyHeading(string keyword)
    {
        var k = keyword.Trim().TrimEnd(':').ToLowerInvariant();
        return k switch
        {
            "intro" or "introduction" or "مقدمة" or "المقدمة" or "einleitung" => ScriptSection.Intro,
            "ending" or "outro" or "خاتمة" or "الخاتمة" or "الختام" or "schluss" or "abschluss" => ScriptSection.Ending,
            _ => ScriptSection.Scene,
        };
    }

    private static List<(ScriptSection, string)> SplitByParagraphs(string text)
    {
        var paragraphs = ParagraphSplitRegex().Split(text)
            .Select(p => p.Trim())
            .Where(p => p.Length > 0)
            .ToList();

        var result = new List<(ScriptSection, string)>();
        for (var i = 0; i < paragraphs.Count; i++)
        {
            ScriptSection section;
            if (paragraphs.Count >= 3 && i == 0) section = ScriptSection.Intro;
            else if (paragraphs.Count >= 3 && i == paragraphs.Count - 1) section = ScriptSection.Ending;
            else section = ScriptSection.Scene;
            result.Add((section, paragraphs[i]));
        }
        return result;
    }
}
