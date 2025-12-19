from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum

# ==================== ENUMLAR ====================

class MovementType(str, Enum):
    GIRIS = "Giriş"
    CIKIS = "Çıkış"

class Category(str, Enum):
    KIRTASIYE = "Kırtasiye"
    TEMIZLIK = "Temizlik"
    OFIS_EKIPMANI = "Ofis Ekipmanı"
    MUTFAK = "Mutfak"
    TEKNIK = "Teknik"
    DIGER = "Diğer"

class Unit(str, Enum):
    ADET = "Adet"
    PAKET = "Paket"
    KUTU = "Kutu"
    LITRE = "Litre"
    KG = "Kg"
    KOLI = "Koli"

class UserRole(str, Enum):
    ADMIN = "Admin"
    MANAGER = "Yönetici"
    USER = "Kullanıcı"
    VIEWER = "Görüntüleyici"

class RequestPriority(str, Enum):
    LOW = "Düşük"
    NORMAL = "Normal"
    HIGH = "Yüksek"
    URGENT = "Acil"

class RequestStatus(str, Enum):
    PENDING = "Beklemede"
    APPROVED = "Onaylandı"
    REJECTED = "Reddedildi"
    COMPLETED = "Tamamlandı"

class OrderStatus(str, Enum):
    PENDING = "Onay Bekliyor"
    APPROVED = "Onaylandı"
    ORDERED = "Sipariş Verildi"
    SHIPPING = "Yolda"
    DELIVERED = "Teslim Edildi"
    CANCELLED = "İptal Edildi"

class NotificationType(str, Enum):
    CRITICAL_STOCK = "Kritik Stok"
    REQUEST_APPROVED = "Talep Onaylandı"
    REQUEST_REJECTED = "Talep Reddedildi"
    ORDER_UPDATE = "Sipariş Güncelleme"
    BUDGET_WARNING = "Bütçe Uyarısı"
    SYSTEM = "Sistem"

# ==================== KULLANICI ====================

class UserBase(BaseModel):
    username: str
    ad_soyad: str
    email: str
    departman: str
    rol: UserRole = UserRole.USER
    aktif: bool = True

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class User(UserBase):
    son_giris: Optional[str] = None
    
    class Config:
        from_attributes = True

class UserSession(BaseModel):
    user: User
    token: str

# ==================== MALZEME ====================

class MaterialBase(BaseModel):
    kod: str
    ad: str
    kategori: Category
    birim: Unit
    mevcut_stok: int = 0
    min_seviye: int = 5
    max_seviye: int = 100
    konum: str = ""
    raf: str = ""
    barkod: str = ""
    birim_fiyat: float = 0.0

class MaterialCreate(MaterialBase):
    pass

class Material(MaterialBase):
    son_guncelleme: Optional[str] = None
    son_sayim: Optional[str] = None
    durum: Optional[str] = None
    
    class Config:
        from_attributes = True

# ==================== STOK HAREKETİ ====================

class StockMovementBase(BaseModel):
    malzeme_kodu: str
    islem_tipi: MovementType
    miktar: int
    tedarikci_teslim_alan: str = ""
    aciklama: str = ""
    siparis_no: str = ""

class StockMovementCreate(StockMovementBase):
    onaylayan: str = ""

class StockMovement(StockMovementBase):
    tarih: str
    onaylayan: str = ""
    
    class Config:
        from_attributes = True

# ==================== TEDARİKÇİ ====================

class SupplierBase(BaseModel):
    kod: str
    ad: str
    yetkili_kisi: str = ""
    telefon: str = ""
    email: str = ""
    adres: str = ""
    kategori: str = ""
    puan: float = 5.0
    notlar: str = ""

class SupplierCreate(SupplierBase):
    pass

class Supplier(SupplierBase):
    son_siparis: Optional[str] = None
    toplam_siparis: int = 0
    aktif: bool = True
    
    class Config:
        from_attributes = True

# ==================== SİPARİŞ ====================

class OrderItemBase(BaseModel):
    malzeme_kodu: str
    malzeme_adi: str
    miktar: int
    birim_fiyat: float

class OrderItem(OrderItemBase):
    toplam: float = 0.0

class OrderBase(BaseModel):
    tedarikci_kodu: str
    tedarikci_adi: str
    kalemler: List[OrderItem]
    notlar: str = ""

class OrderCreate(OrderBase):
    olusturan: str

class Order(OrderBase):
    siparis_no: str
    tarih: str
    durum: OrderStatus = OrderStatus.PENDING
    toplam_tutar: float = 0.0
    olusturan: str = ""
    onaylayan: str = ""
    tahmini_teslim: str = ""
    teslim_tarihi: str = ""
    
    class Config:
        from_attributes = True

# ==================== TALEP ====================

class RequestBase(BaseModel):
    malzeme_kodu: str
    malzeme_adi: str
    miktar: int
    oncelik: RequestPriority = RequestPriority.NORMAL
    aciklama: str = ""

class RequestCreate(RequestBase):
    talep_eden: str
    departman: str

class Request(RequestBase):
    talep_no: str
    tarih: str
    talep_eden: str
    departman: str
    durum: RequestStatus = RequestStatus.PENDING
    onaylayan: str = ""
    onay_tarihi: str = ""
    red_nedeni: str = ""
    
    class Config:
        from_attributes = True

# ==================== BÜTÇE ====================

class BudgetBase(BaseModel):
    yil: int
    kategori: str
    aylik_limit: float
    yillik_limit: float

class BudgetCreate(BudgetBase):
    pass

class Budget(BudgetBase):
    kullanilan: float = 0.0
    kalan: float = 0.0
    
    class Config:
        from_attributes = True

class BudgetSummary(BaseModel):
    yil: int
    toplam_butce: float
    kullanilan: float
    kalan: float
    oran: float
    kategoriler: List[Budget]

# ==================== BİLDİRİM ====================

class NotificationBase(BaseModel):
    tip: NotificationType
    baslik: str
    mesaj: str
    link: str = ""

class NotificationCreate(NotificationBase):
    kullanici: str

class Notification(NotificationBase):
    id: str
    tarih: str
    kullanici: str
    okundu: bool = False
    
    class Config:
        from_attributes = True

# ==================== DASHBOARD ====================

class DashboardStats(BaseModel):
    toplam_malzeme: int
    toplam_stok_degeri: float
    kritik_stok_sayisi: int
    bekleyen_talep_sayisi: int
    bekleyen_siparis_sayisi: int
    kategori_dagilimi: dict
    aylik_harcama: float
    butce_durumu: dict

# ==================== RAPORLAR ====================

class ReportFilter(BaseModel):
    baslangic_tarihi: str = ""
    bitis_tarihi: str = ""
    kategori: str = ""
    departman: str = ""
    tedarikci: str = ""

class InventoryReport(BaseModel):
    malzemeler: List[Material]
    toplam_deger: float
    kritik_sayisi: int
    kategori_ozeti: dict

class MovementReport(BaseModel):
    hareketler: List[StockMovement]
    toplam_giris: int
    toplam_cikis: int
    net_degisim: int

class DepartmentReport(BaseModel):
    departman: str
    toplam_tuketim: float
    kalem_sayisi: int
    detaylar: List[dict]

class SupplierReport(BaseModel):
    tedarikci: str
    toplam_siparis: float
    siparis_sayisi: int
    ortalama_puan: float
    son_siparisler: List[dict]

# ==================== AUDIT LOG ====================

class AuditAction(str, Enum):
    CREATE = "Oluşturma"
    UPDATE = "Güncelleme"
    DELETE = "Silme"
    LOGIN = "Giriş"
    LOGOUT = "Çıkış"
    APPROVE = "Onay"
    REJECT = "Red"
    STOCK_IN = "Stok Girişi"
    STOCK_OUT = "Stok Çıkışı"

class AuditLog(BaseModel):
    id: str
    tarih: str
    kullanici: str
    islem: AuditAction
    modul: str
    kayit_id: str = ""
    eski_deger: str = ""
    yeni_deger: str = ""
    ip_adresi: str = ""
    detay: str = ""

# ==================== LOKASYON/DEPO ====================

class LocationBase(BaseModel):
    kod: str
    ad: str
    adres: str = ""
    sorumlu: str = ""
    telefon: str = ""
    aktif: bool = True

class LocationCreate(LocationBase):
    pass

class Location(LocationBase):
    malzeme_sayisi: int = 0
    toplam_deger: float = 0.0

# ==================== STOK SAYIM ====================

class CountStatus(str, Enum):
    PLANNED = "Planlandı"
    IN_PROGRESS = "Devam Ediyor"
    COMPLETED = "Tamamlandı"
    CANCELLED = "İptal"

class StockCountBase(BaseModel):
    lokasyon: str = ""
    kategori: str = ""
    planlanan_tarih: str
    aciklama: str = ""

class StockCountCreate(StockCountBase):
    olusturan: str

class StockCountItem(BaseModel):
    malzeme_kodu: str
    malzeme_adi: str
    beklenen_miktar: int
    sayilan_miktar: int = 0
    fark: int = 0

class StockCount(StockCountBase):
    sayim_no: str
    tarih: str
    durum: CountStatus = CountStatus.PLANNED
    olusturan: str = ""
    tamamlayan: str = ""
    tamamlanma_tarihi: str = ""
    kalemler: List[StockCountItem] = []

# ==================== STOK TAHMİN ====================

class StockPrediction(BaseModel):
    malzeme_kodu: str
    malzeme_adi: str
    mevcut_stok: int
    gunluk_tuketim: float
    tahmini_bitis: str
    onerilen_siparis: int
    oncelik: str

# ==================== ANALİTİK ====================

class AnalyticsData(BaseModel):
    labels: List[str]
    datasets: List[dict]

class MonthlyStats(BaseModel):
    ay: str
    giris: int
    cikis: int
    harcama: float

class CategoryStats(BaseModel):
    kategori: str
    miktar: int
    deger: float
    oran: float
