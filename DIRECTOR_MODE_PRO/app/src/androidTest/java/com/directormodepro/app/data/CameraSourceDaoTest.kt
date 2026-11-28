package com.directormodepro.app.data

import androidx.room.Room
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.directormodepro.app.camera.core.CameraSourceDraft
import com.directormodepro.app.camera.core.CameraTransport
import com.directormodepro.app.data.db.DirectorDatabase
import com.directormodepro.app.data.db.RoomCameraSourceStore
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

/** Instrumented (device/emulator) test of the real Room DAO. Run with `./gradlew connectedDebugAndroidTest`. */
@RunWith(AndroidJUnit4::class)
class CameraSourceDaoTest {
    private val db = Room.inMemoryDatabaseBuilder(
        InstrumentationRegistry.getInstrumentation().targetContext, DirectorDatabase::class.java
    ).build()
    private val repo = CameraSourceRepository(RoomCameraSourceStore(db.cameraSources()))

    @After fun close() = db.close()

    @Test fun addUpdateRemoveThroughRoom() = runTest {
        val saved = repo.add(CameraSourceDraft(name = "Wide", transport = CameraTransport.RTSP, endpoint = "rtsp://10.0.0.5/live")) as SaveResult.Saved
        assertEquals(listOf(saved.source), repo.observeSources().first())
        repo.update(saved.source.id, CameraSourceDraft(name = "Close", transport = CameraTransport.RTSP, endpoint = "rtsp://10.0.0.6/live"))
        assertEquals("Close", repo.observeSources().first().single().name)
        assertTrue(repo.remove(saved.source.id))
        assertTrue(repo.observeSources().first().isEmpty())
    }
}
