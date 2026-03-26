# 🚀 شرح سريع - اتبع بالضبط

## خطوة 1: إنشاء حساب GitHub (2 دقيقة)
1. افتح: https://github.com/signup
2. ادخل بريد إيميل (أي بريد)
3. اظغط على الـ verification email
4. خلص! ✅

## خطوة 2: رفع المشروع (1 دقيقة)
انسخ والصق هذه الأوامر في PowerShell:

```powershell
cd c:\Users\DRmonalisa\OneDrive\Desktop\gamedv
git init
git add .
git commit -m "video chat"
git branch -M main
```

لو طلب عليك تحط اسم وبريد:
```powershell
git config --global user.email "your@email.com"
git config --global user.name "Your Name"
```

بعدها كرر الأوامر أعلاه ⬆️

## خطوة 3: إنشاء مستودع GitHub
1. افتح: https://github.com/new
2. اكتب اسم: `video-chat`
3. اضغط "Create repository"

## خطوة 4: رفع الملفات (1 دقيقة)
انسخ هذا الأمر بعد إنشاء المستودع:
```powershell
git remote add origin https://github.com/YOUR_USERNAME/video-chat.git
git push -u origin main
```

**غير YOUR_USERNAME باسم حسابك على GitHub!**

## خطوة 5: نشر على Railway (1 دقيقة)
1. افتح: https://railway.app
2. اضغط "Deploy from GitHub"
3. وصّل حسابك على GitHub
4. اختر `video-chat`
5. اضغط Deploy

**خلص! ستجد رابط مثل:**
```
https://video-chat-xxxx.railway.app
```

## كمان بديل أسهل - Render.com
1. https://render.com
2. اضغط New
3. Web Service
4. اختر المستودع
5. Deploy

بهيك تنتهي! 🎉
