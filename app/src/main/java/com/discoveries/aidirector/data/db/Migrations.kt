package com.discoveries.aidirector.data.db

import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

/** Version 1 → 2: workflow tables, suggested media, and removal of the lens column. No user data is lost. */
val MIGRATION_1_2 = object : Migration(1, 2) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL(SchemaV2Sql.MEDIA_SUGGESTIONS)
        db.execSQL(SchemaV2Sql.WORKFLOW_STATE)
        db.execSQL(SchemaV2Sql.SCENE_TAKES)

        db.execSQL(SchemaV2Sql.BACKGROUND_SUGGESTIONS.replace("`background_suggestions`", "`background_suggestions_v2`"))
        db.execSQL(
            "INSERT INTO `background_suggestions_v2` (${SchemaV2Sql.BACKGROUND_COLUMNS}) " +
                "SELECT ${SchemaV2Sql.BACKGROUND_COLUMNS} FROM `background_suggestions`"
        )
        db.execSQL("DROP TABLE `background_suggestions`")
        db.execSQL("ALTER TABLE `background_suggestions_v2` RENAME TO `background_suggestions`")

        for ((table, columns) in SchemaV2Sql.INDICES) {
            columns.forEach { db.execSQL(SchemaV2Sql.indexSql(table, it)) }
        }
    }
}
