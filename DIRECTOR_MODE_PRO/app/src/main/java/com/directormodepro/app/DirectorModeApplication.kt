package com.directormodepro.app

import android.app.Application
import android.content.Context
import com.directormodepro.app.camera.adapters.Camera2Availability
import com.directormodepro.app.camera.adapters.DefaultCameraAdapterFactory
import com.directormodepro.app.camera.core.CameraAdapterFactory
import com.directormodepro.app.camera.core.CameraConnectionManager
import com.directormodepro.app.data.CameraSourceRepository
import com.directormodepro.app.data.db.DirectorDatabase
import com.directormodepro.app.data.db.RoomCameraSourceStore

/** Manual dependency container: small enough that a DI framework is not justified yet. */
class AppContainer(context: Context) {
    val database: DirectorDatabase = DirectorDatabase.create(context)
    val sourceRepository = CameraSourceRepository(RoomCameraSourceStore(database.cameraSources()))
    val adapterFactory: CameraAdapterFactory = DefaultCameraAdapterFactory(phoneCameras = Camera2Availability(context))
    val connectionManager = CameraConnectionManager(adapterFactory)
}

class DirectorModeApplication : Application() {
    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        container = AppContainer(this)
    }
}
