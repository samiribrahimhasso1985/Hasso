package com.directormodepro.app.data

import com.directormodepro.app.camera.core.CameraBrand
import com.directormodepro.app.camera.core.CameraId
import com.directormodepro.app.camera.core.CameraSourceDraft
import com.directormodepro.app.camera.core.CameraTransport
import com.directormodepro.app.data.db.CameraSourceEntity
import com.directormodepro.app.data.db.toDomain
import com.directormodepro.app.data.db.toEntity
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class CameraSourceRepositoryTest {
    private var nextId = 0
    private val repo = CameraSourceRepository(InMemoryCameraSourceStore(), clock = { 1_000L }, newId = { "id-${++nextId}" })
    private val rtsp = CameraSourceDraft(name = "  Wide  ", transport = CameraTransport.RTSP, endpoint = " rtsp://10.0.0.5/live ")

    @Test fun addPersistsNormalizedSource() = runTest {
        val saved = repo.add(rtsp) as SaveResult.Saved
        assertEquals(CameraId("id-1"), saved.source.id)
        assertEquals("Wide", saved.source.name)
        assertEquals("rtsp://10.0.0.5/live", saved.source.endpoint)
        assertEquals(1_000L, saved.source.createdAtMillis)
        assertEquals(listOf(saved.source), repo.observeSources().first())
    }

    @Test fun invalidDraftIsNotPersisted() = runTest {
        val result = repo.add(rtsp.copy(endpoint = "rtsp://user:pw@10.0.0.5/live"))
        assertTrue(result is SaveResult.Invalid)
        assertTrue(repo.observeSources().first().isEmpty())
    }

    @Test fun endpointClearedForTransportsWithoutOne() = runTest {
        val saved = repo.add(CameraSourceDraft(name = "UVC", transport = CameraTransport.USB, endpoint = "x")) as SaveResult.Saved
        assertEquals("", saved.source.endpoint)
    }

    @Test fun updateKeepsIdAndCreationTime() = runTest {
        val original = (repo.add(rtsp) as SaveResult.Saved).source
        val updated = repo.update(original.id, rtsp.copy(name = "Close-up", brand = CameraBrand.CANON)) as SaveResult.Saved
        assertEquals(original.id, updated.source.id)
        assertEquals(original.createdAtMillis, updated.source.createdAtMillis)
        assertEquals("Close-up", repo.observeSources().first().single().name)
    }

    @Test fun updateUnknownReturnsNotFound() = runTest {
        assertEquals(SaveResult.NotFound, repo.update(CameraId("missing"), rtsp))
    }

    @Test fun removeDeletesOnlyThatSource() = runTest {
        val a = (repo.add(rtsp) as SaveResult.Saved).source
        val b = (repo.add(rtsp.copy(name = "B")) as SaveResult.Saved).source
        assertTrue(repo.remove(a.id))
        assertFalse(repo.remove(a.id))
        assertEquals(listOf(b), repo.observeSources().first())
    }

    @Test fun entityMappingRoundTripsAndToleratesUnknownEnums() = runTest {
        val source = (repo.add(rtsp) as SaveResult.Saved).source
        assertEquals(source, source.toEntity().toDomain())
        val legacy = CameraSourceEntity("x", "Old", "NIKON", "", "NDI", "", 5).toDomain()
        assertEquals(CameraBrand.GENERIC, legacy.brand)
        assertEquals(CameraTransport.UNKNOWN, legacy.transport)
    }
}
