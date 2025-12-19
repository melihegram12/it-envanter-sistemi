# IT Envanter Sistemi

**Malhotra Kablo İdari İşler Envanteri** - Kapsamlı stok takip ve yönetim sistemi.

## 🌟 Özellikler

- 📊 **Dashboard**: Anlık istatistikler ve grafikler
- 📦 **Malzeme Yönetimi**: Stok takibi, barkod desteği
- 📋 **Stok Hareketleri**: Giriş/Çıkış takibi
- 📝 **Talep Sistemi**: Onay mekanizmalı talep yönetimi
- 🛒 **Sipariş Yönetimi**: Tedarikçi siparişleri
- 📈 **Analitik**: Trend analizi, kategori dağılımı
- 🔮 **Tahminler**: Stok tükenme tahminleri
- 🏢 **Lokasyonlar**: Çoklu depo yönetimi
- ✅ **Stok Sayım**: Envanter sayım planlaması
- 📜 **Audit Log**: İşlem geçmişi

## 🚀 Kurulum

### Lokal Geliştirme

**Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### Production Deployment

Render.com üzerinde ücretsiz deployment için [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md) dosyasına bakın.

## 🔐 Giriş Bilgileri

| Kullanıcı | Şifre | Rol |
|-----------|-------|-----|
| admin | admin123 | Admin |

## 📁 Proje Yapısı

```
inventory-system/
├── backend/
│   ├── main.py           # FastAPI uygulaması
│   ├── models.py         # Pydantic modelleri
│   ├── excel_manager.py  # Excel veri yönetimi
│   └── requirements.txt  # Python bağımlılıkları
├── frontend/
│   ├── src/
│   │   └── App.jsx       # React uygulaması
│   └── package.json      # Node bağımlılıkları
├── render.yaml           # Render Blueprint
└── RENDER_DEPLOYMENT.md  # Deployment rehberi
```

## 🛠️ Teknolojiler

- **Backend**: Python, FastAPI, Pydantic
- **Frontend**: React, Vite, Chart.js
- **Veri**: Excel (openpyxl)
- **Hosting**: Render.com

## 📄 Lisans

MIT License
