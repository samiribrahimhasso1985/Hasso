# EZIDINET CONNECT — MASTER INTEGRATION & UNIFIED ARCHITECTURE (owner specification, 2026-11-28)

> Stored verbatim as received. "Consolidation of CONNECT Versions 1.0–13.0". In this project only two CONNECT texts
> were received before this one: v1.0 (summarised in `EZIDINET_CONNECT_SPEC.md`) and "Complete Social Communication
> System" (`EZIDINET_CONNECT_SPEC.md`). Versions 2.0–12.0 were not received here; the features they contain are taken
> from the lists in this document. Audit & inventory: [`../connect/CONNECT_FEATURE_INVENTORY.md`](../connect/CONNECT_FEATURE_INVENTORY.md).

---

ابدأ بجرد المشروع ودمج البنية، ثم نفّذ المراحل بالتدريج؛ فهذا يحمي المشروع من التكرار والأخطاء

EZIDINET CONNECT
MASTER INTEGRATION & UNIFIED ARCHITECTURE
Consolidation of CONNECT Versions 1.0–13.0

أريد دمج جميع إصدارات EZIDINET CONNECT من 1.0 إلى 13.0 في نظام اجتماعي عالمي واحد، متكامل ومترابط.
هذه المهمة ليست إنشاء نظام جديد من الصفر، بل مراجعة جميع الوظائف السابقة ودمجها في بنية موحدة واحترافية.
الهدف النهائي هو أن يصبح EZIDINET CONNECT مركز التواصل والتفاعل والتعاون الاجتماعي العالمي داخل منصة EZIDINET.

## 1. IMPORTANT — PROJECT AUDIT FIRST
قبل أي تعديل:
1. افحص المشروع الحالي بالكامل.
2. افحص جميع صفحات CONNECT.
3. افحص قاعدة البيانات والجداول والعلاقات.
4. افحص API وBackend.
5. افحص نظام تسجيل الدخول والمستخدمين.
6. افحص Messenger والمكالمات والمجموعات.
7. افحص أنظمة الإشعارات والخصوصية.
8. افحص جميع الميزات التي تم تنفيذها سابقاً.
9. حدد الوظائف المكررة والمتشابهة.
10. أنشئ تقريراً يوضح الموجود والناقص والمتداخل.

لا تفترض أن جميع الأوامر السابقة نُفذت بالفعل.
لا تحذف أي وظيفة موجودة قبل التأكد من أنها مكررة فعلاً وأن بديلها يعمل.

## 2. NEW UNIFIED CONNECT STRUCTURE
أعد تنظيم CONNECT ضمن المراكز الرئيسية التالية:

### A. CONNECT HOME — الصفحة الرئيسية الاجتماعية
تحتوي على: Welcome Dashboard · Friends Overview · Online Members · Recent Messages · Incoming Calls · Friend Requests · Suggested Connections · Upcoming Activities · Active Live Rooms · Global Meetups · Group Activities · Social Events · Learning Sessions · Podcast Updates · Collaboration Requests · Community Updates.
اعرض المعلومات بناءً على بيانات المستخدم وصلاحياته الفعلية.

### B. CONNECT MESSENGER — مركز المحادثات والتواصل
ادمج جميع وظائف المراسلة في نظام واحد.
الوظائف: Private Messaging · Group Messaging · Community Messaging · Text Messages · Voice Messages · Images · Videos · File Sharing · Message Reactions · Replies · Forwarding · Editing · Deleting · Message Search · Pinned Messages · Voice Transcription · Optional Translation · Message Requests · Read Receipts · Typing Indicators · Conversation Notifications.
لا تنشئ أكثر من نظام Messenger.

### C. CONNECT FRIENDS & PEOPLE — الأصدقاء والتعارف
ادمج: Friends · Followers · Following · Friend Requests · Suggested Friends · Mutual Friends · People Discovery · Social Introductions · Trusted Connections · QR Connect · Online Status · Social Profiles.
البحث حسب المعلومات التي اختار العضو إتاحتها.
لا تستنتج الأصل أو الدين أو الهوية الحساسة من الصور أو الأسماء أو المواقع.

### D. CONNECT LIVE — التواصل المباشر
اجمع جميع الخدمات المباشرة: Voice Calls · Video Calls · Group Calls · Voice Rooms · Video Rooms · Live Meetings · Global Meetups · Live Discussions · Debates · Public Speaking Sessions · Language Practice · Live Learning · Community Radio · Live Podcast Sessions · Group Meetings · Watch Together.
استخدم بنية تقنية مشتركة للمكالمات والغرف المباشرة.
لا تنشئ نظام اتصال منفصلاً لكل ميزة.

### E. CONNECT GROUPS & COMMUNITIES — المجموعات والنوادي والدوائر
ادمج: Groups · Social Clubs · Social Circles · Global Circles · Interest Groups · Work Teams · Learning Groups · Cultural Groups · Creative Groups · Research Groups · Youth Communities · Community Labs.
أنشئ نظام عضوية وصلاحيات موحداً يدعم: Owner · Admin · Moderator · Member · Contributor · Viewer.
يستطيع الأعضاء إنشاء المجموعات والنوادي والدوائر العادية مباشرة دون موافقة مسبقة.
الأنشطة الحساسة مثل جمع الأموال والأنشطة المتعلقة بالأطفال والطوارئ والفعاليات عالية المخاطر تخضع لمراجعة مناسبة.

### F. CONNECT ACTIVITIES & EVENTS — الأنشطة والفعاليات
ادمج: Social Calendar · Group Activities · Social Invitations · Social Reunions · Global Meetups · Social Challenges · Social Missions · Global Competitions · Community Events · Global Mentoring Events · Social Journeys · Volunteer Activities.
يجب استخدام نظام أحداث موحد يدعم: إنشاء النشاط · التسجيل · الدعوات · تأكيد الحضور · قوائم المشاركين · التذكيرات · إدارة المواعيد · المناطق الزمنية · التحديثات · الإلغاء.

### G. CONNECT LEARNING & KNOWLEDGE — التعلم وتبادل المعرفة
ادمج: Language Partner · Mentorship · Knowledge Exchange · Live Learning · Skill Exchange · Public Speaking · Community Questions · Social Debate · Learning Sessions · Expert Connections.
اجعل لكل خدمة وظائفها الخاصة، لكن استخدم أنظمة الحسابات والمحادثات والمواعيد والمكالمات المشتركة.

### H. CONNECT CREATOR & MEDIA — صناعة المحتوى والإنتاج الإعلامي
ادمج: Creator Collaboration · Co-Creation Studio · Social Podcast · Community Radio · Podcast Studio · Shared Creative Projects · Watch Together · Shared Albums · Social Stories.
Podcast Studio يدعم: إنشاء البرامج · دعوة الضيوف · التسجيل عن بُعد · تسجيل مسارات مستقلة عند الإمكان · تحرير الصوت والفيديو · تفريغ التسجيلات · إنشاء العناوين والملخصات · نشر الحلقات · إحصائيات البرامج.
Creator Collaboration يدعم: اكتشاف المبدعين · طلبات التعاون · تكوين فرق الإنتاج · المهام · مشاركة الملفات · تنظيم الاجتماعات · تحديد حقوق الملكية الفكرية.
احترم حقوق المشاركين والمحتوى والتسجيلات.

### I. CONNECT DISCOVERY & GLOBAL NETWORK — اكتشاف المجتمع العالمي
ادمج: Smart Discovery · Interest Match · Global Directory · Global Discussions · Community Partnerships · Community Showcase · People Discovery · Communities Discovery · Events Discovery · Creator Discovery · Professional Connections.
اجعل البحث موحداً مع فلاتر بحسب نوع المحتوى واللغة والدولة والاهتمامات المعلنة.

### J. CONNECT COLLABORATION — التعاون والعمل الجماعي
ادمج: Social Missions · Co-Creation Projects · Creator Collaboration · Skill Exchange · Community Partnerships · Volunteer Teams · Social Journeys · Shared Tasks · Team Activities.
أضف: إنشاء مشروع أو مهمة · تكوين فريق · توزيع المهام · تحديد المسؤوليات · متابعة الإنجاز · مشاركة الملفات · سجل التغييرات · نشر النتائج.
لا تنشئ نظام مشاريع مكرراً إذا كانت هناك وحدة معتمدة تؤدي هذه الوظائف.

### K. CONNECT SOCIAL EXPERIENCES — التجارب الاجتماعية المشتركة
ادمج: Social Gaming · Watch Together · Social Challenges · Global Competitions · Shared Albums · Social Stories · Social Reunions · Social Invitations · Social Circles · Social Celebrations.
استخدم الأنظمة المشتركة للأعضاء والدعوات والإشعارات والملفات.

### L. CONNECT NOTIFICATIONS — مركز الإشعارات
أنشئ نظام إشعارات موحداً لجميع خدمات CONNECT.
يدعم: Messages · Calls · Friends · Groups · Events · Invitations · Meetups · Debates · Mentorship · Learning · Podcasts · Collaborations · Challenges · Competitions · Community Activities.
مع: Push Notifications · In-App Notifications · Notification Preferences · Quiet Hours · Do Not Disturb · Notification History.

### M. CONNECT TRUST & SAFETY — الأمان والخصوصية
ادمج: Safety Center · Privacy Control · Account Protection · Scam Protection · Smart Moderation · Reporting · Appeals · Trusted Devices · Security Alerts · Digital Wellbeing · Youth Safety · Trust Dashboard.
افصل بين: التحقق من الهوية · التحقق من المهنة · تأكيد الانتساب إلى مؤسسة · توثيق الحساب.
لا تمنح علامة VERIFIED مقابل المال أو الشعبية.

## 3. UNIFIED TECHNICAL ARCHITECTURE
أنشئ بنية تقنية مشتركة لجميع CONNECT.

**Shared Core Services** — أنشئ أو أعد استخدام: 1. User Service · 2. Friendship Service · 3. Messaging Service · 4. Notification Service · 5. Media Service · 6. Call & Realtime Service · 7. Group Membership Service · 8. Event Service · 9. Search Service · 10. Privacy Service · 11. Moderation Service · 12. File Sharing Service · 13. Scheduling Service · 14. Analytics Service.
كل وحدة تستخدم الخدمات المشتركة بدلاً من بناء خدمات منفصلة.

**Database Consolidation** — افحص جميع الجداول الحالية: اكتشف الجداول المتكررة · اكتشف الحقول المتشابهة · راجع العلاقات والمفاتيح · وحد أسماء الجداول عند الحاجة · حافظ على البيانات الموجودة · أنشئ migrations آمنة · أضف الفهارس اللازمة · تجنب فقدان البيانات · احتفظ بخطة rollback.
لا تحذف جدولاً أو بيانات لمجرد تشابه الاسم.

**API Consolidation** — أنشئ واجهات API موحدة ومنظمة: Authentication · Profiles · Friends · Messages · Groups · Calls · Events · Activities · Learning · Creators · Podcasts · Communities · Notifications · Privacy · Safety.
استخدم صلاحيات موحدة وتحققاً من ملكية الموارد في Backend.

## 4. UNIFIED CONNECT USER INTERFACE
أريد واجهة رئيسية بسيطة واحترافية. اجعل الصفحة الرئيسية تحتوي على:
1. Home · 2. Messenger · 3. Live · 4. Discover · 5. Communities · 6. Activities · 7. Learning · 8. Creators · 9. Collaboration · 10. My Connections.
يمكن وضعها في قائمة جانبية أو صفحات داخلية حسب التصميم.
لا تضع جميع الوظائف في شريط التنقل السفلي للهاتف.
استخدم: بطاقات واضحة · أيقونات موحدة · صفحات فرعية · بحث مركزي · اختصارات للوظائف المستخدمة بكثرة · تصميم Responsive · دعم RTL وLTR.
اللغات: العربية · الكرمانجية · الألمانية · الإنجليزية.
حافظ على هوية EZIDINET البصرية.

## 5. PRIVACY & USER CONTROL
طبّق نظام صلاحيات مركزي. كل محتوى يجب أن يدعم إعدادات الخصوصية المناسبة: Public · Friends · Selected Members · Private.
لا تسمح لأي وحدة بتجاوز صلاحيات الوحدة الأصلية.
لا تعرض: الرسائل الخاصة · المواقع الدقيقة · الملفات الخاصة · المشاركات المقيدة · معلومات القاصرين — إلا للأشخاص المصرح لهم.
لا تسجل المكالمات أو اللقاءات تلقائياً. لا يتم التسجيل أو النشر إلا بعد الموافقات المطلوبة.

## 6. DEVELOPMENT PRIORITIES
لا تنفذ جميع الأنظمة دفعة واحدة. نفّذ بالترتيب التالي:
PHASE 1 — Project Audit & Feature Inventory.
PHASE 2 — Unified Database & Shared Services.
PHASE 3 — CONNECT Home & Navigation.
PHASE 4 — Messenger & Friends Integration.
PHASE 5 — Groups, Communities & Circles.
PHASE 6 — Live Communication & Meetups.
PHASE 7 — Activities, Events & Calendar.
PHASE 8 — Learning & Knowledge.
PHASE 9 — Creator & Media.
PHASE 10 — Discovery & Collaboration.
PHASE 11 — Social Experiences.
PHASE 12 — Notifications & Safety.
PHASE 13 — Full Integration & Optimization.
اختبر كل مرحلة قبل الانتقال إلى المرحلة التالية.

## 7. TESTING REQUIREMENTS
أنشئ اختبارات فعلية باستخدام حسابات متعددة. اختبر: تسجيل المستخدمين · إضافة الأصدقاء · إرسال الرسائل واستلامها · الرسائل الصوتية · المكالمات الفردية والجماعية · إنشاء المجموعات · إدارة العضويات · إنشاء اللقاءات · تنظيم الفعاليات · تبادل اللغات · جلسات التعلم · البودكاست · التعاون بين المبدعين · الأنشطة المشتركة · الإشعارات · البحث · الخصوصية · الحظر والإبلاغ · صلاحيات الإدارة.
اختبر على: Desktop · Tablet · Mobile.

## 8. PERFORMANCE & COST CONTROL
المنصة يجب أن تكون قابلة للتوسع دون تكاليف غير ضرورية: استخدم خدمات مشتركة · تجنب تكرار قواعد البيانات · قلل طلبات API غير الضرورية · استخدم Pagination · استخدم Caching عند الحاجة · حسّن تحميل الصور والملفات · استخدم خدمات البث عند الحاجة الفعلية فقط · راقب تكاليف التخزين والبث والذكاء الاصطناعي.
قبل شراء أو تفعيل خدمة خارجية مدفوعة، اعرض: اسم الخدمة · سبب الحاجة إليها · التكلفة التقديرية · البدائل · تأثيرها على الميزانية.
لا تتجاوز ميزانية التطوير الأولية المستهدفة البالغة 1,000–5,000 يورو دون موافقة صريحة.

## 9. FINAL ACCEPTANCE CRITERIA
لا تعتبر دمج CONNECT مكتملاً حتى تتحقق الشروط التالية:
1. جميع الميزات السابقة موجودة في قائمة جرد موحدة.
2. جميع الميزات المعتمدة محفوظة.
3. الوظائف المتكررة مدمجة في أنظمة مشتركة.
4. قاعدة البيانات لا تحتوي على تكرار غير مبرر.
5. جميع الأقسام متصلة بالمستخدمين أنفسهم.
6. الرسائل والمكالمات والإشعارات تعمل بصورة موحدة.
7. الخصوصية مطبقة من Backend.
8. الواجهات تعمل على الهاتف والكمبيوتر.
9. اللغات الأربع مدعومة.
10. الاختبارات الفعلية ناجحة.

## 10. REQUIRED FINAL REPORT
بعد التنفيذ، أنشئ تقريراً يتضمن: A. CONNECT Feature Inventory · B. Existing Features · C. Newly Implemented Features · D. Merged Duplicate Features · E. Database Changes · F. API Changes · G. UI Changes · H. Completed Tests · I. Remaining Tasks · J. External Services & Costs · K. Known Issues · L. Recommended Next Steps.

مهم جداً:
لا تعلن أن جميع إصدارات CONNECT اكتملت إذا كانت هناك وظائف لم تُنفذ.
لا تحذف أي ميزة معتمدة.
لا تنشئ نظاماً مكرراً.
لا تستبدل الوظائف الحقيقية بواجهات شكلية.
ابدأ الآن بالمرحلة الأولى: فحص المشروع وإنشاء CONNECT Feature Inventory، ثم تابع التنفيذ تدريجياً مع الاختبار والتوثيق.
