# � Social Network - شبكة اجتماعية حديثة

منصة شبكة اجتماعية شاملة على طريقة Facebook مع مميزات متقدمة وتصميم عصري

## ✨ المميزات الرئيسية

### 🔐 المصادقة والأمان
- **تسجيل دخول آمن عبر Google OAuth 2.0**
- **JWT tokens** للمصادقة الآمنة
- **حماية البيانات** وتشفير كامل

### 📱 الواجهة والتجربة
- **تصميم responsive** يعمل على جميع الأجهزة
- **واجهة مستخدم عصرية** بأسلوب Material Design
- **دعم اللغة العربية** مع اتجاه RTL
- **وضع مظلم/فاتح** قابل للتخصيص

### 🚀 المميزات الاجتماعية
- **المنشورات والتعليقات والإعجابات**
- **القصص المؤقتة (Stories)**
- **الرسائل الخاصة** بين الأصدقاء
- **البحث المتقدم** في المحتوى والمستخدمين
- **الإشعارات الفورية** للتفاعلات

### ⚡ الأداء والتكنولوجيا
- **تحديثات فورية** باستخدام Socket.io
- **قاعدة بيانات SQLite** محسّنة
- **PWA** للعمل دون اتصال
- **تحميل الصور** ومعالجتها
- **API RESTful** شامل

## 🛠️ التقنيات المستخدمة

### الخادم (Backend)
- **Node.js** - بيئة التشغيل
- **Express.js** - إطار العمل الويب
- **Socket.io** - التواصل الفوري
- **SQLite3** - قاعدة البيانات
- **JWT** - المصادقة الآمنة
- **Google Auth Library** - OAuth 2.0

### العميل (Frontend)
- **HTML5/CSS3** - البنية والتصميم
- **JavaScript (ES6+)** - الوظائف التفاعلية
- **Material Design** - نظام التصميم
- **PWA APIs** - التطبيق التقدمي

## 📋 المتطلبات

- **Node.js** الإصدار 16 أو أحدث
- **npm** أو **yarn** لإدارة الحزم
- **Google Cloud Console** لحساب OAuth (اختياري للتطوير المحلي)

## 🚀 التثبيت والتشغيل

### 1. تحميل المشروع
```bash
git clone https://github.com/yourusername/social-network.git
cd social-network
```

### 2. تثبيت المتطلبات
```bash
npm install
```

### 3. إعداد متغيرات البيئة
```bash
# انسخ ملف البيئة النموذجي
cp .env.example .env

# عدل المتغيرات حسب الحاجة
nano .env
```

### 4. الحصول على Google Client ID (اختياري)
1. اذهب إلى [Google Cloud Console](https://console.cloud.google.com/)
2. أنشئ مشروع جديد أو اختر مشروع موجود
3. فعل Google+ API
4. أنشئ OAuth 2.0 Client ID
5. أضف الـ URIs المسموحة:
   - `http://localhost:3000`
   - `https://yourdomain.com`

### 5. تشغيل الخادم
```bash
# للتطوير
npm run dev

# للإنتاج
npm start
```

### 6. فتح المتصفح
```
http://localhost:3000
```

## 📁 هيكل المشروع

```
social-network/
├── 📄 server.js              # الخادم الرئيسي
├── 📄 index.html             # الصفحة الرئيسية
├── 📄 sw.js                  # Service Worker للـ PWA
├── 📄 manifest.json          # ملف PWA
├── 📄 package.json           # متطلبات npm
├── 📄 .env.example           # متغيرات البيئة النموذجية
├── 📄 README.md              # هذا الملف
├── 📁 public/                # الملفات الثابتة
│   ├── 📁 images/           # الصور والأيقونات
│   └── 📁 styles/           # ملفات CSS الإضافية
└── 📁 database/             # ملفات قاعدة البيانات
```

## 🔧 إعدادات البيئة

```env
# الخادم
PORT=3000
NODE_ENV=development

# قاعدة البيانات
DATABASE_URL=./social.db

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com

# JWT
JWT_SECRET=your_super_secret_jwt_key_here

# إعدادات إضافية
MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif
```

## 📡 API Endpoints

### المصادقة
- `POST /api/auth/google` - تسجيل دخول عبر Google
- `POST /api/auth/logout` - تسجيل خروج

### المستخدمين
- `GET /api/user/:userId` - معلومات المستخدم
- `PUT /api/user/:userId` - تحديث الملف الشخصي
- `GET /api/users/search` - البحث في المستخدمين

### المنشورات
- `GET /api/feed` - الخلاصة الرئيسية
- `POST /api/posts` - إنشاء منشور جديد
- `GET /api/posts/:postId` - تفاصيل منشور
- `PUT /api/posts/:postId` - تحديث منشور
- `DELETE /api/posts/:postId` - حذف منشور

### التفاعلات
- `POST /api/likes` - إعجاب/إلغاء إعجاب
- `POST /api/comments` - إضافة تعليق
- `GET /api/posts/:postId/comments` - تعليقات المنشور

### الأصدقاء
- `POST /api/friends/request` - إرسال طلب صداقة
- `PUT /api/friends/:requestId` - قبول/رفض طلب
- `GET /api/friends` - قائمة الأصدقاء

### الرسائل
- `GET /api/messages/:userId` - محادثة مع مستخدم
- `POST /api/messages` - إرسال رسالة
- `PUT /api/messages/:messageId/read` - تحديد كمقروء

## 🎨 التخصيص

### تغيير الألوان
```css
:root {
  --primary-color: #1877f2;
  --secondary-color: #42b883;
  --background-color: #f0f2f5;
  --text-color: #333;
}
```

### إضافة لغات جديدة
```javascript
const translations = {
  ar: { /* الترجمات العربية */ },
  en: { /* English translations */ },
  fr: { /* Traductions françaises */ }
};
```

## 🔒 الأمان

- **تشفير كامل** للبيانات الحساسة
- **حماية CSRF** للنماذج
- **تحقق صحة البيانات** على الخادم والعميل
- **معدلة طلبات** لمنع الهجمات
- **تسجيل آمن** للأحداث الأمنية

## 📊 الأداء

- **تحسين الصور** وضغطها تلقائياً
- **تخزين مؤقت** للاستعلامات الشائعة
- **ضغط Gzip** للاستجابات
- **تحميل تدريجي** للمحتوى
- **تحسين قاعدة البيانات** مع الفهارس

## 🌐 النشر

### Heroku
```bash
heroku create your-app-name
git push heroku main
```

### Railway
```bash
railway login
railway link
railway up
```

### Vercel
```bash
vercel --prod
```

## 🧪 الاختبار

```bash
# تشغيل الاختبارات
npm test

# اختبار الأداء
npm run test:performance

# اختبار الأمان
npm run test:security
```

## 🤝 المساهمة

نرحب بالمساهمات! يرجى:

1. Fork المشروع
2. إنشاء branch جديد (`git checkout -b feature/AmazingFeature`)
3. Commit التغييرات (`git commit -m 'Add some AmazingFeature'`)
4. Push للـ branch (`git push origin feature/AmazingFeature`)
5. فتح Pull Request

## 📝 الترخيص

هذا المشروع مرخص تحت رخصة MIT - راجع ملف [LICENSE](LICENSE) للتفاصيل.

## 📞 الدعم

- **Issues**: [GitHub Issues](https://github.com/yourusername/social-network/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/social-network/discussions)
- **Email**: support@socialnetwork.com

## 🎯 خطة التطوير المستقبلي

- [ ] **دعم الفيديو** والبث المباشر
- [ ] **مجموعات وصفحات** للمجتمعات
- [ ] **متجر التطبيقات** للإضافات
- [ ] **تحليلات متقدمة** للمستخدمين
- [ ] **دعم الذكاء الاصطناعي** للمحتوى
- [ ] **تطبيق جوال** أصلي

---

**استمتع بالتواصل الاجتماعي! 🌟**

## كيفية الاستخدام 📖

1. **ابدأ الكاميرا**: اضغط على زر "ابدأ الكاميرا"
   - سيطلب منك إذن للوصول إلى الكاميرا والميكروفون

2. **الانتظار للاتصال**: سيتم البحث عن شخص آخر متصل

3. **الدردشة**: اكتب رسائل في صندوق الدردشة

4. **التحكم**:
   - 🎬 **إيقاف الكاميرا**: تعطيل/تفعيل الكاميرا
   - 🔊 **إيقاف الصوت**: تعطيل/تفعيل الميكروفون
   - ⏭️ **تخطي**: البحث عن شخص جديد
   - 🛑 **إيقاف البث**: إنهاء الاتصال

## بنية المشروع 📁

```
gamedv/
├── server.js              # خادم Node.js (Socket.io)
├── video-chat.html        # واجهة المستخدم
├── package.json           # متطلبات npm
└── README.md             # هذا الملف
```

## كيفية عمل النظام 🔧

### الخادم (server.js):
- يدير اتصالات المستخدمين
- يطابق المستخدمين العشوائيين معاً
- يعيد توجيه رسائل WebRTC (offers, answers, ICE candidates)
- يعالج قطع الاتصال والتخطي

### العميل (video-chat.html):
- يجمع الفيديو والصوت من الكاميرا
- ينشئ اتصال WebRTC مباشر (P2P)
- يرسل الفيديو والصوت مباشرة بين المتصفحات
- يتعامل مع الرسائل النصية عبر Socket.io

## الأمان والخصوصية 🔐

- جميع اتصالات الفيديو **P2P** (مباشرة بين المستخدمين)
- الخادم **لا يسجل** الفيديو أو الصوت
- الرسائل مشفرة بين المتصفحات
- لا يتم حفظ بيانات شخصية

## استكشاف الأخطاء 🐛

### لا تظهر الكاميرا:
```
- تأكد من إعطاء الإذن للمتصفح
- حاول استخدام https (المتصفح يطلب https في بعض الحالات)
```

### لا يتصل بشخص آخر:
```
- تأكد من تشغيل الخادم (npm start)
- حاول فتح نافذة أخرى من المتصفح
```

### الصوت منخفض أو مقطوع:
```
- تحقق من إعدادات الصوت في النظام
- تأكد من صلاحيات الميكروفون
```

## الإذاعة الحية 📡

لنشر المشروع على الإنترنت:

### استخدام Heroku (مجاني):
1. سجل حساب على [heroku.com](https://heroku.com)
2. ثبت Heroku CLI
3. في Terminal:
```bash
heroku login
heroku create your-app-name
git push heroku main
```

### استخدام Render (مجاني):
1. ادفع الملفات إلى GitHub
2. سجل على [render.com](https://render.com)
3. اربط مستودعك وانشر

## التطوير المستقبلي 🚀

- إضافة قائمة الأصدقاء
- حفظ السجل التاريخي للمحادثات
- تصفية المستخدمين (حسب المنطقة، اللغة، إلخ)
- مشاركة الشاشة
- تسجيل المكالمات
- تطبيق موبايل

## الترخيص 📄

MIT License - حر الاستخدام والتعديل

## الدعم 💬

للمساعدة أو الإبلاغ عن مشاكل:
- تحقق من console (F12) للأخطاء
- تأكد من اتصالك بالإنترنت

---

**استمتع بالدردشة! 🎉**
