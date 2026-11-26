package com.directormodepro.app.data.db

import android.content.Context
import androidx.room.ColumnInfo
import androidx.room.Dao
import androidx.room.Database
import androidx.room.Entity
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.Update
import com.directormodepro.app.camera.core.CameraBrand
import com.directormodepro.app.camera.core.CameraId
import com.directormodepro.app.camera.core.CameraSource
import com.directormodepro.app.camera.core.CameraTransport
import com.directormodepro.app.data.CameraSourceStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

/**
 * Camera sources are stored as plain enum names so a renamed/removed enum value degrades to
 * GENERIC/UNKNOWN instead of crashing. No passwords or tokens are ever stored in this table.
 */
@Entity(tableName = "camera_sources")
data class CameraSourceEntity(
    @PrimaryKey val id: String,
    val name: String,
    val brand: String,
    val model: String,
    val transport: String,
    val endpoint: String,
    @ColumnInfo(name = "created_at") val createdAtMillis: Long
)

@Dao
interface CameraSourceDao {
    @Query("SELECT * FROM camera_sources ORDER BY created_at ASC")
    fun observeAll(): Flow<List<CameraSourceEntity>>

    @Query("SELECT * FROM camera_sources WHERE id = :id")
    suspend fun get(id: String): CameraSourceEntity?

    @Insert(onConflict = OnConflictStrategy.ABORT)
    suspend fun insert(entity: CameraSourceEntity)

    @Update
    suspend fun update(entity: CameraSourceEntity): Int

    @Query("DELETE FROM camera_sources WHERE id = :id")
    suspend fun delete(id: String): Int
}

@Database(entities = [CameraSourceEntity::class], version = 1, exportSchema = true)
abstract class DirectorDatabase : RoomDatabase() {
    abstract fun cameraSources(): CameraSourceDao

    companion object {
        const val NAME = "director_mode_pro.db"

        fun create(context: Context): DirectorDatabase =
            Room.databaseBuilder(context.applicationContext, DirectorDatabase::class.java, NAME).build()
    }
}

fun CameraSourceEntity.toDomain() = CameraSource(
    id = CameraId(id),
    name = name,
    brand = enumValueOrDefault(brand, CameraBrand.GENERIC),
    model = model,
    transport = enumValueOrDefault(transport, CameraTransport.UNKNOWN),
    endpoint = endpoint,
    createdAtMillis = createdAtMillis
)

fun CameraSource.toEntity() = CameraSourceEntity(
    id = id.value,
    name = name,
    brand = brand.name,
    model = model,
    transport = transport.name,
    endpoint = endpoint,
    createdAtMillis = createdAtMillis
)

inline fun <reified T : Enum<T>> enumValueOrDefault(name: String, default: T): T =
    enumValues<T>().firstOrNull { it.name == name } ?: default

class RoomCameraSourceStore(private val dao: CameraSourceDao) : CameraSourceStore {
    override fun observeAll(): Flow<List<CameraSource>> = dao.observeAll().map { rows -> rows.map { it.toDomain() } }
    override suspend fun get(id: CameraId) = dao.get(id.value)?.toDomain()
    override suspend fun insert(source: CameraSource) = dao.insert(source.toEntity())
    override suspend fun update(source: CameraSource) = dao.update(source.toEntity()) > 0
    override suspend fun delete(id: CameraId) = dao.delete(id.value) > 0
}
