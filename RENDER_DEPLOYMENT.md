# IT Envanter Sistemi - Render.com Ücretsiz Deployment Rehberi

Bu rehber, IT Envanter Sistemini Render.com üzerinde **ücretsiz** olarak yayınlamanızı sağlar.

## 🚀 Hızlı Deployment Adımları

### Adım 1: GitHub'a Repository Yükle

1. GitHub hesabınıza giriş yapın (https://github.com)
2. Yeni bir repository oluşturun: `it-envanter-sistemi`
3. Projeyi GitHub'a yükleyin:

```bash
cd C:\Users\ENGINME1\.gemini\antigravity\scratch\inventory-system
git init
git add .
git commit -m "Initial commit - IT Envanter Sistemi"
git branch -M main
git remote add origin https://github.com/KULLANICI_ADINIZ/it-envanter-sistemi.git
git push -u origin main
```

### Adım 2: Render.com'a Kayıt

1. https://render.com adresine gidin
2. "Get Started for Free" butonuna tıklayın
3. GitHub hesabınızla giriş yapın
4. Repository erişim izni verin

### Adım 3: Backend API Deployment

1. Render Dashboard'da **"New +"** → **"Web Service"** tıklayın
2. GitHub repository'nizi seçin
3. Aşağıdaki ayarları yapın:

| Ayar | Değer |
|------|-------|
| **Name** | `it-envanter-api` |
| **Region** | `Frankfurt (EU Central)` |
| **Root Directory** | `backend` |
| **Runtime** | `Python` |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn main:app --host 0.0.0.0 --port $PORT` |
| **Instance Type** | `Free` |

4. **"Create Web Service"** tıklayın
5. Deployment tamamlandığında URL'i kopyalayın (örn: `https://it-envanter-api.onrender.com`)

### Adım 4: Frontend Deployment

1. Render Dashboard'da **"New +"** → **"Static Site"** tıklayın
2. GitHub repository'nizi seçin
3. Aşağıdaki ayarları yapın:

| Ayar | Değer |
|------|-------|
| **Name** | `it-envanter-frontend` |
| **Root Directory** | `frontend` |
| **Build Command** | `npm install && npm run build` |
| **Publish Directory** | `dist` |

4. **Environment Variables** bölümünde:
   - Key: `VITE_API_URL`
   - Value: `https://it-envanter-api.onrender.com/api` (backend URL'iniz)

5. **"Create Static Site"** tıklayın

### Adım 5: Rewrite Rules Ekle (Static Site)

Static Site ayarlarında **"Redirects/Rewrites"** sekmesine gidin:

| Source | Destination | Type |
|--------|-------------|------|
| `/api/*` | `https://it-envanter-api.onrender.com/api/*` | Rewrite |
| `/*` | `/index.html` | Rewrite |

---

## 🔧 Önemli Notlar

### Ücretsiz Plan Sınırlamaları

- ⏰ **Uyku Modu**: 15 dakika aktivite olmazsa backend uyur
- 🔄 **İlk İstek**: Uyandırmak için 30-60 saniye bekleyebilir
- 📊 **Aylık Limit**: 750 saat/ay (yeterli)
- 💾 **Veri**: Excel dosyası her restart'ta sıfırlanır (persistent storage için upgrade gerekir)

### Veri Kalıcılığı için Çözümler

1. **Supabase** (Ücretsiz PostgreSQL): Excel yerine veritabanı kullanabilirsiniz
2. **Render Disk** (Ücretli): $0.25/GB/ay
3. **GitHub**: Verileri GitHub'a commit edebilirsiniz

---

## 🌐 Erişim Bilgileri

Deployment sonrası:

- **Frontend**: `https://it-envanter-frontend.onrender.com`
- **Backend API**: `https://it-envanter-api.onrender.com/api`
- **Demo Login**: `admin` / `admin123`

---

## 📱 Test Etme

1. Frontend URL'ini tarayıcıda açın
2. `admin` / `admin123` ile giriş yapın
3. Dashboard'ı kontrol edin
4. Malzeme listesini görüntüleyin

---

## ⚡ Alternatif: Blueprint Deployment

`render.yaml` dosyası hazır. Tek tıkla deploy için:

1. GitHub'a push edin
2. Render Dashboard → **"New +"** → **"Blueprint"**
3. Repository'yi seçin
4. Otomatik olarak her iki servis de oluşturulacak

---

## 🎉 Tebrikler!

IT Envanter Sisteminiz artık internette ücretsiz olarak yayında!

**Sorular için:** Render dokümantasyonu: https://render.com/docs
