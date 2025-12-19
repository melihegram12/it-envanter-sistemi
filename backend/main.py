from fastapi import FastAPI, HTTPException, Depends, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from typing import List, Optional
import secrets
from models import *
from excel_manager import ExcelManager

app = FastAPI(
    title="Sarf Malzemesi Envanter Takip Sistemi",
    description="İdari işler için kapsamlı envanter yönetim API'si",
    version="2.0.0"
)

# CORS ayarları
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

excel_manager = ExcelManager()
security = HTTPBasic()

# Basit token store (production'da Redis/DB kullanılmalı)
active_sessions = {}

# ==================== AUTH ====================

@app.post("/api/auth/login")
def login(credentials: UserLogin):
    """Kullanıcı girişi"""
    user = excel_manager.authenticate_user(credentials.username, credentials.password)
    if not user:
        raise HTTPException(status_code=401, detail="Geçersiz kullanıcı adı veya şifre")
    
    token = secrets.token_urlsafe(32)
    active_sessions[token] = user
    
    return {
        "token": token,
        "user": user
    }

@app.post("/api/auth/logout")
def logout(token: str):
    """Kullanıcı çıkışı"""
    if token in active_sessions:
        del active_sessions[token]
    return {"message": "Çıkış yapıldı"}

@app.get("/api/auth/me")
def get_current_user(token: str):
    """Oturum bilgisi"""
    if token not in active_sessions:
        raise HTTPException(status_code=401, detail="Oturum geçersiz")
    return active_sessions[token]

# ==================== KULLANICILAR ====================

@app.get("/api/users", response_model=List[User])
def get_users():
    """Tüm kullanıcıları listele"""
    return excel_manager.get_all_users()

@app.post("/api/users", response_model=User)
def create_user(user: UserCreate):
    """Yeni kullanıcı oluştur"""
    return excel_manager.create_user(user)

# ==================== DASHBOARD ====================

@app.get("/api/dashboard")
def get_dashboard(username: Optional[str] = None):
    """Dashboard istatistiklerini getir"""
    return excel_manager.get_dashboard_stats(username)

# ==================== MALZEMELER ====================

@app.get("/api/materials", response_model=List[Material])
def get_materials(
    kategori: Optional[str] = None,
    durum: Optional[str] = None,
    arama: Optional[str] = None
):
    """Tüm malzemeleri listele (filtreleme ile)"""
    materials = excel_manager.get_all_materials()
    
    if kategori:
        materials = [m for m in materials if m.kategori == kategori]
    if durum:
        materials = [m for m in materials if m.durum == durum]
    if arama:
        arama = arama.lower()
        materials = [m for m in materials if arama in m.ad.lower() or arama in m.kod.lower() or (m.barkod and arama in m.barkod.lower())]
    
    return materials

@app.get("/api/materials/critical", response_model=List[Material])
def get_critical_materials():
    """Kritik stok seviyesindeki malzemeler"""
    return excel_manager.get_critical_stock_materials()

@app.get("/api/materials/{kod}", response_model=Material)
def get_material(kod: str):
    """Tek malzeme getir"""
    material = excel_manager.get_material_by_code(kod)
    if not material:
        raise HTTPException(status_code=404, detail="Malzeme bulunamadı")
    return material

@app.post("/api/materials", response_model=Material)
def create_material(material: MaterialCreate):
    """Yeni malzeme ekle"""
    existing = excel_manager.get_material_by_code(material.kod)
    if existing:
        raise HTTPException(status_code=400, detail="Bu kod zaten kullanılıyor")
    return excel_manager.create_material(material)

@app.put("/api/materials/{kod}", response_model=Material)
def update_material(kod: str, material: MaterialCreate):
    """Malzeme güncelle"""
    updated = excel_manager.update_material(kod, material)
    if not updated:
        raise HTTPException(status_code=404, detail="Malzeme bulunamadı")
    return updated

@app.delete("/api/materials/{kod}")
def delete_material(kod: str):
    """Malzeme sil"""
    deleted = excel_manager.delete_material(kod)
    if not deleted:
        raise HTTPException(status_code=404, detail="Malzeme bulunamadı")
    return {"message": "Malzeme silindi"}

@app.post("/api/materials/import-excel")
async def import_materials_from_excel(file: UploadFile = File(...)):
    """Excel dosyasından malzeme içe aktar"""
    import os
    import tempfile
    
    # Dosya uzantısı kontrolü
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Sadece Excel dosyaları (.xlsx, .xls) yüklenebilir")
    
    # Geçici dosyaya kaydet
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx') as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name
        
        # Excel'i işle
        result = excel_manager.import_materials_from_excel(tmp_path)
        
        # Geçici dosyayı sil
        os.unlink(tmp_path)
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Dosya işlenirken hata oluştu: {str(e)}")

# ==================== STOK HAREKETLERİ ====================

@app.get("/api/movements", response_model=List[StockMovement])
def get_movements(malzeme_kodu: Optional[str] = None, islem_tipi: Optional[str] = None):
    """Tüm hareketleri listele"""
    movements = excel_manager.get_all_movements()
    
    if malzeme_kodu:
        movements = [m for m in movements if m.malzeme_kodu == malzeme_kodu]
    if islem_tipi:
        movements = [m for m in movements if m.islem_tipi == islem_tipi]
    
    return movements

@app.post("/api/movements", response_model=StockMovement)
def create_movement(movement: StockMovementCreate):
    """Yeni hareket ekle (stoku otomatik günceller)"""
    material = excel_manager.get_material_by_code(movement.malzeme_kodu)
    if not material:
        raise HTTPException(status_code=404, detail="Malzeme bulunamadı")
    return excel_manager.create_movement(movement)

# ==================== TEDARİKÇİLER ====================

@app.get("/api/suppliers", response_model=List[Supplier])
def get_suppliers(kategori: Optional[str] = None, aktif: Optional[bool] = None):
    """Tüm tedarikçileri listele"""
    suppliers = excel_manager.get_all_suppliers()
    
    if kategori:
        suppliers = [s for s in suppliers if s.kategori == kategori]
    if aktif is not None:
        suppliers = [s for s in suppliers if s.aktif == aktif]
    
    return suppliers

@app.get("/api/suppliers/{kod}", response_model=Supplier)
def get_supplier(kod: str):
    """Tek tedarikçi getir"""
    supplier = excel_manager.get_supplier_by_code(kod)
    if not supplier:
        raise HTTPException(status_code=404, detail="Tedarikçi bulunamadı")
    return supplier

@app.post("/api/suppliers", response_model=Supplier)
def create_supplier(supplier: SupplierCreate):
    """Yeni tedarikçi ekle"""
    existing = excel_manager.get_supplier_by_code(supplier.kod)
    if existing:
        raise HTTPException(status_code=400, detail="Bu kod zaten kullanılıyor")
    return excel_manager.create_supplier(supplier)

@app.put("/api/suppliers/{kod}", response_model=Supplier)
def update_supplier(kod: str, supplier: SupplierCreate):
    """Tedarikçi güncelle"""
    updated = excel_manager.update_supplier(kod, supplier)
    if not updated:
        raise HTTPException(status_code=404, detail="Tedarikçi bulunamadı")
    return updated

@app.delete("/api/suppliers/{kod}")
def delete_supplier(kod: str):
    """Tedarikçi sil"""
    deleted = excel_manager.delete_supplier(kod)
    if not deleted:
        raise HTTPException(status_code=404, detail="Tedarikçi bulunamadı")
    return {"message": "Tedarikçi silindi"}

# ==================== SİPARİŞLER ====================

@app.get("/api/orders", response_model=List[Order])
def get_orders(durum: Optional[str] = None, tedarikci_kodu: Optional[str] = None):
    """Tüm siparişleri listele"""
    orders = excel_manager.get_all_orders()
    
    if durum:
        orders = [o for o in orders if o.durum == durum]
    if tedarikci_kodu:
        orders = [o for o in orders if o.tedarikci_kodu == tedarikci_kodu]
    
    return orders

@app.get("/api/orders/{siparis_no}", response_model=Order)
def get_order(siparis_no: str):
    """Tek sipariş getir"""
    order = excel_manager.get_order_by_no(siparis_no)
    if not order:
        raise HTTPException(status_code=404, detail="Sipariş bulunamadı")
    return order

@app.post("/api/orders", response_model=Order)
def create_order(order: OrderCreate):
    """Yeni sipariş oluştur"""
    return excel_manager.create_order(order)

@app.put("/api/orders/{siparis_no}/status")
def update_order_status(siparis_no: str, durum: OrderStatus, onaylayan: Optional[str] = ""):
    """Sipariş durumu güncelle"""
    updated = excel_manager.update_order_status(siparis_no, durum, onaylayan)
    if not updated:
        raise HTTPException(status_code=404, detail="Sipariş bulunamadı")
    return updated

# ==================== TALEPLER ====================

@app.get("/api/requests", response_model=List[Request])
def get_requests(durum: Optional[str] = None, departman: Optional[str] = None):
    """Tüm talepleri listele"""
    requests = excel_manager.get_all_requests()
    
    if durum:
        requests = [r for r in requests if r.durum == durum]
    if departman:
        requests = [r for r in requests if r.departman == departman]
    
    return requests

@app.get("/api/requests/pending", response_model=List[Request])
def get_pending_requests():
    """Bekleyen talepleri getir"""
    return excel_manager.get_pending_requests()

@app.get("/api/requests/{talep_no}", response_model=Request)
def get_request(talep_no: str):
    """Tek talep getir"""
    request = excel_manager.get_request_by_no(talep_no)
    if not request:
        raise HTTPException(status_code=404, detail="Talep bulunamadı")
    return request

@app.post("/api/requests", response_model=Request)
def create_request(request: RequestCreate):
    """Yeni talep oluştur"""
    return excel_manager.create_request(request)

@app.put("/api/requests/{talep_no}/approve")
def approve_request(talep_no: str, onaylayan: str):
    """Talebi onayla"""
    updated = excel_manager.update_request_status(talep_no, RequestStatus.APPROVED, onaylayan)
    if not updated:
        raise HTTPException(status_code=404, detail="Talep bulunamadı")
    return updated

@app.put("/api/requests/{talep_no}/reject")
def reject_request(talep_no: str, onaylayan: str, red_nedeni: str):
    """Talebi reddet"""
    updated = excel_manager.update_request_status(talep_no, RequestStatus.REJECTED, onaylayan, red_nedeni)
    if not updated:
        raise HTTPException(status_code=404, detail="Talep bulunamadı")
    return updated

# ==================== BÜTÇE ====================

@app.get("/api/budget")
def get_budget(yil: Optional[int] = None):
    """Bütçe özeti"""
    return excel_manager.get_budget_summary(yil)

@app.post("/api/budget/update")
def update_budget_usage(yil: int, kategori: str, harcama: float):
    """Bütçe kullanımı güncelle"""
    excel_manager.update_budget(yil, kategori, harcama)
    return {"message": "Bütçe güncellendi"}

# ==================== BİLDİRİMLER ====================

@app.get("/api/notifications", response_model=List[Notification])
def get_notifications(username: str):
    """Kullanıcı bildirimlerini getir"""
    return excel_manager.get_user_notifications(username)

@app.get("/api/notifications/unread/count")
def get_unread_count(username: str):
    """Okunmamış bildirim sayısı"""
    notifications = excel_manager.get_user_notifications(username)
    return {"count": len([n for n in notifications if not n.okundu])}

@app.put("/api/notifications/{notif_id}/read")
def mark_as_read(notif_id: str):
    """Bildirimi okundu olarak işaretle"""
    success = excel_manager.mark_notification_read(notif_id)
    if not success:
        raise HTTPException(status_code=404, detail="Bildirim bulunamadı")
    return {"message": "Bildirim okundu olarak işaretlendi"}

@app.post("/api/notifications", response_model=Notification)
def create_notification(notification: NotificationCreate):
    """Yeni bildirim oluştur"""
    return excel_manager.create_notification(notification)

# ==================== RAPORLAR ====================

@app.get("/api/reports/inventory")
def inventory_report(kategori: Optional[str] = None):
    """Envanter raporu"""
    materials = excel_manager.get_all_materials()
    if kategori:
        materials = [m for m in materials if m.kategori == kategori]
    
    return {
        "malzemeler": materials,
        "toplam_deger": sum(m.mevcut_stok * m.birim_fiyat for m in materials),
        "kritik_sayisi": len([m for m in materials if m.durum == "Kritik"]),
        "kategori_ozeti": excel_manager.get_category_distribution()
    }

@app.get("/api/reports/movements")
def movements_report(baslangic: Optional[str] = None, bitis: Optional[str] = None, malzeme_kodu: Optional[str] = None):
    """Hareket raporu"""
    movements = excel_manager.get_all_movements()
    
    if malzeme_kodu:
        movements = [m for m in movements if m.malzeme_kodu == malzeme_kodu]
    
    giris = sum(m.miktar for m in movements if m.islem_tipi == "Giriş")
    cikis = sum(m.miktar for m in movements if m.islem_tipi == "Çıkış")
    
    return {
        "hareketler": movements,
        "toplam_giris": giris,
        "toplam_cikis": cikis,
        "net_degisim": giris - cikis
    }

@app.get("/api/reports/department")
def department_report(departman: Optional[str] = None):
    """Departman tüketim raporu"""
    return excel_manager.get_department_consumption(departman)

@app.get("/api/reports/suppliers")
def suppliers_report():
    """Tedarikçi analiz raporu"""
    suppliers = excel_manager.get_all_suppliers()
    orders = excel_manager.get_all_orders()
    
    report = []
    for s in suppliers:
        supplier_orders = [o for o in orders if o.tedarikci_kodu == s.kod]
        report.append({
            "tedarikci": s.ad,
            "kod": s.kod,
            "puan": s.puan,
            "toplam_siparis": sum(o.toplam_tutar for o in supplier_orders),
            "siparis_sayisi": len(supplier_orders)
        })
    
    return sorted(report, key=lambda x: x["toplam_siparis"], reverse=True)

# ==================== ENUM DEĞERLERİ ====================

@app.get("/api/enums/categories")
def get_categories():
    """Kategori listesi"""
    return [{"value": c.value, "label": c.value} for c in Category]

@app.get("/api/enums/units")
def get_units():
    """Birim listesi"""
    return [{"value": u.value, "label": u.value} for u in Unit]

@app.get("/api/enums/movement-types")
def get_movement_types():
    """İşlem tipi listesi"""
    return [{"value": m.value, "label": m.value} for m in MovementType]

@app.get("/api/enums/priorities")
def get_priorities():
    """Öncelik listesi"""
    return [{"value": p.value, "label": p.value} for p in RequestPriority]

@app.get("/api/enums/request-statuses")
def get_request_statuses():
    """Talep durumu listesi"""
    return [{"value": s.value, "label": s.value} for s in RequestStatus]

@app.get("/api/enums/order-statuses")
def get_order_statuses():
    """Sipariş durumu listesi"""
    return [{"value": s.value, "label": s.value} for s in OrderStatus]

@app.get("/api/enums/roles")
def get_roles():
    """Kullanıcı rolleri"""
    return [{"value": r.value, "label": r.value} for r in UserRole]

# ==================== AUDIT LOG ====================

@app.get("/api/audit-logs")
def get_audit_logs(modul: Optional[str] = None, kullanici: Optional[str] = None, limit: int = 100):
    """Audit logları getir"""
    logs = excel_manager.get_audit_logs()
    if modul:
        logs = [l for l in logs if l.modul == modul]
    if kullanici:
        logs = [l for l in logs if l.kullanici == kullanici]
    return logs[:limit]

# ==================== ANALİTİK ====================

@app.get("/api/analytics/monthly")
def get_monthly_analytics():
    """Aylık istatistikler"""
    return excel_manager.get_monthly_stats()

@app.get("/api/analytics/category")
def get_category_analytics():
    """Kategori bazlı analiz"""
    materials = excel_manager.get_all_materials()
    total_value = sum(m.mevcut_stok * m.birim_fiyat for m in materials)
    
    result = []
    for cat in ["Kırtasiye", "Temizlik", "Ofis Ekipmanı", "Mutfak", "Teknik", "Diğer"]:
        cat_materials = [m for m in materials if m.kategori == cat]
        cat_value = sum(m.mevcut_stok * m.birim_fiyat for m in cat_materials)
        result.append({
            "kategori": cat,
            "miktar": len(cat_materials),
            "deger": cat_value,
            "oran": (cat_value / total_value * 100) if total_value > 0 else 0
        })
    return result

@app.get("/api/analytics/trends")
def get_trends():
    """Trend analizi"""
    movements = excel_manager.get_all_movements()
    
    # Son 6 ayın verisi
    months = {}
    for m in movements:
        month = m.tarih[:7] if m.tarih else ""
        if month:
            if month not in months:
                months[month] = {"giris": 0, "cikis": 0}
            if m.islem_tipi == "Giriş":
                months[month]["giris"] += m.miktar
            else:
                months[month]["cikis"] += m.miktar
    
    sorted_months = sorted(months.items())[-6:]
    return {
        "labels": [m[0] for m in sorted_months],
        "giris": [m[1]["giris"] for m in sorted_months],
        "cikis": [m[1]["cikis"] for m in sorted_months]
    }

# ==================== STOK TAHMİN ====================

@app.get("/api/predictions")
def get_stock_predictions():
    """Stok tükenme tahminleri"""
    materials = excel_manager.get_all_materials()
    movements = excel_manager.get_all_movements()
    
    predictions = []
    for mat in materials:
        # Son 30 günlük çıkışları hesapla
        mat_exits = [m for m in movements if m.malzeme_kodu == mat.kod and m.islem_tipi == "Çıkış"]
        total_exit = sum(m.miktar for m in mat_exits[-30:]) if mat_exits else 0
        daily_consumption = total_exit / 30 if total_exit > 0 else 0
        
        if daily_consumption > 0:
            days_left = mat.mevcut_stok / daily_consumption
            from datetime import datetime, timedelta
            bitis = (datetime.now() + timedelta(days=days_left)).strftime("%Y-%m-%d")
            onerilen = max(0, int((mat.max_seviye - mat.mevcut_stok) * 1.2))
            
            if days_left <= 7:
                oncelik = "Acil"
            elif days_left <= 14:
                oncelik = "Yüksek"
            elif days_left <= 30:
                oncelik = "Normal"
            else:
                oncelik = "Düşük"
            
            predictions.append({
                "malzeme_kodu": mat.kod,
                "malzeme_adi": mat.ad,
                "mevcut_stok": mat.mevcut_stok,
                "gunluk_tuketim": round(daily_consumption, 2),
                "tahmini_bitis": bitis,
                "kalan_gun": int(days_left),
                "onerilen_siparis": onerilen,
                "oncelik": oncelik
            })
    
    # Önceliğe göre sırala
    priority_order = {"Acil": 0, "Yüksek": 1, "Normal": 2, "Düşük": 3}
    return sorted(predictions, key=lambda x: priority_order.get(x["oncelik"], 4))

# ==================== EXPORT ====================

@app.get("/api/export/materials")
def export_materials():
    """Malzeme listesini dışa aktar"""
    materials = excel_manager.get_all_materials()
    return {
        "filename": "malzemeler.xlsx",
        "headers": ["Kod", "Ad", "Kategori", "Birim", "Stok", "Min", "Max", "Konum", "Raf", "Barkod", "Fiyat", "Durum"],
        "data": [[m.kod, m.ad, m.kategori, m.birim, m.mevcut_stok, m.min_seviye, m.max_seviye, m.konum, m.raf, m.barkod, m.birim_fiyat, m.durum] for m in materials]
    }

@app.get("/api/export/movements")
def export_movements():
    """Hareketleri dışa aktar"""
    movements = excel_manager.get_all_movements()
    return {
        "filename": "hareketler.xlsx",
        "headers": ["Tarih", "Malzeme Kodu", "İşlem", "Miktar", "Kişi/Firma", "Açıklama", "Sipariş No", "Onaylayan"],
        "data": [[m.tarih, m.malzeme_kodu, m.islem_tipi, m.miktar, m.tedarikci_teslim_alan, m.aciklama, m.siparis_no, m.onaylayan] for m in movements]
    }

@app.get("/api/export/requests")
def export_requests():
    """Talepleri dışa aktar"""
    requests = excel_manager.get_all_requests()
    return {
        "filename": "talepler.xlsx",
        "headers": ["Talep No", "Tarih", "Malzeme", "Miktar", "Öncelik", "Talep Eden", "Departman", "Durum"],
        "data": [[r.talep_no, r.tarih, r.malzeme_adi, r.miktar, r.oncelik, r.talep_eden, r.departman, r.durum] for r in requests]
    }

@app.get("/api/export/orders")
def export_orders():
    """Siparişleri dışa aktar"""
    orders = excel_manager.get_all_orders()
    return {
        "filename": "siparisler.xlsx",
        "headers": ["Sipariş No", "Tarih", "Tedarikçi", "Tutar", "Durum", "Oluşturan"],
        "data": [[o.siparis_no, o.tarih, o.tedarikci_adi, o.toplam_tutar, o.durum, o.olusturan] for o in orders]
    }

# ==================== LOKASYONLAR ====================

@app.get("/api/locations")
def get_locations():
    """Lokasyon listesi"""
    return excel_manager.get_all_locations()

@app.post("/api/locations")
def create_location(location: LocationCreate):
    """Yeni lokasyon ekle"""
    return excel_manager.create_location(location)

@app.delete("/api/locations/{kod}")
def delete_location(kod: str):
    """Lokasyon sil"""
    deleted = excel_manager.delete_location(kod)
    if not deleted:
        raise HTTPException(status_code=404, detail="Lokasyon bulunamadı")
    return {"message": "Lokasyon silindi"}

# ==================== STOK SAYIM ====================

@app.get("/api/stock-counts")
def get_stock_counts():
    """Sayım listesi"""
    return excel_manager.get_all_stock_counts()

@app.post("/api/stock-counts")
def create_stock_count(count: StockCountCreate):
    """Yeni sayım planla"""
    return excel_manager.create_stock_count(count)

@app.put("/api/stock-counts/{sayim_no}/complete")
def complete_stock_count(sayim_no: str, tamamlayan: str):
    """Sayımı tamamla"""
    return excel_manager.complete_stock_count(sayim_no, tamamlayan)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
