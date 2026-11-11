using Discoveries.Core.Domain;
using Discoveries.Core.Script;

namespace Discoveries.Core.Tests;

public class ScriptParserTests
{
    private readonly ScriptParser _parser = new();

    [Fact]
    public void Empty_text_gives_no_scenes()
    {
        Assert.Empty(_parser.Parse("").Scenes);
        Assert.Empty(_parser.Parse("   \n  ").Scenes);
        Assert.Empty(_parser.Parse(null).Scenes);
    }

    [Fact]
    public void Paragraphs_become_intro_scenes_and_ending()
    {
        var text = "مرحباً بكم في حلقة جديدة.\n\nفي هذا المكان عاش السومريون. بنوا مدناً عظيمة.\n\nثم جاء البابليون.\n\nشكراً للمشاهدة.";
        var parsed = _parser.Parse(text);

        Assert.Equal(4, parsed.Scenes.Count);
        Assert.Equal(ScriptSection.Intro, parsed.Scenes[0].Section);
        Assert.Equal(ScriptSection.Scene, parsed.Scenes[1].Section);
        Assert.Equal(ScriptSection.Scene, parsed.Scenes[2].Section);
        Assert.Equal(ScriptSection.Ending, parsed.Scenes[3].Section);
        Assert.Equal(2, parsed.Scenes[1].Shots.Count);
        Assert.Equal([1, 2, 3, 4], parsed.Scenes.Select(s => s.Number));
    }

    [Fact]
    public void Two_paragraphs_are_both_scenes()
    {
        var parsed = _parser.Parse("الأول.\n\nالثاني.");
        Assert.All(parsed.Scenes, s => Assert.Equal(ScriptSection.Scene, s.Section));
    }

    [Fact]
    public void Explicit_arabic_headings_are_respected()
    {
        var text = "مقدمة\nأهلاً بكم.\nمشهد 1\nالنهر يجري. الماء صافٍ؟ نعم!\nمشهد 2\nالمدينة القديمة.\nخاتمة\nإلى اللقاء.";
        var parsed = _parser.Parse(text);

        Assert.Equal([ScriptSection.Intro, ScriptSection.Scene, ScriptSection.Scene, ScriptSection.Ending],
            parsed.Scenes.Select(s => s.Section));
        Assert.Equal(3, parsed.Scenes[1].Shots.Count);
        Assert.Equal("الماء صافٍ؟", parsed.Scenes[1].Shots[1].Text);
    }

    [Fact]
    public void English_and_german_headings_are_respected()
    {
        var text = "INTRO:\nHello.\nSzene 1\nDer Fluss.\nENDING\nBye.";
        var parsed = _parser.Parse(text);
        Assert.Equal([ScriptSection.Intro, ScriptSection.Scene, ScriptSection.Ending], parsed.Scenes.Select(s => s.Section));
    }

    [Fact]
    public void Speaking_time_follows_words_per_minute()
    {
        var parser = new ScriptParser(wordsPerMinute: 120);
        Assert.Equal(1.0, parser.EstimateSeconds(2));
        Assert.Equal(60.0, parser.EstimateSeconds(120));

        var parsed = parser.Parse("واحد اثنان ثلاثة أربعة.");
        Assert.Equal(4, parsed.Scenes[0].Shots[0].Words);
        Assert.Equal(2.0, parsed.TotalSeconds);
    }

    [Fact]
    public void Invalid_pace_is_rejected() =>
        Assert.Throws<ArgumentOutOfRangeException>(() => new ScriptParser(0));
}
