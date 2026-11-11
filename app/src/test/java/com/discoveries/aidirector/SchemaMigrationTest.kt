package com.discoveries.aidirector

import com.discoveries.aidirector.data.db.SchemaV2Sql
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/**
 * Compares the hand-written migration SQL with the schema Room exports while compiling.
 * If an entity changes without the migration, this test fails in CI.
 */
class SchemaMigrationTest {

    private fun schemaFile(): File {
        val root = listOf(File("schemas"), File("app/schemas")).firstOrNull { it.isDirectory }
            ?: error("Room schema directory not found (expected app/schemas)")
        return root.walkTopDown().firstOrNull { it.name == "2.json" && it.path.contains("AppDatabase") }
            ?: error("schema 2.json not exported")
    }

    private fun norm(s: String) = s.replace(Regex("\\s+"), " ").trim()

    @Test
    fun migrationSqlMatchesRoomSchema() {
        val db = Json.parseToJsonElement(schemaFile().readText()).jsonObject["database"]!!.jsonObject
        assertEquals(2, db["version"]!!.jsonPrimitive.content.toInt())
        val entities = db["entities"]!!.jsonArray.map { it.jsonObject }.associateBy { it["tableName"]!!.jsonPrimitive.content }

        for ((table, sql) in SchemaV2Sql.TABLES) {
            val entity = entities[table] ?: error("table $table missing from schema")
            val expected = entity["createSql"]!!.jsonPrimitive.content.replace("\${TABLE_NAME}", table)
            assertEquals("createSql for $table", norm(expected), norm(sql))

            val roomIndices = entity["indices"]?.jsonArray?.map { idx ->
                val o = idx.jsonObject
                o["createSql"]!!.jsonPrimitive.content
                    .replace("\${INDEX_NAME}", o["name"]!!.jsonPrimitive.content)
                    .replace("\${TABLE_NAME}", table)
            }.orEmpty().map(::norm).toSet()
            val ours = SchemaV2Sql.INDICES[table].orEmpty().map { norm(SchemaV2Sql.indexSql(table, it)) }.toSet()
            assertEquals("indices for $table", roomIndices, ours)
        }
    }

    @Test
    fun lensColumnIsGone() {
        val db = Json.parseToJsonElement(schemaFile().readText()).jsonObject["database"]!!.jsonObject
        val bg = db["entities"]!!.jsonArray.map { it.jsonObject }.first { it["tableName"]!!.jsonPrimitive.content == "background_suggestions" }
        assertTrue(bg["fields"]!!.jsonArray.none { it.jsonObject["columnName"]!!.jsonPrimitive.content == "lens" })
    }
}
