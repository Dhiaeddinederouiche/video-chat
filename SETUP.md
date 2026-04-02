# 🌐 Social Network Platform

تطبيق شبكة اجتماعية مثل Facebook مع ميزات متقدمة.

## ✨ الميزات

- 👤 **Google OAuth Sign-In** - تسجيل دخول آمن عبر Google
- 📝 **المنشورات والتعليقات** - شارك أفكارك والتعليق على منشورات الآخرين
- ❤️ **الإعجابات** - أعجب بالمنشورات والتعليقات
- 👥 **نظام الأصدقاء** - أضف أصدقاء وتابعهم
- 💬 **الدردشة الحية** - سوكيت.io للتحديثات الفورية
- 🔐 **المصادقة الآمنة** - JWT tokens للجلسات الآمنة
- 📱 **واجهة متجاوبة** - تعمل على الهاتف والويب

## 🚀 البدء السريع

### المتطلبات
- Node.js v14+
- npm أو yarn

### التثبيت

1. **استنسخ المستودع**
```bash
git clone https://github.com/Dhiaeddinederouiche/video-chat.git
cd social-network
```

2. **ثبت المكتبات**
```bash
npm install
```

3. **إعداد Google OAuth**

- اذهب إلى [Google Cloud Console](https://console.cloud.google.com/)
- أنشئ مشروع جديد
- فعّل Google+ API
- أنشئ OAuth 2.0 Client ID (Web Application)
- أضف `http://localhost:3000` إلى Authorized redirect URIs

4. **إعداد متغيرات البيئة**
```bash
cp .env.example .env
```

ثم عدّل `.env`:
```
GOOGLE_CLIENT_ID=Your_Google_Client_ID_Here.apps.googleusercontent.com
JWT_SECRET=your-secret-key
PORT=3000
```

5. **شغّل التطبيق**
```bash
npm start
```

التطبيق سيعمل على: http://localhost:3000

## 📱 الاستخدام

### تسجيل الدخول
- اضغط على زر "تسجيل دخول عبر Google"
- صرّح الوصول إلى حسابك
- سيتم إنشاء حسابك تلقائياً أو تسجيل دخولك

### إنشاء منشور
1. اكتب في حقل "ما الذي تفكر فيه الآن؟"
2. أضف صورة (اختيارية)
3. اضغط "مشاركة"

### التفاعل
- اضغط على قلب ❤️ للإعجاب
- اضغط على فقاعة 💬 للتعليق
- شارك المنشورات مع الآخرين

## 🏗️ البنية المعمارية

```
├── server.js          # خادم Express و Socket.io
├── index.html         # الواجهة الأمامية
├── package.json       # المكتبات والمتطلبات
├── social.db          # قاعدة بيانات SQLite
└── sw.js              # Service Worker للـ PWA
```

### قاعدة البيانات

جداول رئيسية:
- **users** - معلومات المستخدمين
- **posts** - المنشورات
- **comments** - التعليقات
- **likes** - الإعجابات
- **friendships** - الأصدقاء

## API Endpoints

### المصادقة
- `POST /api/auth/google` - تسجيل دخول عبر Google

### المستخدمون
- `GET /api/user/:userId` - الحصول على ملف المستخدم
- `POST /api/user` - إنشاء مستخدم جديد

### المنشورات
- `GET /api/feed` - الحصول على الفيد
- `POST /api/posts` - إنشاء منشور جديد
- `GET /api/posts/:postId` - الحصول على منشور

### التعليقات
- `POST /api/comments` - إضافة تعليق
- `GET /api/posts/:postId` - التعليقات على منشور

### الإعجابات
- `POST /api/likes` - إعجاب/عدم إعجاب

## 🔒 الأمان

- ✅ Google OAuth 2.0 verification
- ✅ JWT token authentication
- ✅ CORS configuration
- ✅ Database encryption ready
- ✅ SQL Injection prevention

## 📦 المكتبات المستخدمة

- **express** - خادم الويب
- **socket.io** - الأحداث الحية
- **sqlite3** - قاعدة البيانات
- **google-auth-library** - مصادقة Google
- **jsonwebtoken** - JWT tokens
- **cors** - معالجة CORS
- **body-parser** - معالجة الطلبات

## 🛣️ الخارطة الزمنية

- [x] Google OAuth Integration
- [x] منشورات وتعليقات
- [x] نظام الإعجابات
- [ ] نظام المتابعة المتقدم
- [ ] البحث والفلترة
- [ ] التنبيهات الفورية
- [ ] الصور والملفات
- [ ] الفيديوهات المباشرة

## 🤝 المساهمة

نرحب بمساهماتك! يرجى:
1. Fork المستودع
2. أنشئ فرع جديد
3. أرسل Pull Request

## 📄 الترخيص

MIT License

## 📧 التواصل

للأسئلة والاقتراحات:
- Email: your-email@example.com
- GitHub Issues: [Open Issues](https://github.com/Dhiaeddinederouiche/video-chat/issues)

---

**شبكة اجتماعية مفتوحة المصدر من أجل تواصل أفضل** 🚀
