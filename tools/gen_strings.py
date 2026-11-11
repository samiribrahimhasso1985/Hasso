#!/usr/bin/env python3
"""Generates values/strings.xml (Arabic, default), values-en and values-de from one table.
Edit this table, then run:  python3 tools/gen_strings.py
"""
import os
from xml.sax.saxutils import escape

ROOT = os.path.join(os.path.dirname(__file__), "..", "app", "src", "main", "res")

# key: (Arabic, English, German)
S = {
    "app_name": ("AI Director FX3", "AI Director FX3", "AI Director FX3"),
    "series_name": ("اكتشافات — DISCOVERIES", "DISCOVERIES — اكتشافات", "DISCOVERIES — اكتشافات"),
    "splash_tagline": ("مساعد الإخراج السينمائي", "Cinematic directing assistant", "Assistent für filmische Regie"),
    "open_menu": ("فتح القائمة", "Open menu", "Menü öffnen"),

    "nav_dashboard": ("لوحة التحكم", "Dashboard", "Übersicht"),
    "nav_episodes": ("الحلقات", "Episodes", "Folgen"),
    "nav_studio": ("استوديو المخرج", "Director Studio", "Regie-Studio"),
    "nav_script": ("محرر النص", "Script Editor", "Skript-Editor"),
    "nav_scenes": ("منشئ المشاهد", "Scene Builder", "Szenen-Builder"),
    "nav_backgrounds": ("مخرج الخلفيات", "Background Director", "Hintergrund-Regie"),
    "nav_ai_center": ("مركز الذكاء الاصطناعي", "AI Control Center", "KI-Zentrale"),
    "nav_settings": ("الإعدادات", "Settings", "Einstellungen"),
    "nav_later_header": ("مراحل لاحقة", "Later phases", "Spätere Phasen"),
    "later_camera": ("كاميرا Sony FX3 — المرحلة 2", "Sony FX3 camera — phase 2", "Sony-FX3-Kamera — Phase 2"),
    "later_teleprompter": ("الملقّن والمخرج المساعد — الشريحة 2", "Teleprompter & assistant director — slice 2", "Teleprompter & Regieassistenz — Abschnitt 2"),
    "later_davinci": ("DaVinci والإرسال إلى ويندوز — الشريحة 3", "DaVinci & send to Windows — slice 3", "DaVinci & Senden an Windows — Abschnitt 3"),
    "later_media": ("استوديو الصور والفيديو والصوت — المرحلة 3", "Image, video & audio studio — phase 3", "Bild-, Video- & Audio-Studio — Phase 3"),
    "later_storyboard": ("القصة المصوّرة والخط الزمني — المرحلة 3", "Storyboard & timeline — phase 3", "Storyboard & Zeitleiste — Phase 3"),
    "not_built_yet": ("هذه الأقسام لم تُبنَ بعد في هذه النسخة، ولا توجد فيها أزرار وهمية.", "These sections are not built in this version yet; no placeholder buttons are shown.", "Diese Bereiche sind in dieser Version noch nicht gebaut; es gibt keine Platzhalter-Schaltflächen."),

    "dashboard_title": ("لوحة التحكم", "Dashboard", "Übersicht"),
    "active_episode": ("الحلقة النشطة", "Active episode", "Aktive Folge"),
    "no_active_episode": ("لا توجد حلقة نشطة.", "No active episode.", "Keine aktive Folge."),
    "choose_episode": ("اختر حلقة أو أنشئ واحدة", "Choose or create an episode", "Folge wählen oder anlegen"),
    "need_active_episode": ("اختر حلقة نشطة أولاً من صفحة الحلقات.", "Choose an active episode first on the Episodes page.", "Wähle zuerst auf der Seite „Folgen“ eine aktive Folge."),
    "next_action": ("الخطوة التالية", "Next step", "Nächster Schritt"),
    "next_idea": ("تحدّث إلى المخرج أو اكتب الفكرة", "Talk to the director or write the idea", "Sprich mit der Regie oder schreibe die Idee"),
    "next_script": ("أكمل النص ثم ابنِ المشاهد", "Finish the script, then build scenes", "Skript fertigstellen, dann Szenen bauen"),
    "next_review": ("راجع المشاهد المعلّقة واعتمدها", "Review and approve pending scenes", "Offene Szenen prüfen und freigeben"),
    "next_record": ("التصوير والمونتاج — يحتاج المرحلتين 2 و3", "Recording and editing — needs phases 2 and 3", "Aufnahme und Schnitt — braucht Phase 2 und 3"),
    "next_none": ("لا توجد خطوة مطلوبة", "No step required", "Kein Schritt nötig"),
    "episodes_by_status": ("الحلقات حسب الحالة", "Episodes by status", "Folgen nach Status"),
    "total_episodes": ("كل الحلقات: %1$d", "All episodes: %1$d", "Alle Folgen: %1$d"),
    "incomplete_episodes": ("غير مكتملة: %1$d", "Incomplete: %1$d", "Unvollständig: %1$d"),
    "pending_scene_reviews": ("مشاهد تنتظر المراجعة: %1$d", "Scenes awaiting review: %1$d", "Szenen zur Prüfung: %1$d"),
    "ai_status_demo": ("وضع العرض التجريبي مفعّل: النتائج أمثلة وليست ذكاءً اصطناعياً حقيقياً.", "Demo mode is on: results are samples, not real AI output.", "Demo-Modus ist an: Ergebnisse sind Beispiele, keine echte KI-Ausgabe."),
    "ai_status_none": ("لا يوجد مزوّد ذكاء اصطناعي مفعّل. أضف مفتاح API من مركز الذكاء الاصطناعي.", "No AI provider is enabled. Add an API key in the AI Control Center.", "Kein KI-Anbieter aktiv. Füge im KI-Zentrum einen API-Schlüssel hinzu."),
    "ai_status_ready": ("مزوّدات الذكاء الاصطناعي الجاهزة: %1$d", "AI providers ready: %1$d", "Bereite KI-Anbieter: %1$d"),

    "new_episode": ("حلقة جديدة", "New episode", "Neue Folge"),
    "title_ar": ("العنوان بالعربية", "Arabic title", "Arabischer Titel"),
    "title_en": ("العنوان بالإنجليزية", "English title", "Englischer Titel"),
    "title_de": ("العنوان بالألمانية", "German title", "Deutscher Titel"),
    "content_language": ("لغة محتوى الحلقة", "Episode content language", "Inhaltssprache der Folge"),
    "create": ("إنشاء", "Create", "Anlegen"),
    "cancel": ("إلغاء", "Cancel", "Abbrechen"),
    "save": ("حفظ", "Save", "Speichern"),
    "edit": ("تعديل", "Edit", "Bearbeiten"),
    "search": ("بحث بالعنوان أو الرقم", "Search by title or number", "Nach Titel oder Nummer suchen"),
    "filter_all": ("الكل", "All", "Alle"),
    "filter_incomplete": ("غير مكتملة", "Incomplete", "Unvollständig"),
    "no_episodes": ("لا توجد حلقات بعد. أنشئ أول حلقة.", "No episodes yet. Create your first one.", "Noch keine Folgen. Lege die erste an."),
    "untitled": ("بدون عنوان", "Untitled", "Ohne Titel"),
    "set_active": ("اجعلها نشطة", "Make active", "Aktiv setzen"),
    "active_label": ("نشطة", "Active", "Aktiv"),
    "change_status": ("تغيير الحالة", "Change status", "Status ändern"),
    "publish": ("نشر وإعطاء رقم رسمي", "Publish and assign number", "Veröffentlichen und Nummer vergeben"),
    "publish_confirm": ("ستأخذ الحلقة رقماً رسمياً نهائياً على مستوى السلسلة، ولا يُعاد استخدامه أبداً. هل تتابع؟", "The episode will get a permanent series-wide number that is never reused. Continue?", "Die Folge erhält eine endgültige Seriennummer, die nie wiederverwendet wird. Fortfahren?"),
    "draft_number": ("مسودة %1$s", "Draft %1$s", "Entwurf %1$s"),
    "official_number": ("الحلقة #%1$d", "Episode #%1$d", "Folge #%1$d"),

    "status_idea": ("فكرة", "Idea", "Idee"),
    "status_research": ("بحث", "Research", "Recherche"),
    "status_script": ("كتابة", "Writing", "Schreiben"),
    "status_script_approved": ("نص معتمد", "Script approved", "Skript freigegeben"),
    "status_preparation": ("تحضير", "Preparation", "Vorbereitung"),
    "status_recording": ("تصوير", "Recording", "Aufnahme"),
    "status_editing": ("مونتاج", "Editing", "Schnitt"),
    "status_review": ("مراجعة", "Review", "Prüfung"),
    "status_published": ("منشورة", "Published", "Veröffentlicht"),
    "status_on_hold": ("متوقفة", "On hold", "Pausiert"),
    "status_archived": ("مؤرشفة", "Archived", "Archiviert"),

    "lang_ar": ("العربية", "العربية (Arabic)", "العربية (Arabisch)"),
    "lang_en": ("English (الإنجليزية)", "English", "English (Englisch)"),
    "lang_de": ("Deutsch (الألمانية)", "Deutsch (German)", "Deutsch"),

    "studio_title": ("تحدّث إلى المخرج", "Talk to the director", "Mit der Regie sprechen"),
    "studio_hint": ("صف بصوتك أو بالكتابة ما تريد تصويره: الموضوع، الأجواء، الخلفية، الإضاءة، الموسيقى.", "Describe by voice or text what you want to film: topic, mood, background, lighting, music.", "Beschreibe per Sprache oder Text, was du drehen willst: Thema, Stimmung, Hintergrund, Licht, Musik."),
    "voice_language": ("لغة التعرف على الكلام", "Speech recognition language", "Sprache der Spracherkennung"),
    "record": ("ابدأ التسجيل", "Start recording", "Aufnahme starten"),
    "stop": ("إيقاف", "Stop", "Stopp"),
    "listening": ("يستمع الآن…", "Listening…", "Hört zu…"),
    "mic_permission_needed": ("يحتاج التسجيل إلى إذن الميكروفون. يمكنك الكتابة بدلاً منه.", "Recording needs microphone permission. You can type instead.", "Die Aufnahme braucht die Mikrofonberechtigung. Du kannst stattdessen tippen."),
    "speech_unavailable": ("التعرف على الكلام غير متاح على هذا الجهاز.", "Speech recognition is not available on this device.", "Spracherkennung ist auf diesem Gerät nicht verfügbar."),
    "speech_error": ("تعذّر التعرف على الكلام (رمز %1$d). حاول مرة أخرى أو اكتب النص.", "Speech recognition failed (code %1$d). Try again or type.", "Spracherkennung fehlgeschlagen (Code %1$d). Erneut versuchen oder tippen."),
    "transcript_label": ("النص — يمكنك تعديله قبل الإرسال", "Transcript — edit before sending", "Transkript — vor dem Senden bearbeitbar"),
    "send_to_director": ("أرسل إلى المخرج التنفيذي", "Send to Executive Director", "An die Gesamtregie senden"),
    "working": ("جارٍ العمل…", "Working…", "Wird bearbeitet…"),
    "no_provider_error": ("لا يوجد مزوّد مفعّل. أضف مفتاح API واختر نموذجاً وفعّله في مركز الذكاء الاصطناعي، أو فعّل وضع العرض التجريبي.", "No provider is enabled. Add an API key, choose a model and enable it in the AI Control Center, or turn on demo mode.", "Kein Anbieter aktiv. Füge im KI-Zentrum einen API-Schlüssel hinzu, wähle ein Modell und aktiviere es, oder schalte den Demo-Modus ein."),
    "plan_from": ("الخطة من: %1$s", "Plan from: %1$s", "Plan von: %1$s"),
    "plan_invalid": ("تعذّرت قراءة الرد: %1$s", "Could not read the response: %1$s", "Antwort nicht lesbar: %1$s"),
    "demo_badge": ("تجريبي — ليس حقيقياً", "DEMO — not real", "DEMO — nicht echt"),
    "approve": ("اعتماد", "Approve", "Freigeben"),
    "reject": ("رفض", "Reject", "Ablehnen"),
    "approved": ("معتمد", "Approved", "Freigegeben"),
    "rejected": ("مرفوض", "Rejected", "Abgelehnt"),
    "pending": ("بانتظار الموافقة", "Pending", "Ausstehend"),
    "needs_review": ("يحتاج مراجعة", "Needs review", "Prüfung nötig"),
    "use_script": ("انقل النص المقترح إلى المحرر", "Move suggested script to editor", "Vorgeschlagenes Skript in den Editor"),
    "script_copied": ("حُفظ كإصدار جديد — افتح المحرر", "Saved as new version — open editor", "Als neue Version gespeichert — Editor öffnen"),
    "concept": ("فكرة الحلقة", "Episode concept", "Folgenkonzept"),
    "emotional_direction": ("الاتجاه العاطفي", "Emotional direction", "Emotionale Richtung"),
    "backgrounds_label": ("الخلفيات", "Backgrounds", "Hintergründe"),
    "camera_label": ("الكاميرا", "Camera", "Kamera"),
    "lighting_label": ("الإضاءة", "Lighting", "Licht"),
    "images_label": ("الصور المطلوبة", "Required images", "Benötigte Bilder"),
    "videos_label": ("الفيديوهات المطلوبة", "Required videos", "Benötigte Videos"),
    "audio_label": ("الصوت المطلوب", "Required audio", "Benötigtes Audio"),
    "scenes_label": ("المشاهد", "Scenes", "Szenen"),
    "timeline_label": ("الخط الزمني", "Timeline", "Zeitleiste"),
    "history_label": ("سجل الأوامر الصوتية", "Voice command history", "Verlauf der Sprachbefehle"),
    "reuse": ("استخدم مرة أخرى", "Use again", "Erneut verwenden"),

    "undo": ("تراجع", "Undo", "Rückgängig"),
    "redo": ("إعادة", "Redo", "Wiederholen"),
    "import_file": ("استيراد ملف TXT أو MD", "Import TXT or MD file", "TXT- oder MD-Datei importieren"),
    "save_version": ("حفظ إصدار", "Save version", "Version speichern"),
    "build_scenes": ("بناء المشاهد", "Build scenes", "Szenen bauen"),
    "words_duration": ("%1$d كلمة · نحو %2$s للقراءة (تقدير)", "%1$d words · about %2$s to read (estimate)", "%1$d Wörter · etwa %2$s Lesezeit (Schätzung)"),
    "autosaved": ("حُفظت المسودة", "Draft saved", "Entwurf gespeichert"),
    "script_hint": ("اكتب النص هنا. ابدأ السطر بـ # لبداية مشهد جديد، أو اترك سطراً فارغاً بين الفقرات.", "Write the script here. Start a line with # for a new scene, or leave a blank line between paragraphs.", "Schreibe hier das Skript. Beginne eine Zeile mit # für eine neue Szene oder lasse eine Leerzeile zwischen Absätzen."),
    "scenes_built": ("المشاهد: %1$d بلا تغيير، %2$d محدّث، %3$d جديد، %4$d للمراجعة. لم يُحذف أي مشهد أو مادة معتمدة.", "Scenes: %1$d unchanged, %2$d updated, %3$d new, %4$d flagged. Nothing approved was deleted.", "Szenen: %1$d unverändert, %2$d aktualisiert, %3$d neu, %4$d markiert. Nichts Freigegebenes wurde gelöscht."),
    "versions_label": ("الإصدارات السابقة", "Previous versions", "Frühere Versionen"),
    "version_item": ("الإصدار %1$d", "Version %1$d", "Version %1$d"),
    "restore": ("استعادة", "Restore", "Wiederherstellen"),

    "no_scenes": ("لا توجد مشاهد. اكتب النص ثم اضغط «بناء المشاهد».", "No scenes yet. Write the script, then tap “Build scenes”.", "Noch keine Szenen. Schreibe das Skript und tippe auf „Szenen bauen“."),
    "scenes_total": ("%1$d مشهد · المدة التقديرية %2$s", "%1$d scenes · estimated %2$s", "%1$d Szenen · geschätzt %2$s"),
    "estimate_suffix": ("(تقدير)", "(estimate)", "(Schätzung)"),
    "analyze_ai": ("حلّل بالذكاء الاصطناعي", "Analyse with AI", "Mit KI analysieren"),
    "add_asset": ("أضف مادة مطلوبة", "Add required asset", "Benötigtes Material hinzufügen"),
    "assets_label": ("المواد", "Assets", "Material"),
    "source_label": ("المصدر", "Source", "Quelle"),
    "edit_resets_approval": ("أي تعديل على عنصر معتمد يعيده إلى «يحتاج مراجعة».", "Editing an approved item sets it back to “Needs review”.", "Bearbeiten eines freigegebenen Elements setzt es auf „Prüfung nötig“ zurück."),
    "field_title": ("العنوان", "Title", "Titel"),
    "field_description": ("الوصف", "Description", "Beschreibung"),
    "field_narration": ("التعليق", "Narration", "Sprechertext"),
    "field_background": ("الخلفية", "Background", "Hintergrund"),
    "field_camera": ("زاوية الكاميرا", "Camera direction", "Kameraführung"),
    "field_lighting": ("الإضاءة", "Lighting", "Licht"),
    "field_shot": ("نوع اللقطة", "Shot type", "Einstellungsgröße"),
    "field_movement": ("حركة الكاميرا", "Camera movement", "Kamerabewegung"),
    "field_subtitles": ("الترجمة", "Subtitles", "Untertitel"),
    "field_timeline": ("تعليمات الخط الزمني", "Timeline instructions", "Zeitleisten-Anweisungen"),
    "asset_image": ("صورة", "Image", "Bild"),
    "asset_video": ("فيديو", "Video", "Video"),
    "asset_audio": ("صوت", "Audio", "Audio"),
    "asset_music": ("موسيقى", "Music", "Musik"),
    "asset_sfx": ("مؤثرات صوتية", "Sound effects", "Soundeffekte"),
    "asset_subtitle": ("ترجمة", "Subtitle", "Untertitel"),
    "asset_background": ("خلفية", "Background", "Hintergrund"),

    "bg_title": ("مخرج الخلفيات", "Background Director", "Hintergrund-Regie"),
    "bg_context": ("سياق إضافي (اختياري)", "Extra context (optional)", "Zusätzlicher Kontext (optional)"),
    "bg_generate": ("اقترح 5 خلفيات", "Suggest 5 backgrounds", "5 Hintergründe vorschlagen"),
    "bg_generate_another": ("اقتراح آخر", "Generate another", "Weiteren erzeugen"),
    "bg_add_to_scene": ("أضف إلى مشهد", "Add to scene", "Zur Szene hinzufügen"),
    "bg_choose_scene": ("اختر المشهد", "Choose scene", "Szene wählen"),
    "bg_only_approved": ("يمكن إضافة الخلفية إلى مشهد بعد اعتمادها فقط.", "A background can be added to a scene only after approval.", "Ein Hintergrund kann erst nach Freigabe einer Szene hinzugefügt werden."),
    "bg_attached": ("مرتبطة بمشهد", "Attached to scene", "Mit Szene verknüpft"),
    "bg_preview_unavailable": ("صورة المعاينة تحتاج مزوّد توليد صور، وهو في المرحلة 3. الاقتراحات الآن نصية.", "Preview images need an image provider (phase 3). Suggestions are text for now.", "Vorschaubilder brauchen einen Bildanbieter (Phase 3). Vorschläge sind vorerst Text."),
    "bg_cat_studio": ("خلفية استوديو حقيقية", "Real studio background", "Echter Studiohintergrund"),
    "bg_cat_green": ("شاشة خضراء", "Green screen", "Greenscreen"),
    "bg_cat_ai": ("خلفية مولّدة بالذكاء الاصطناعي", "AI-generated background", "KI-generierter Hintergrund"),
    "bg_cat_location": ("موقع حقيقي", "Real location", "Echter Drehort"),
    "bg_cat_video": ("فيديو خلفية سينمائي", "Cinematic video background", "Filmischer Videohintergrund"),
    "bg_colors": ("الألوان", "Colours", "Farben"),
    "bg_distance": ("المسافة بين الشخص والخلفية (تقريبية)", "Subject-to-background distance (approximate)", "Abstand Person–Hintergrund (ungefähr)"),
    "bg_lens": ("العدسة المقترحة", "Suggested lens", "Empfohlenes Objektiv"),
    "bg_davinci": ("التركيب في DaVinci Resolve", "Compositing in DaVinci Resolve", "Compositing in DaVinci Resolve"),

    "key_security_note": ("تُحفظ مفاتيح API مشفّرة على الجهاز عبر Android Keystore، ولا تُرسل إلا إلى المزوّد نفسه، ولا تظهر في السجلات. اشتراك ChatGPT أو Claude لا يشمل الـ API.", "API keys are stored encrypted on the device with Android Keystore, are sent only to their own provider and never logged. A ChatGPT or Claude subscription does not include API access.", "API-Schlüssel werden mit Android Keystore verschlüsselt auf dem Gerät gespeichert, nur an den jeweiligen Anbieter gesendet und nie protokolliert. Ein ChatGPT- oder Claude-Abo enthält keinen API-Zugang."),
    "mode_label": ("طريقة العمل", "Mode", "Modus"),
    "mode_single": ("نموذج واحد", "Single model", "Ein Modell"),
    "mode_compare": ("مقارنة كل المفعّلين", "Compare all enabled", "Alle aktiven vergleichen"),
    "mode_compare_cost": ("المقارنة ترسل الطلب نفسه إلى كل مزوّد مفعّل، فتتضاعف التكلفة.", "Compare sends the same request to every enabled provider, multiplying cost.", "Vergleichen sendet dieselbe Anfrage an jeden aktiven Anbieter und vervielfacht die Kosten."),
    "demo_mode": ("وضع العرض التجريبي", "Demo mode", "Demo-Modus"),
    "demo_mode_desc": ("أمثلة ثابتة معلّمة بـ «تجريبي» لتجربة الواجهة دون مفاتيح. ليست ذكاءً اصطناعياً.", "Fixed samples labelled DEMO to try the interface without keys. Not AI.", "Feste, als DEMO markierte Beispiele zum Testen ohne Schlüssel. Keine KI."),
    "enabled": ("مفعّل", "Enabled", "Aktiv"),
    "api_key": ("مفتاح API", "API key", "API-Schlüssel"),
    "api_key_saved": ("مفتاح محفوظ ومشفّر", "Key saved (encrypted)", "Schlüssel gespeichert (verschlüsselt)"),
    "remove_key": ("حذف المفتاح", "Remove key", "Schlüssel entfernen"),
    "model": ("معرّف النموذج", "Model id", "Modell-ID"),
    "fetch_models": ("اختر من النماذج المتاحة", "Pick from available models", "Aus verfügbaren Modellen wählen"),
    "test_connection": ("اختبار الاتصال", "Test connection", "Verbindung testen"),
    "connection_ok": ("الاتصال ناجح — %1$d نموذجاً متاحاً", "Connected — %1$d models available", "Verbunden — %1$d Modelle verfügbar"),
    "connection_failed": ("فشل الاتصال: %1$s", "Connection failed: %1$s", "Verbindung fehlgeschlagen: %1$s"),
    "preferred": ("المزوّد المفضّل", "Preferred provider", "Bevorzugter Anbieter"),
    "capabilities_label": ("قدرات التوليد", "Generation capabilities", "Generierungsfunktionen"),
    "capability_unavailable": ("النص: Claude وChatGPT وGemini. توليد الصور والفيديو والصوت: لا يوجد مزوّد بعد (المرحلة 3)، ولن يُعرض أي ناتج مزيّف.", "Text: Claude, ChatGPT, Gemini. Image, video and audio generation: no provider yet (phase 3); no fake output is shown.", "Text: Claude, ChatGPT, Gemini. Bild-, Video- und Audiogenerierung: noch kein Anbieter (Phase 3); es wird nichts vorgetäuscht."),
    "usage_label": ("الاستهلاك (توكنات)", "Usage (tokens)", "Nutzung (Tokens)"),
    "tokens": ("%1$s · %2$s · دخل %3$s / خرج %4$s", "%1$s · %2$s · in %3$s / out %4$s", "%1$s · %2$s · ein %3$s / aus %4$s"),

    "app_language": ("لغة التطبيق", "App language", "App-Sprache"),
    "app_language_hint": ("العربية من اليمين إلى اليسار، والإنجليزية والألمانية من اليسار إلى اليمين.", "Arabic is right-to-left; English and German are left-to-right.", "Arabisch läuft von rechts nach links, Englisch und Deutsch von links nach rechts."),
    "about_label": ("حول التطبيق", "About", "Über"),
    "version_label": ("الإصدار %1$s", "Version %1$s", "Version %1$s"),
    "about_text": ("الشريحة الأولى: الحلقات، المخرج الصوتي، المخرج التنفيذي، مخرج الخلفيات، محرر النص، منشئ المشاهد. الكاميرا وDaVinci في شرائح لاحقة.", "Slice 1: episodes, voice director, executive director, background director, script editor, scene builder. Camera and DaVinci come in later slices.", "Abschnitt 1: Folgen, Sprachregie, Gesamtregie, Hintergrund-Regie, Skript-Editor, Szenen-Builder. Kamera und DaVinci folgen später."),
}


def esc(value: str) -> str:
    v = escape(value)
    v = v.replace("'", "\\'").replace('"', '\\"')
    if v.startswith("@") or v.startswith("?"):
        v = "\\" + v
    return v


def write(folder: str, idx: int) -> None:
    path = os.path.join(ROOT, folder)
    os.makedirs(path, exist_ok=True)
    lines = ['<?xml version="1.0" encoding="utf-8"?>', "<resources>"]
    for key, vals in S.items():
        extra = ""
        lines.append(f'    <string name="{key}"{extra}>{esc(vals[idx])}</string>')
    lines.append("</resources>")
    with open(os.path.join(path, "strings.xml"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")


if __name__ == "__main__":
    write("values", 0)
    write("values-en", 1)
    write("values-de", 2)
    print(f"{len(S)} strings x 3 languages")
