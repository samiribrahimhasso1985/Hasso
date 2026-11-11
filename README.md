# AI DIRECTOR FX3 — DISCOVERIES · اكتشافات

تطبيق Android لمساعدة الإخراج السينمائي لسلسلة «اكتشافات» (فيديو عمودي 9:16).
Android app that acts as an AI directing assistant for the vertical documentary series DISCOVERIES.

**الإصدار:** `0.1.0-slice1` — الشريحة الأولى (Vertical Slice 1).

## ما الموجود في هذه الشريحة

| الوحدة | الحالة |
| --- | --- |
| لوحة التحكم، الحلقات، الأرشيف بالحالات الـ11 | مبني |
| ترقيم المسودة D-001 والرقم الرسمي عند النشر فقط | مبني + اختبارات |
| المخرج الصوتي (Android SpeechRecognizer: ar-IQ / en-US / de-DE) | مبني، يحتاج اختباراً على الجهاز |
| المخرج التنفيذي (خطة إنتاج JSON) عبر Claude / ChatGPT / Gemini | مبني، يحتاج مفتاح API |
| مخرج الخلفيات (5 فئات، اعتماد/رفض/تعديل/إضافة لمشهد) | مبني، نصي فقط (المعاينة بالصور في المرحلة 3) |
| محرر النص (حفظ تلقائي، تراجع/إعادة، إصدارات، استيراد TXT/MD) | مبني |
| منشئ المشاهد (تقسيم، تقدير المدة، إعادة تحليل ما تغيّر فقط) | مبني + اختبارات |
| مركز الذكاء الاصطناعي (مفاتيح مشفّرة، نموذج واحد/مقارنة، اختبار اتصال حقيقي) | مبني |
| واجهة عربية RTL + الإنجليزية + الألمانية | مبني |
| كاميرا Sony FX3، الملقّن، DaVinci، جسر ويندوز | غير مبني بعد — انظر IMPLEMENTATION_STATUS.md |

## البناء

```bash
./gradlew testDebugUnitTest   # الاختبارات
./gradlew assembleDebug       # ملف APK
```

ملف APK الناتج: `app/build/outputs/apk/debug/app-debug.apk`

يُبنى تلقائياً أيضاً عبر GitHub Actions عند كل push (`.github/workflows/android.yml`)، ويُرفع ملف APK كـ artifact.

المتطلبات: JDK 17، Android SDK 34. minSdk 26 (Android 8.0).

## الوثائق

- [ARCHITECTURE.md](ARCHITECTURE.md) — البنية
- [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) — ما المنفّذ وما المختبر وما الناقص
- [API_SETUP.md](API_SETUP.md) — إعداد مفاتيح الذكاء الاصطناعي
- [CAMERA_COMPATIBILITY.md](CAMERA_COMPATIBILITY.md) — وضع Sony FX3
- [DAVINCI_SETUP.md](DAVINCI_SETUP.md) — وضع DaVinci Resolve 21
- [TEST_REPORT.md](TEST_REPORT.md) — نتائج الاختبارات
- [PROJECT_AUDIT.md](PROJECT_AUDIT.md) — فحص المشروع قبل البدء

النصوص المترجمة تُولَّد من `tools/gen_strings.py`.
