# EZIDINET CONNECT — Complete Social Communication System (owner specification, 2026-11-28)

> Stored verbatim as received from the product owner. It extends and replaces the earlier EZIDINET CONNECT v1.0 message
> (Friends, Messenger, Calls, Groups, Discover, Presence, Moments, QR Connect, Contacts, Translation, Notifications,
> Privacy & Security, Admin). Implementation plan: [`../EZIDINET_CONNECT_PLAN.md`](../EZIDINET_CONNECT_PLAN.md).
> Binding rules from the v1.0 message that remain in force: do not claim E2EE before it is implemented and tested;
> never import phone contacts without explicit consent; never start call recording automatically; never use religion,
> origin or sensitive data to guess relationships or suggest people; never buy paid services without stating the cost;
> administrators can never read end-to-end-encrypted chats.

---

اضف هذا الي تصميم EZIDINET CONNECT
Complete Social Communication System

أريد منك تطوير قسم متكامل للتواصل الاجتماعي داخل منصة EZIDINET الحالية.
مهم جداً: لا تنشئ مشروعاً جديداً ولا تستبدل الموقع الحالي. افحص بنية المشروع الحالية، والتقنيات المستخدمة، وقاعدة البيانات، ونظام تسجيل الدخول، ثم أضف EZIDINET CONNECT بطريقة متوافقة مع النظام الموجود.
الهدف هو إنشاء نظام تواصل اجتماعي حقيقي يعمل بين الأعضاء المسجلين، وليس مجرد تصميم تجريبي.

## 1. EZIDINET MESSENGER
أنشئ نظام محادثات فورية يتضمن:
- محادثات فردية بين عضوين.
- محادثات جماعية.
- إرسال واستقبال الرسائل فورياً.
- إرسال الصور والفيديوهات.
- إرسال الملفات والمستندات.
- إرسال الرسائل الصوتية.
- الرد على رسالة محددة.
- تعديل الرسائل.
- حذف الرسائل.
- التفاعل مع الرسائل بالإيموجي.
- تثبيت الرسائل المهمة.
- البحث داخل المحادثات.
- عرض آخر رسالة وتاريخها.
- مؤشر الكتابة.
- حالة الرسالة: Sent / Delivered / Read.
- إشعارات الرسائل الجديدة.
- كتم المحادثات وأرشفتها.

يجب أن تعمل المحادثات دون الحاجة إلى تحديث الصفحة.

## 2. EZIDINET FRIENDS
أنشئ نظام الأصدقاء والمتابعين:
- إرسال طلبات الصداقة.
- قبول ورفض الطلبات.
- إلغاء الطلبات.
- حذف صديق.
- متابعة وإلغاء متابعة الأعضاء.
- عرض الأصدقاء المشتركين.
- اقتراح أصدقاء جدد.
- قائمة الأصدقاء.
- قائمة المتابعين.
- قائمة طلبات الصداقة.
- إعدادات من يستطيع إرسال طلبات الصداقة.

حالات الطلب: PENDING · ACCEPTED · REJECTED · CANCELLED · BLOCKED

## 3. EZIDINET VOICE & VIDEO CALLS
أنشئ نظام مكالمات حقيقية:
- مكالمات صوتية فردية.
- مكالمات فيديو فردية.
- مكالمات جماعية.
- قبول المكالمة ورفضها.
- تشغيل وإيقاف الكاميرا.
- كتم وتشغيل الميكروفون.
- تشغيل مكبر الصوت.
- دعوة أعضاء أثناء المكالمة.
- إنهاء المكالمة.
- سجل المكالمات.
- إشعار بالمكالمات الواردة والفائتة.

استخدم WebRTC مع: Signaling Server · WebSocket أو Socket.IO · STUN/TURN · معالجة انقطاع الاتصال وإعادة الاتصال.
لا تستخدم واجهة شكلية بدلاً من المكالمات الحقيقية.

## 4. EZIDINET GROUPS
أنشئ نظام مجموعات متكامل:
- إنشاء مجموعة جديدة.
- اسم المجموعة وصورتها ووصفها.
- مجموعات عامة وخاصة.
- دعوة الأعضاء.
- طلب الانضمام.
- قبول ورفض طلبات الانضمام حسب إعدادات المجموعة.
- تعيين مدير ومشرفين.
- إزالة الأعضاء.
- مغادرة المجموعة.
- محادثات جماعية.
- مشاركة الصور والفيديوهات والملفات.
- استطلاعات الرأي.
- مكالمات جماعية.

الصلاحيات: OWNER · ADMIN · MODERATOR · MEMBER
اربط المجموعات بنظام المجتمعات والمختبرات الموجود في EZIDINET، وتجنب إنشاء نظامين متعارضين.

## 5. EZIDINET VOICE ROOMS
أنشئ غرفاً صوتية مباشرة:
- إنشاء غرفة صوتية.
- اختيار اسم وصورة الغرفة.
- غرفة عامة أو خاصة.
- الدخول والاستماع.
- طلب التحدث.
- قبول المتحدثين.
- كتم المتحدثين.
- تعيين مشرفين.
- إزالة المشاركين.
- مغادرة الغرفة.
- عرض عدد الموجودين.
- عرض المتحدث الحالي.

أنواع الغرف: Open Discussions · Language Exchange · Business Talks · Community Meetings · Cultural Discussions · Learning Rooms
يجب أن تكون الغرف تفاعلية وتعمل في الوقت الفعلي.

## 6. EZIDINET MOMENTS
أنشئ نظام اللحظات:
- نشر صورة.
- نشر فيديو قصير.
- تحديد جمهور المشاهدة.
- عرض اللحظات لمدة 24 ساعة.
- مشاهدة لحظات الأصدقاء والمتابعين.
- الرد والتفاعل.
- عرض المشاهدات.
- إعدادات الخصوصية.

تُعرض اللحظات ضمن قسم مستقل، ولا تنشئ قسماً ثالثاً للفيديوهات؛ تظل أقسام الفيديو الرسمية Public Videos وFamily Videos فقط.

## 7. EZIDINET SMART CONNECTION
أنشئ نظام اقتراحات ذكي:
- اقتراح أشخاص لديهم اهتمامات مشتركة.
- اقتراح أصدقاء مشتركين.
- اقتراح أعضاء يتحدثون اللغة نفسها.
- اقتراح أصحاب المهن والمهارات.
- اقتراح مجموعات مناسبة.
- اكتشاف المجتمعات المشتركة.
- اقتراح اتصالات مهنية.

اعتمد على المعلومات التي اختار العضو إظهارها فقط. لا تستنتج الدين أو الأصل أو أي بيانات حساسة من الاسم أو الصورة أو الموقع.

## 8. EZIDINET TRANSLATOR
أضف ترجمة اختيارية للمحادثات:
اللغات الأساسية: العربية · الكرمانجية · الألمانية · الإنجليزية.
الوظائف:
- ترجمة الرسائل النصية.
- عرض النص الأصلي والترجمة.
- اختيار اللغة المفضلة.
- تشغيل وإيقاف الترجمة.
- ترجمة الرسائل الصوتية بعد تحويلها إلى نص.
- عدم تغيير الرسالة الأصلية.

## 9. ONLINE STATUS
أضف حالات الاتصال: Online · Offline · Busy · Away · Invisible
مع:
- آخر ظهور.
- مؤشر الاتصال.
- التحكم بمن يستطيع رؤية الحالة.
- إخفاء آخر ظهور.
- تعطيل حالة الاتصال.

## 10. NOTIFICATIONS
أنشئ نظام إشعارات موحداً:
- رسائل جديدة.
- طلبات صداقة.
- قبول طلبات الصداقة.
- متابعون جدد.
- مكالمات واردة.
- مكالمات فائتة.
- دعوات المجموعات.
- طلبات الانضمام.
- رسائل المجموعات.
- دعوات الغرف الصوتية.

دعم: In-App Notifications · Push Notifications · Notification Settings · Do Not Disturb.

## 11. PRIVACY & SECURITY
نفذ:
- حظر الأعضاء.
- الإبلاغ عن الحسابات.
- الإبلاغ عن الرسائل.
- التحكم في استقبال الرسائل.
- التحكم في طلبات الصداقة.
- حماية الملفات والمرفقات.
- صلاحيات الوصول إلى المحادثات.
- تحديد حجم الملفات المسموح.
- Rate Limiting.
- حماية الحسابات من Spam.
- تسجيل العمليات الإدارية المهمة.

لا تدّعِ وجود تشفير طرف إلى طرف E2EE إلا بعد تنفيذه فعلياً واختباره باستخدام إدارة مفاتيح صحيحة.
لا تسمح للإدارة بقراءة المحادثات المشفرة طرفاً إلى طرف.

## 12. DATABASE
أنشئ أو حدّث جداول قاعدة البيانات حسب بنية المشروع الحالية:
users · friendships · friend_requests · follows · conversations · conversation_members · messages · message_attachments · message_reactions · message_receipts · message_requests · calls · call_participants · groups · group_members · group_invitations · stories · story_views · story_reactions · user_presence · blocked_users · user_reports · notifications · user_privacy_settings · user_notification_settings · voice_rooms · voice_room_participants

المتطلبات:
- UUID للمعرفات.
- Foreign Keys.
- Indexes.
- Pagination.
- حماية البيانات.
- منع التكرار.
- التحقق من صلاحيات المستخدم في الخادم وليس الواجهة فقط.

## 13. USER INTERFACE
صمم واجهة احترافية متناسقة مع هوية EZIDINET.
التصميم: Modern Premium UI · Minimal Design · Responsive Design · دعم العربية RTL · دعم الألمانية والإنجليزية LTR · ألوان EZIDINET الرسمية · أيقونات واضحة · حركات انتقال ناعمة · دعم الهاتف والكمبيوتر والتابلت · Light Mode وDark Mode.

القائمة السفلية للهاتف: Home · Friends · Messenger · Discover · Profile
داخل Messenger: Chats · Groups · Calls · Message Requests · Voice Rooms

## 14. ADMIN DASHBOARD
أضف أدوات الإدارة اللازمة:
- مراجعة البلاغات.
- إدارة الحسابات المخالفة.
- إدارة الغرف الصوتية العامة.
- مراجعة إساءة الاستخدام.
- إيقاف الحسابات المخالفة.
- استقبال طلبات الاستئناف.
- سجل العمليات الإدارية.
- أدوات مكافحة الحسابات الوهمية والرسائل المزعجة.

يجب أن تكون صلاحيات الإدارة محدودة وموثقة.

## 15. DEVELOPMENT PHASES
نفّذ العمل بالتدريج:
- PHASE 1: Friends · Friend Requests · Followers · Discover People · Online Status · Privacy.
- PHASE 2: Messenger · Text Messages · Images · Videos · Files · Voice Messages · Notifications.
- PHASE 3: Groups · Group Chat · Group Management.
- PHASE 4: Voice Calls · Video Calls · Group Calls.
- PHASE 5: Voice Rooms · Translator · Smart Connections · Moments.

## 16. TESTING & ACCEPTANCE
قبل اعتبار أي مرحلة مكتملة:
1. أنشئ حسابين تجريبيين على الأقل.
2. اختبر إرسال واستقبال طلبات الصداقة.
3. اختبر المحادثات بين الحسابات.
4. اختبر وصول الرسائل فورياً.
5. اختبر الصور والفيديوهات والملفات.
6. اختبر الرسائل الصوتية.
7. اختبر المكالمات على أجهزة مختلفة.
8. اختبر المجموعات.
9. اختبر الغرف الصوتية.
10. اختبر الترجمة.
11. اختبر الخصوصية والحظر.
12. اختبر الهاتف والكمبيوتر.
13. أصلح الأخطاء قبل الانتقال إلى المرحلة التالية.

## 17. IMPORTANT DEVELOPMENT RULES
- افحص المشروع الحالي قبل تعديل أي ملف.
- لا تحذف وظائف موجودة.
- لا تنشئ بيانات وهمية على أنها بيانات حقيقية.
- لا تضع أزراراً لا تعمل.
- لا تستخدم Mockup بديلاً عن الوظائف الحقيقية.
- اربط كل وظيفة بقاعدة البيانات والـ Backend.
- استخدم Realtime Communication.
- حافظ على نظام تسجيل الدخول الحالي.
- لا تشترِ خدمات مدفوعة دون توضيح التكلفة.
- لا تنتقل إلى المرحلة التالية قبل اختبار المرحلة الحالية.
- اعرض لي تقريراً بعد كل مرحلة يتضمن ما تم تنفيذه وما لم يتم تنفيذه والأخطاء المتبقية.

## النتيجة المطلوبة
أريد EZIDINET CONNECT كنظام تواصل اجتماعي حقيقي ومتكامل داخل EZIDINET، يستطيع الأعضاء من خلاله التعارف والتواصل والمراسلة وإجراء المكالمات وإنشاء المجموعات والغرف الصوتية.
ابدأ الآن بفحص المشروع الحالي، ثم قدم خطة تنفيذ مرتبطة ببنيته الفعلية، وبعدها ابدأ PHASE 1.
