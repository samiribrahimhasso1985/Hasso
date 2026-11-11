package com.discoveries.aidirector.data.db

/**
 * SQL for schema version 2, written to match exactly what Room generates.
 * A unit test compares every statement with Room's exported schema (app/schemas/.../2.json),
 * so a mismatch fails the build instead of crashing on the user's tablet.
 */
object SchemaV2Sql {
    const val MEDIA_SUGGESTIONS = "CREATE TABLE IF NOT EXISTS `media_suggestions` (`id` TEXT NOT NULL, `episodeId` TEXT NOT NULL, " +
        "`sceneId` TEXT NOT NULL, `kind` TEXT NOT NULL, `origin` TEXT NOT NULL, `title` TEXT NOT NULL, `previewUrl` TEXT, " +
        "`fileUrl` TEXT, `localPath` TEXT, `sourcePage` TEXT, `author` TEXT NOT NULL, `licenseName` TEXT NOT NULL, " +
        "`licenseUrl` TEXT, `licenseState` TEXT NOT NULL, `prompt` TEXT NOT NULL, `providerId` TEXT NOT NULL, " +
        "`status` TEXT NOT NULL, `createdAt` INTEGER NOT NULL, `decidedAt` INTEGER, PRIMARY KEY(`id`))"

    const val WORKFLOW_STATE = "CREATE TABLE IF NOT EXISTS `workflow_state` (`episodeId` TEXT NOT NULL, `currentStep` INTEGER NOT NULL, " +
        "`analysisDoneAt` INTEGER, `contentEndedAt` INTEGER, `updatedAt` INTEGER NOT NULL, PRIMARY KEY(`episodeId`))"

    const val SCENE_TAKES = "CREATE TABLE IF NOT EXISTS `scene_takes` (`id` TEXT NOT NULL, `episodeId` TEXT NOT NULL, " +
        "`sceneId` TEXT NOT NULL, `takeNumber` INTEGER NOT NULL, `note` TEXT NOT NULL, `markedAt` INTEGER NOT NULL, PRIMARY KEY(`id`))"

    /** background_suggestions without the removed `lens` column. */
    const val BACKGROUND_SUGGESTIONS = "CREATE TABLE IF NOT EXISTS `background_suggestions` (`id` TEXT NOT NULL, `episodeId` TEXT NOT NULL, " +
        "`sceneId` TEXT, `category` TEXT NOT NULL, `title` TEXT NOT NULL, `description` TEXT NOT NULL, `colors` TEXT NOT NULL, " +
        "`lighting` TEXT NOT NULL, `cameraAngle` TEXT NOT NULL, `subjectDistance` TEXT NOT NULL, `davinciCompositing` TEXT NOT NULL, " +
        "`music` TEXT NOT NULL, `soundEffects` TEXT NOT NULL, `providerId` TEXT NOT NULL, `approvalStatus` TEXT NOT NULL, " +
        "`createdAt` INTEGER NOT NULL, PRIMARY KEY(`id`))"

    const val BACKGROUND_COLUMNS = "`id`, `episodeId`, `sceneId`, `category`, `title`, `description`, `colors`, `lighting`, " +
        "`cameraAngle`, `subjectDistance`, `davinciCompositing`, `music`, `soundEffects`, `providerId`, `approvalStatus`, `createdAt`"

    val TABLES: Map<String, String> = mapOf(
        "media_suggestions" to MEDIA_SUGGESTIONS,
        "workflow_state" to WORKFLOW_STATE,
        "scene_takes" to SCENE_TAKES,
        "background_suggestions" to BACKGROUND_SUGGESTIONS,
    )

    /** table to indexed columns, named the Room way: index_<table>_<column>. */
    val INDICES: Map<String, List<String>> = mapOf(
        "media_suggestions" to listOf("episodeId", "sceneId"),
        "scene_takes" to listOf("episodeId", "sceneId"),
        "background_suggestions" to listOf("episodeId"),
    )

    fun indexSql(table: String, column: String) =
        "CREATE INDEX IF NOT EXISTS `index_${table}_$column` ON `$table` (`$column`)"
}
