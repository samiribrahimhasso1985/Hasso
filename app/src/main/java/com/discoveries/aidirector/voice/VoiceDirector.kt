package com.discoveries.aidirector.voice

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import com.discoveries.aidirector.data.db.AppDatabase
import com.discoveries.aidirector.data.db.VoiceCommandEntity
import com.discoveries.aidirector.data.repo.newId
import com.discoveries.aidirector.domain.model.ContentLanguage
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

sealed interface VoiceState {
    data object Idle : VoiceState
    data object Unavailable : VoiceState
    data class Listening(val partial: String) : VoiceState
    data class Done(val text: String) : VoiceState
    data class Error(val code: Int) : VoiceState
}

/**
 * Wraps Android's SpeechRecognizer. Records only while the user holds an explicit session open:
 * start() begins a single utterance, the recognizer stops on its own at the end of speech, stop() ends it early.
 * Nothing runs in the background. Create and use on the main thread.
 */
class SpeechController(private val context: Context) {
    private val _state = MutableStateFlow<VoiceState>(VoiceState.Idle)
    val state: StateFlow<VoiceState> = _state.asStateFlow()
    private var recognizer: SpeechRecognizer? = null

    val isAvailable: Boolean get() = SpeechRecognizer.isRecognitionAvailable(context)

    fun start(language: ContentLanguage) {
        if (!isAvailable) { _state.value = VoiceState.Unavailable; return }
        release()
        val r = SpeechRecognizer.createSpeechRecognizer(context)
        recognizer = r
        r.setRecognitionListener(object : RecognitionListener {
            override fun onReadyForSpeech(params: Bundle?) { _state.value = VoiceState.Listening("") }
            override fun onBeginningOfSpeech() {}
            override fun onRmsChanged(rmsdB: Float) {}
            override fun onBufferReceived(buffer: ByteArray?) {}
            override fun onEndOfSpeech() {}
            override fun onError(error: Int) { _state.value = VoiceState.Error(error); release() }
            override fun onResults(results: Bundle?) {
                val text = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull().orEmpty()
                _state.value = VoiceState.Done(text)
                release()
            }
            override fun onPartialResults(partialResults: Bundle?) {
                val text = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull().orEmpty()
                _state.value = VoiceState.Listening(text)
            }
            override fun onEvent(eventType: Int, params: Bundle?) {}
        })
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, language.speechTag)
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
        }
        _state.value = VoiceState.Listening("")
        r.startListening(intent)
    }

    fun stop() { recognizer?.stopListening() }

    fun reset() { _state.value = VoiceState.Idle }

    fun release() {
        recognizer?.destroy()
        recognizer = null
    }
}

/** Voice command history and hand-off of an approved transcript to the Executive Director. */
@Singleton
class VoiceDirector @Inject constructor(private val db: AppDatabase) {
    fun observeHistory() = db.voiceDao().observeRecent(30)

    suspend fun saveTranscript(episodeId: String?, text: String, language: ContentLanguage): String {
        val id = newId()
        db.voiceDao().insert(VoiceCommandEntity(id, episodeId, text, language.tag, false, System.currentTimeMillis()))
        return id
    }

    suspend fun markSent(id: String) = db.voiceDao().markSent(id)
}
