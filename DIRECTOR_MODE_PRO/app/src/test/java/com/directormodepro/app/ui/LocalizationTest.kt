package com.directormodepro.app.ui

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File
import javax.xml.parsers.DocumentBuilderFactory

/** Every English string must exist in Arabic and German with the same format placeholders. */
class LocalizationTest {
    private val res = File("src/main/res")
    private val placeholder = Regex("%\\d+\\$[sd]")

    private fun load(dir: String): Map<String, String> {
        val doc = DocumentBuilderFactory.newInstance().newDocumentBuilder().parse(File(res, "$dir/strings.xml"))
        val nodes = doc.getElementsByTagName("string")
        return (0 until nodes.length).map { nodes.item(it) }
            .filter { it.attributes.getNamedItem("translatable")?.nodeValue != "false" }
            .associate { it.attributes.getNamedItem("name").nodeValue to it.textContent }
    }

    @Test fun arabicAndGermanAreComplete() {
        val english = load("values")
        assertTrue(english.size > 100)
        for (locale in listOf("values-ar", "values-de")) {
            val translated = load(locale)
            assertEquals("$locale missing/extra keys", english.keys, translated.keys)
            for ((key, text) in english) {
                assertEquals(
                    "$locale/$key placeholders",
                    placeholder.findAll(text).map { it.value }.toSet(),
                    placeholder.findAll(translated.getValue(key)).map { it.value }.toSet()
                )
                assertTrue("$locale/$key is empty", translated.getValue(key).isNotBlank())
            }
        }
    }
}
