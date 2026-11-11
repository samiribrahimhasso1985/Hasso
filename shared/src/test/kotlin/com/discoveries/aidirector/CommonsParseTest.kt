package com.discoveries.aidirector

import com.discoveries.aidirector.ai.CommonsParser
import org.junit.Assert.assertEquals
import org.junit.Test

class CommonsParseTest {
    private val body = """
        {"batchcomplete":true,"query":{"pages":[
          {"pageid":2,"ns":6,"title":"File:Ziggurat NC.jpg","index":2,"imageinfo":[{"thumburl":"https://t/2.jpg","url":"https://u/2.jpg",
            "descriptionurl":"https://c/2","mime":"image/jpeg","extmetadata":{"LicenseShortName":{"value":"CC BY-NC 2.0"},"Artist":{"value":"<a href=\"x\">Bob</a>"}}}]},
          {"pageid":1,"ns":6,"title":"File:Ur ziggurat.jpg","index":1,"imageinfo":[{"thumburl":"https://t/1.jpg","url":"https://u/1.jpg",
            "descriptionurl":"https://c/1","mime":"image/jpeg","extmetadata":{"LicenseShortName":{"value":"CC BY-SA 3.0"},"Artist":{"value":"Alice"},"LicenseUrl":{"value":"https://l"}}}]},
          {"pageid":3,"ns":6,"title":"File:Babylon.jpg","index":3,"imageinfo":[{"url":"https://u/3.jpg","mime":"image/jpeg","extmetadata":{"LicenseShortName":{"value":"Public domain"}}}]}
        ]}}
    """.trimIndent()

    @Test fun parsesInRankOrderWithLicences() {
        val files = CommonsParser.parse(body)
        assertEquals(listOf("Ur ziggurat.jpg", "Ziggurat NC.jpg", "Babylon.jpg"), files.map { it.title })
        assertEquals("Bob", files[1].author)
        assertEquals("CC BY-SA 3.0", files[0].licenseName)
    }

    @Test fun pickPrefersUsableLicences() {
        val picked = CommonsParser.pick(CommonsParser.parse(body), 2)
        assertEquals(listOf("Ur ziggurat.jpg", "Babylon.jpg"), picked.map { it.title })
    }

    @Test fun badBodyGivesEmptyList() {
        assertEquals(0, CommonsParser.parse("not json").size)
    }
}
