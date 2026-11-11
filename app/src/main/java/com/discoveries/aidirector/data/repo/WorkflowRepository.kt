package com.discoveries.aidirector.data.repo

import com.discoveries.aidirector.data.db.AppDatabase
import com.discoveries.aidirector.data.db.SceneTakeEntity
import com.discoveries.aidirector.data.db.WorkflowStateEntity
import com.discoveries.aidirector.domain.model.WorkflowStep
import javax.inject.Inject
import javax.inject.Singleton

/** Persists the six-step workflow position, the manual take log and "end of content". */
@Singleton
class WorkflowRepository @Inject constructor(private val db: AppDatabase) {
    private val dao = db.workflowDao()

    fun observe(episodeId: String) = dao.observe(episodeId)
    fun observeTakes(episodeId: String) = db.takeDao().observeForEpisode(episodeId)
    fun observeSuggestions(episodeId: String) = db.mediaDao().observeForEpisode(episodeId)
    suspend fun suggestions(episodeId: String) = db.mediaDao().getForEpisode(episodeId)

    private suspend fun current(episodeId: String) =
        dao.get(episodeId) ?: WorkflowStateEntity(episodeId, WorkflowStep.TEXT.number, null, null, System.currentTimeMillis())

    suspend fun setStep(episodeId: String, step: WorkflowStep) =
        dao.upsert(current(episodeId).copy(currentStep = step.number, updatedAt = System.currentTimeMillis()))

    suspend fun markAnalysisDone(episodeId: String) =
        dao.upsert(current(episodeId).copy(analysisDoneAt = System.currentTimeMillis(), updatedAt = System.currentTimeMillis()))

    suspend fun endContent(episodeId: String) {
        val now = System.currentTimeMillis()
        dao.upsert(current(episodeId).copy(contentEndedAt = now, currentStep = WorkflowStep.APPROVAL.number, updatedAt = now))
    }

    /** Re-opens shooting. Decisions already made in step 5 are kept. */
    suspend fun reopenContent(episodeId: String) {
        val now = System.currentTimeMillis()
        dao.upsert(current(episodeId).copy(contentEndedAt = null, currentStep = WorkflowStep.CAMERA.number, updatedAt = now))
    }

    suspend fun addTake(episodeId: String, sceneId: String, note: String) {
        val number = db.takeDao().countForScene(sceneId) + 1
        db.takeDao().insert(SceneTakeEntity(newId(), episodeId, sceneId, number, note, System.currentTimeMillis()))
    }

    suspend fun removeTake(take: SceneTakeEntity) = db.takeDao().delete(take)
}
