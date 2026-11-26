# إنشاء APK — DIRECTOR MODE PRO

## ما الذي ينتجه البناء الحالي؟

ينتج `app-debug.apk` نسخة Android تجريبية قابلة للتثبيت لاختبار واجهات التطبيق والبنية الأساسية. لا يعني نجاح البناء أن بث الكاميرات أو التحكم بها أصبحا جاهزين؛ هذه الوظائف لا تزال بحاجة إلى تنفيذ واختبار محولات الأجهزة الحقيقية.

## البناء محلياً باستخدام Android Studio

1. افتح مجلد المشروع `director_mode_pro` في Android Studio.
2. ثبّت Android SDK Platform 36 وJDK 17 عند الطلب.
3. انتظر اكتمال Gradle Sync.
4. اختر **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
5. بعد نجاح البناء ستجد الملف هنا:

   `app/build/outputs/apk/debug/app-debug.apk`

## البناء تلقائياً عبر GitHub Actions

1. ارفع مجلد المشروع إلى مستودع GitHub خاص أو عام.
2. ادفع الملفات إلى فرع `main` أو `master`.
3. افتح تبويب **Actions** في المستودع.
4. شغّل مهمة **Build DIRECTOR MODE PRO APK** أو انتظر تشغيلها بعد push.
5. افتح عملية البناء الناجحة، ثم نزّل Artifact باسم `director-mode-pro-debug-apk`.
6. فك ضغط Artifact لتحصل على `app-debug.apk`.

## التثبيت على الهاتف

انقل `app-debug.apk` إلى جهاز Android وافتحه. قد يطلب Android السماح بالتثبيت من هذا المصدر. اسمح به فقط إذا كنت قد بنيت الملف بنفسك أو تثق بمصدره.

## تنبيه أمني وإصدارات

- Debug APK مخصص للتطوير والاختبار، وليس إصداراً نهائياً للنشر العام.
- إصدار Release يحتاج إلى مفتاح توقيع خاص (keystore) وكلمات مرور تحفظ خارج مستودع GitHub، ويفضل تخزينها في GitHub Actions Secrets.
- لا ترفع ملف keystore أو كلمات مروره إلى Git.
- لا تعتبر حالات `NO SIGNAL` أو `Not connected` دليلاً على فشل الكاميرا؛ هي حالات واجهة أولية إلى أن يكتمل محرك الاتصال.
