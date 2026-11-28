package com.directormodepro.desktop

import androidx.compose.runtime.staticCompositionLocalOf
import com.directormodepro.app.link.LinkFailure
import com.directormodepro.app.link.LinkState

enum class Lang(val tag: String, val native: String, val rtl: Boolean) {
    AR("ar", "العربية", true), DE("de", "Deutsch", false), EN("en", "English", false)
}

/** All desktop UI text. Arabic, German and English, same keys as the Android app where possible. */
data class Strings(
    val console: String,
    val subtitle: String,
    val devices: String,
    val linked: String,
    val nearby: String,
    val searching: String,
    val addByAddress: String,
    val link: String,
    val remove: String,
    val retry: String,
    val pinTitle: String,
    val pinHint: String,
    val pinLabel: String,
    val addressLabel: String,
    val errAddress: String,
    val errPin: String,
    val cancel: String,
    val recordAll: String,
    val stopAll: String,
    val emptyTitle: String,
    val emptySteps: List<String>,
    val take: String,
    val camerasReady: String,
    val connecting: String,
    val linkedState: String,
    val reconnecting: String,
    val wrongPin: String,
    val tooMany: String,
    val busy: String,
    val protocol: String,
    val unreachable: String,
    val noPreview: String,
    val flip: String,
    val free: String,
    val demoNote: String
) {
    fun state(s: LinkState): String = when (s) {
        LinkState.Connecting -> connecting
        is LinkState.Linked -> linkedState
        LinkState.Reconnecting -> reconnecting
        is LinkState.Failed -> when (s.reason) {
            LinkFailure.WRONG_PIN -> wrongPin
            LinkFailure.TOO_MANY_ATTEMPTS -> tooMany
            LinkFailure.BUSY -> busy
            LinkFailure.PROTOCOL_MISMATCH -> protocol
            LinkFailure.UNREACHABLE -> unreachable
        }
    }
}

val Arabic = Strings(
    console = "غرفة التحكم",
    subtitle = "نسخة الكمبيوتر — تتحكم بهواتف الكاميرا على نفس الشبكة",
    devices = "الأجهزة",
    linked = "الهواتف المرتبطة",
    nearby = "أجهزة قريبة",
    searching = "جارٍ البحث… يجب أن تعرض هواتف الكاميرا رمزها وأن تكون على نفس شبكة Wi-Fi.",
    addByAddress = "إضافة بالعنوان",
    link = "ربط",
    remove = "إزالة",
    retry = "إعادة المحاولة",
    pinTitle = "ربط %s",
    pinHint = "أدخل الرمز المكوّن من 6 أرقام الظاهر على هاتف الكاميرا.",
    pinLabel = "الرمز",
    addressLabel = "العنوان (IP:المنفذ)",
    errAddress = "أدخل العنوان الظاهر على هاتف الكاميرا، مثال: 192.168.1.23:40123",
    errPin = "الرمز مكوّن من 6 أرقام.",
    cancel = "إلغاء",
    recordAll = "● تسجيل الكل",
    stopAll = "■ إيقاف الكل",
    emptyTitle = "لا توجد كاميرات مرتبطة بعد",
    emptySteps = listOf(
        "افتح التطبيق على الهاتف واختر دور «كاميرا».",
        "تأكد أن الهاتف والكمبيوتر على نفس شبكة Wi-Fi.",
        "اضغط «ربط» بجانب الهاتف في القائمة، وأدخل الرمز الظاهر عليه."
    ),
    take = "اللقطة",
    camerasReady = "%d مرتبطة",
    connecting = "جارٍ الاتصال…",
    linkedState = "مرتبط",
    reconnecting = "انقطع الاتصال — جارٍ إعادة الاتصال…",
    wrongPin = "رمز خاطئ",
    tooMany = "محاولات خاطئة كثيرة — أنشأت الكاميرا رمزاً جديداً",
    busy = "مرتبط بمخرج آخر",
    protocol = "إصدار مختلف من التطبيق على هاتف الكاميرا",
    unreachable = "لا يمكن الوصول — تحقق من شبكة Wi-Fi",
    noPreview = "لا توجد معاينة من هذا الهاتف",
    flip = "قلب",
    free = "متاح",
    demoNote = "وضع تجريبي (DEMO): كاميرات وهمية للاختبار فقط"
)

val German = Strings(
    console = "Regieraum",
    subtitle = "Desktop-Version — steuert Kameratelefone im selben Netzwerk",
    devices = "Geräte",
    linked = "Verbundene Telefone",
    nearby = "In der Nähe",
    searching = "Suche läuft… Die Kameratelefone müssen ihren Code zeigen und im selben WLAN sein.",
    addByAddress = "Per Adresse hinzufügen",
    link = "Verbinden",
    remove = "Entfernen",
    retry = "Erneut versuchen",
    pinTitle = "%s verbinden",
    pinHint = "Geben Sie den 6-stelligen Code vom Kameratelefon ein.",
    pinLabel = "Code",
    addressLabel = "Adresse (IP:Port)",
    errAddress = "Adresse wie auf dem Kameratelefon eingeben, z. B. 192.168.1.23:40123",
    errPin = "Der Code hat 6 Ziffern.",
    cancel = "Abbrechen",
    recordAll = "● Alle aufnehmen",
    stopAll = "■ Alle stoppen",
    emptyTitle = "Noch keine Kameras verbunden",
    emptySteps = listOf(
        "Öffnen Sie die App auf dem Telefon und wählen Sie die Rolle „Kamera“.",
        "Telefon und Computer müssen im selben WLAN sein.",
        "Klicken Sie neben dem Telefon auf „Verbinden“ und geben Sie den angezeigten Code ein."
    ),
    take = "Take",
    camerasReady = "%d verbunden",
    connecting = "Verbinde…",
    linkedState = "Verbunden",
    reconnecting = "Verbindung verloren — verbinde neu…",
    wrongPin = "Falscher Code",
    tooMany = "Zu viele falsche Codes — die Kamera hat einen neuen Code erstellt",
    busy = "Bereits mit einer anderen Regie verbunden",
    protocol = "Andere App-Version auf dem Kameratelefon",
    unreachable = "Nicht erreichbar — WLAN prüfen",
    noPreview = "Keine Vorschau von diesem Telefon",
    flip = "Wenden",
    free = "frei",
    demoNote = "DEMO-Modus: simulierte Kameras nur zum Testen"
)

val English = Strings(
    console = "Control room",
    subtitle = "Desktop edition — controls camera phones on the same network",
    devices = "Devices",
    linked = "Linked phones",
    nearby = "Nearby",
    searching = "Searching… Camera phones must show their code and be on the same Wi-Fi.",
    addByAddress = "Add by address",
    link = "Link",
    remove = "Remove",
    retry = "Retry",
    pinTitle = "Link %s",
    pinHint = "Enter the 6-digit code shown on the camera phone.",
    pinLabel = "Code",
    addressLabel = "Address (IP:port)",
    errAddress = "Enter the address shown on the camera phone, e.g. 192.168.1.23:40123",
    errPin = "The code has 6 digits.",
    cancel = "Cancel",
    recordAll = "● Record all",
    stopAll = "■ Stop all",
    emptyTitle = "No cameras linked yet",
    emptySteps = listOf(
        "Open the app on the phone and choose the “Camera” role.",
        "Make sure the phone and this computer are on the same Wi-Fi.",
        "Click “Link” next to the phone and enter the code it shows."
    ),
    take = "Take",
    camerasReady = "%d linked",
    connecting = "Connecting…",
    linkedState = "Linked",
    reconnecting = "Connection lost — reconnecting…",
    wrongPin = "Wrong code",
    tooMany = "Too many wrong codes — the camera made a new code",
    busy = "Already linked to another director",
    protocol = "Different app version on the camera phone",
    unreachable = "Not reachable — check the Wi-Fi",
    noPreview = "No preview from this phone",
    flip = "Flip",
    free = "free",
    demoNote = "DEMO mode: simulated cameras for testing only"
)

fun stringsFor(lang: Lang) = when (lang) {
    Lang.AR -> Arabic
    Lang.DE -> German
    Lang.EN -> English
}

val LocalStrings = staticCompositionLocalOf { Arabic }
