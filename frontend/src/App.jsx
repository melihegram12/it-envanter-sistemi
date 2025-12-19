import { useState, useEffect, useRef } from 'react'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js'
import { Bar, Line, Doughnut } from 'react-chartjs-2'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import { Html5Qrcode } from 'html5-qrcode'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend, Filler)

const API = import.meta.env.VITE_API_URL || '/api'
const api = {
    get: async (url) => { try { const r = await fetch(`${API}${url}`); return r.ok ? r.json() : null } catch { return null } },
    post: async (url, data) => { try { const r = await fetch(`${API}${url}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); return r.ok ? r.json() : null } catch { return null } },
    put: async (url, data) => { try { const r = await fetch(`${API}${url}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: data ? JSON.stringify(data) : undefined }); return r.ok ? r.json() : null } catch { return null } },
    delete: async (url) => { try { const r = await fetch(`${API}${url}`, { method: 'DELETE' }); return r.ok } catch { return false } }
}

const useToast = () => {
    const [toasts, setToasts] = useState([])
    const show = (msg, type = 'success') => { const id = Date.now(); setToasts(t => [...t, { id, msg, type }]); setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000) }
    return { toasts, show }
}

const Modal = ({ open, onClose, title, children, size }) => open ? (
    <div className="modal-overlay" onClick={onClose}>
        <div className={`modal ${size === 'lg' ? 'modal-lg' : ''}`} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3 className="modal-title">{title}</h3><button className="modal-close" onClick={onClose}>✕</button></div>
            {children}
        </div>
    </div>
) : null

// Barcode Scanner Component
const BarcodeScanner = ({ open, onClose, onScan, toast }) => {
    const scannerRef = useRef(null)
    const html5QrCodeRef = useRef(null)
    const [scanning, setScanning] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (open && scannerRef.current && !html5QrCodeRef.current) {
            html5QrCodeRef.current = new Html5Qrcode("barcode-scanner")
            startScanner()
        }
        return () => { stopScanner() }
    }, [open])

    const startScanner = async () => {
        if (!html5QrCodeRef.current) return
        setError('')
        setScanning(true)
        try {
            await html5QrCodeRef.current.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
                (decodedText) => {
                    stopScanner()
                    onScan(decodedText)
                    toast(`Barkod okundu: ${decodedText}`, 'success')
                    onClose()
                },
                () => { }
            )
        } catch (err) {
            setError('Kamera erişimi sağlanamadı. Lütfen izin verin.')
            setScanning(false)
        }
    }

    const stopScanner = async () => {
        if (html5QrCodeRef.current) {
            try { await html5QrCodeRef.current.stop() } catch { }
            html5QrCodeRef.current = null
        }
        setScanning(false)
    }

    const handleClose = () => { stopScanner(); onClose() }

    if (!open) return null

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="modal scanner-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">📷 Barkod/QR Tarayıcı</h3>
                    <button className="modal-close" onClick={handleClose}>✕</button>
                </div>
                <div className="modal-body scanner-body">
                    {error && <div className="scanner-error">{error}</div>}
                    <div id="barcode-scanner" ref={scannerRef} className="scanner-viewport"></div>
                    <p className="scanner-hint">Barkod veya QR kodu kameraya gösterin</p>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={handleClose}>İptal</button>
                </div>
            </div>
        </div>
    )
}

const chartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true, labels: { color: '#9ca3af' } } }, scales: { x: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#9ca3af' } }, y: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#9ca3af' } } } }

// Excel Export Helper
const exportExcel = async (type, toast) => {
    const data = await api.get(`/export/${type}`)
    if (data) {
        const ws = XLSX.utils.aoa_to_sheet([data.headers, ...data.data])
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Veri')
        const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
        saveAs(new Blob([buf], { type: 'application/octet-stream' }), data.filename)
        toast('Excel indirildi', 'success')
    }
}

// Print Label Function
const printLabel = (material) => {
    const printWindow = window.open('', '_blank', 'width=400,height=300')
    printWindow.document.write(`
        <html>
        <head>
            <title>Malzeme Etiketi - ${material.kod}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; text-align: center; }
                .label { border: 2px solid #333; padding: 20px; border-radius: 8px; max-width: 300px; margin: 0 auto; }
                .code { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
                .name { font-size: 16px; margin-bottom: 10px; }
                .barcode { font-family: monospace; font-size: 14px; background: #f0f0f0; padding: 8px; border-radius: 4px; }
                .details { font-size: 12px; color: #666; margin-top: 10px; }
                @media print { body { margin: 0; } }
            </style>
        </head>
        <body>
            <div class="label">
                <div class="code">${material.kod}</div>
                <div class="name">${material.ad}</div>
                <div class="barcode">${material.barkod || 'N/A'}</div>
                <div class="details">${material.kategori} | ${material.konum || 'Konum yok'}</div>
            </div>
            <script>window.print(); window.close();</script>
        </body>
        </html>
    `)
    printWindow.document.close()
}

// Print Report Function
const printReport = (title, data, columns) => {
    const printWindow = window.open('', '_blank')
    const rows = data.map(row => `<tr>${columns.map(c => `<td style="border:1px solid #ddd;padding:8px;">${row[c.key] || '-'}</td>`).join('')}</tr>`).join('')
    printWindow.document.write(`
        <html>
        <head>
            <title>${title}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h1 { color: #333; border-bottom: 2px solid #6366f1; padding-bottom: 10px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th { background: #6366f1; color: white; padding: 12px; text-align: left; }
                td { border: 1px solid #ddd; padding: 8px; }
                tr:nth-child(even) { background: #f9f9f9; }
                .footer { margin-top: 20px; font-size: 12px; color: #666; }
                @media print { body { margin: 0; } }
            </style>
        </head>
        <body>
            <h1>📊 ${title}</h1>
            <p>Tarih: ${new Date().toLocaleDateString('tr-TR')}</p>
            <table>
                <thead><tr>${columns.map(c => `<th>${c.label}</th>`).join('')}</tr></thead>
                <tbody>${rows}</tbody>
            </table>
            <div class="footer">Bu rapor Envanter Pro sistemi tarafından oluşturulmuştur.</div>
            <script>window.print();</script>
        </body>
        </html>
    `)
    printWindow.document.close()
}

// Excel Import Helper
const importExcel = (file, onData) => {
    const reader = new FileReader()
    reader.onload = (e) => {
        const wb = XLSX.read(e.target.result, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const data = XLSX.utils.sheet_to_json(ws)
        onData(data)
    }
    reader.readAsArrayBuffer(file)
}

// Notification Center Component
const NotificationCenter = ({ notifications, onClear, onMarkRead }) => {
    const [open, setOpen] = useState(false)
    const unreadCount = notifications.filter(n => !n.read).length

    return (
        <div className="notification-center">
            <button className="notification-btn" onClick={() => setOpen(!open)}>
                🔔
                {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
            </button>
            {open && (
                <div className="notification-dropdown">
                    <div className="notification-header">
                        <h4>Bildirimler</h4>
                        {notifications.length > 0 && <button className="btn btn-xs" onClick={onClear}>Temizle</button>}
                    </div>
                    <div className="notification-list">
                        {notifications.length === 0 ? (
                            <div className="notification-empty">Bildirim yok</div>
                        ) : notifications.slice(0, 10).map((n, i) => (
                            <div key={i} className={`notification-item ${n.read ? '' : 'unread'}`} onClick={() => onMarkRead(i)}>
                                <div className="notification-icon">{n.type === 'warning' ? '⚠️' : n.type === 'success' ? '✅' : 'ℹ️'}</div>
                                <div className="notification-content">
                                    <div className="notification-title">{n.title}</div>
                                    <div className="notification-time">{n.time}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

// Login
const LoginPage = ({ onLogin }) => {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [showPwd, setShowPwd] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleLogin = async (e) => {
        e.preventDefault(); setLoading(true); setError('')
        const res = await api.post('/auth/login', { username, password })
        setLoading(false)
        if (res) onLogin(res.user, res.token)
        else setError('Geçersiz kullanıcı adı veya şifre')
    }

    return (
        <div className="login-page"><div className="login-container"><div className="login-card">
            <div className="login-logo">🔌</div>
            <h2 className="login-title">Malhotra Kablo</h2>
            <p className="login-subtitle">İdari İşler Envanteri</p>
            {error && <div className="login-error">{error}</div>}
            <form className="login-form" onSubmit={handleLogin}>
                <div className="form-group"><label className="form-label">Kullanıcı Adı</label><input className="form-input" value={username} onChange={e => setUsername(e.target.value)} placeholder="admin" required /></div>
                <div className="form-group"><label className="form-label">Şifre</label>
                    <div className="password-input-wrapper">
                        <input className="form-input" type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••" required />
                        <button type="button" className="password-toggle" onClick={() => setShowPwd(!showPwd)}>{showPwd ? '🙈' : '👁️'}</button>
                    </div>
                </div>
                <button className="btn btn-primary login-btn" disabled={loading}>{loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}</button>
            </form>
            <p style={{ marginTop: 16, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Demo: admin / admin123</p>
        </div></div></div>
    )
}

// Sidebar
const Sidebar = ({ user, page, setPage, onLogout, pendingRequests, mobileOpen, onMobileToggle }) => {
    const menuItems = [
        { key: 'dashboard', icon: '📊', label: 'Dashboard' },
        { key: 'materials', icon: '📦', label: 'Malzemeler' },
        { key: 'movements', icon: '📋', label: 'Stok Hareketleri' },
        { key: 'requests', icon: '📝', label: 'Talepler', badge: pendingRequests },
        { key: 'orders', icon: '🛒', label: 'Siparişler' },
        { key: 'analytics', icon: '📈', label: 'Analitik' },
        { key: 'predictions', icon: '🔮', label: 'Tahminler' },
        { key: 'locations', icon: '🏢', label: 'Lokasyonlar' },
        { key: 'stockcount', icon: '✅', label: 'Stok Sayım' },
        { key: 'audit', icon: '📜', label: 'Audit Log' },
        { key: 'reports', icon: '📑', label: 'Raporlar' },
    ]

    const handlePageClick = (key) => { setPage(key); if (onMobileToggle) onMobileToggle(false) }

    return (
        <>
            {mobileOpen && <div className="sidebar-overlay" onClick={() => onMobileToggle(false)}></div>}
            <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
                <div className="sidebar-header"><div className="sidebar-logo"><div className="sidebar-logo-icon">🔌</div><div><h1>Malhotra Kablo</h1><span>İdari İşler</span></div></div></div>
                <nav className="sidebar-nav">
                    <div className="nav-section"><div className="nav-section-title">Ana</div>
                        {menuItems.slice(0, 4).map(m => (
                            <button key={m.key} className={`nav-item ${page === m.key ? 'active' : ''}`} onClick={() => setPage(m.key)}>
                                <span className="nav-item-icon">{m.icon}</span>{m.label}
                                {m.badge > 0 && <span className="nav-item-badge">{m.badge}</span>}
                            </button>
                        ))}
                    </div>
                    <div className="nav-section"><div className="nav-section-title">Yönetim</div>
                        {menuItems.slice(4, 7).map(m => <button key={m.key} className={`nav-item ${page === m.key ? 'active' : ''}`} onClick={() => setPage(m.key)}><span className="nav-item-icon">{m.icon}</span>{m.label}</button>)}
                    </div>
                    <div className="nav-section"><div className="nav-section-title">Gelişmiş</div>
                        {menuItems.slice(7).map(m => <button key={m.key} className={`nav-item ${page === m.key ? 'active' : ''}`} onClick={() => setPage(m.key)}><span className="nav-item-icon">{m.icon}</span>{m.label}</button>)}
                    </div>
                </nav>
                <div className="sidebar-footer">
                    <div className="user-menu">
                        <div className="user-avatar">{user?.ad_soyad?.[0] || 'U'}</div>
                        <div className="user-info"><div className="user-name">{user?.ad_soyad}</div><div className="user-role">{user?.rol}</div></div>
                        <button className="logout-btn" onClick={onLogout}>🚪</button>
                    </div>
                </div>
            </aside>
        </>
    )
}

// Dashboard with Charts
const Dashboard = ({ stats, criticals, movements, requests, toast }) => {
    const catData = { labels: Object.keys(stats.kategori_dagilimi || {}), datasets: [{ data: Object.values(stats.kategori_dagilimi || {}), backgroundColor: ['#6366f1', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#6b7280'], borderWidth: 0 }] }
    const doughnutOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#9ca3af', padding: 10 } } } }

    return (
        <div>
            <div className="stats-grid">
                <div className="stat-card"><div className="stat-icon primary">📦</div><div className="stat-content"><h3>{stats.toplam_malzeme || 0}</h3><p>Toplam Malzeme</p></div></div>
                <div className="stat-card"><div className="stat-icon danger">⚠️</div><div className="stat-content"><h3>{stats.kritik_stok_sayisi || 0}</h3><p>Kritik Stok</p></div></div>
                <div className="stat-card"><div className="stat-icon warning">📝</div><div className="stat-content"><h3>{stats.bekleyen_talep_sayisi || 0}</h3><p>Bekleyen Talep</p></div></div>
            </div>
            <div className="main-grid">
                <div>
                    {criticals.length > 0 && <div className="card" style={{ marginBottom: 24 }}><div className="card-header"><h3 className="card-title">⚠️ Kritik Stok</h3></div>
                        <div className="alert-list">{criticals.slice(0, 5).map(m => <div key={m.kod} className="alert-item critical"><div className="alert-icon">!</div><div className="alert-content"><div className="alert-title">{m.ad}</div><div className="alert-subtitle">Stok: {m.mevcut_stok} / Min: {m.min_seviye}</div></div></div>)}</div>
                    </div>}
                    <div className="card"><div className="card-header"><h3 className="card-title">📋 Son Hareketler</h3></div>
                        <div className="movement-list">{movements.slice(0, 5).map((m, i) => <div key={i} className="movement-item"><div className={`movement-icon ${m.islem_tipi === 'Giriş' ? 'giris' : 'cikis'}`}>{m.islem_tipi === 'Giriş' ? '↓' : '↑'}</div><div className="movement-details"><div className="movement-title">{m.malzeme_kodu}</div><div className="movement-meta">{m.tarih}</div></div><div className={`movement-amount ${m.islem_tipi === 'Giriş' ? 'giris' : 'cikis'}`}>{m.islem_tipi === 'Giriş' ? '+' : '-'}{m.miktar}</div></div>)}</div>
                    </div>
                </div>
                <div>
                    <div className="card" style={{ marginBottom: 24 }}><div className="card-header"><h3 className="card-title">📊 Kategori Dağılımı</h3></div><div style={{ height: 200 }}><Doughnut data={catData} options={doughnutOptions} /></div></div>
                </div>
            </div>
        </div>
    )
}

// Materials with Bulk Selection & Export
const MaterialsPage = ({ materials, refresh, toast }) => {
    const [search, setSearch] = useState('')
    const [modal, setModal] = useState(false)
    const [scannerOpen, setScannerOpen] = useState(false)
    const [edit, setEdit] = useState(null)
    const [form, setForm] = useState({ kod: '', ad: '', kategori: 'Kırtasiye', birim: 'Adet', mevcut_stok: 0, min_seviye: 5, max_seviye: 100, konum: '', raf: '', barkod: '', birim_fiyat: 0 })
    const [selected, setSelected] = useState([])

    // Excel Import State
    const [importModal, setImportModal] = useState(false)
    const [importing, setImporting] = useState(false)
    const [importResult, setImportResult] = useState(null)
    const fileInputRef = useRef(null)

    const cats = ['Kırtasiye', 'Temizlik', 'Ofis Ekipmanı', 'Mutfak', 'Teknik', 'Diğer']
    const units = ['Adet', 'Paket', 'Kutu', 'Litre', 'Kg', 'Koli']
    const filtered = materials.filter(m => m.ad?.toLowerCase().includes(search.toLowerCase()) || m.kod?.toLowerCase().includes(search.toLowerCase()) || m.barkod?.toLowerCase().includes(search.toLowerCase()))

    // Barkod tarandığında arama alanına yaz
    const handleBarcodeScan = (barcode) => {
        setSearch(barcode)
        toast(`Barkod bulundu: ${barcode}`, 'success')
    }

    // Seçim işlemleri
    const toggleSelect = (kod) => {
        setSelected(prev => prev.includes(kod) ? prev.filter(k => k !== kod) : [...prev, kod])
    }

    const selectAll = () => {
        if (selected.length === filtered.length) {
            setSelected([])
        } else {
            setSelected(filtered.map(m => m.kod))
        }
    }

    const clearSelection = () => setSelected([])

    // CRUD işlemleri
    const openAdd = () => { setEdit(null); setForm({ kod: '', ad: '', kategori: 'Kırtasiye', birim: 'Adet', mevcut_stok: 0, min_seviye: 5, max_seviye: 100, konum: '', raf: '', barkod: '', birim_fiyat: 0 }); setModal(true) }
    const openEdit = (m) => { setEdit(m); setForm({ ...m }); setModal(true) }
    const save = async () => { if (edit) await api.put(`/materials/${edit.kod}`, form); else await api.post('/materials', form); setModal(false); refresh(); toast(edit ? 'Güncellendi' : 'Eklendi') }
    const del = async (kod) => { if (confirm('Silmek istediğinize emin misiniz?')) { await api.delete(`/materials/${kod}`); refresh(); toast('Silindi') } }

    // Toplu silme
    const bulkDelete = async () => {
        if (selected.length === 0) return
        if (!confirm(`${selected.length} malzemeyi silmek istediğinize emin misiniz?`)) return

        let deleted = 0
        for (const kod of selected) {
            const result = await api.delete(`/materials/${kod}`)
            if (result !== false) deleted++
        }
        setSelected([])
        refresh()
        toast(`${deleted} malzeme silindi`, 'success')
    }

    // Etiket yazdırma
    const printSelectedLabels = () => {
        const selectedMats = materials.filter(m => selected.includes(m.kod))
        if (selectedMats.length === 0) return

        selectedMats.forEach(m => printLabel(m))
        toast(`${selectedMats.length} etiket yazdırıldı`, 'success')
    }

    // Excel dosyasından içe aktar
    const handleExcelImport = async (e) => {
        const file = e.target.files[0]
        if (!file) return

        setImporting(true)
        setImportResult(null)

        const formData = new FormData()
        formData.append('file', file)

        try {
            const response = await fetch('/api/materials/import-excel', {
                method: 'POST',
                body: formData
            })
            const result = await response.json()

            if (response.ok) {
                setImportResult(result)
                refresh()
                toast(`${result.imported} malzeme içe aktarıldı`, 'success')
            } else {
                setImportResult({ success: false, error: result.detail || 'Hata oluştu' })
                toast('İçe aktarma başarısız', 'error')
            }
        } catch (err) {
            setImportResult({ success: false, error: 'Bağlantı hatası' })
            toast('Bağlantı hatası', 'error')
        } finally {
            setImporting(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    return (
        <div className="card">
            <div className="card-header">
                <h3 className="card-title">📦 Malzeme Listesi</h3>
                <div className="card-actions">
                    <button className="btn btn-success btn-sm" onClick={() => setImportModal(true)} title="Excel'den malzeme yükle">📤 Excel'den Yükle</button>
                    <button className="btn btn-info btn-sm" onClick={() => setScannerOpen(true)} title="Kamera ile barkod/QR kod tarayın">📷 Tara</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => exportExcel('materials', toast)}>📥 Excel</button>
                    <button className="btn btn-primary" onClick={openAdd}>+ Yeni</button>
                </div>
            </div>

            {/* Toolbar */}
            <div className="toolbar">
                <div className="search-bar">
                    <span className="search-icon">🔍</span>
                    <input className="search-input" placeholder="Kod, Ad veya Barkod ile ara..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
            </div>

            {/* Bulk Actions Bar */}
            {selected.length > 0 && (
                <div className="bulk-actions-bar">
                    <span className="bulk-info">✓ {selected.length} öğe seçili</span>
                    <div className="bulk-buttons">
                        <button className="btn btn-secondary btn-sm" onClick={printSelectedLabels}>🏷️ Etiket Yazdır</button>
                        <button className="btn btn-danger btn-sm" onClick={bulkDelete}>🗑️ Seçilenleri Sil</button>
                        <button className="btn btn-secondary btn-sm" onClick={clearSelection}>✕ Seçimi Temizle</button>
                    </div>
                </div>
            )}

            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th style={{ width: 40 }}>
                                <input
                                    type="checkbox"
                                    className="bulk-checkbox"
                                    checked={filtered.length > 0 && selected.length === filtered.length}
                                    onChange={selectAll}
                                    title="Tümünü seç/kaldır"
                                />
                            </th>
                            <th>Kod</th>
                            <th>Ad</th>
                            <th>Kategori</th>
                            <th>Stok</th>
                            <th>Konum</th>
                            <th>Barkod</th>
                            <th>Durum</th>
                            <th>İşlem</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(m => (
                            <tr key={m.kod} className={selected.includes(m.kod) ? 'row-selected' : ''}>
                                <td>
                                    <input
                                        type="checkbox"
                                        className="bulk-checkbox"
                                        checked={selected.includes(m.kod)}
                                        onChange={() => toggleSelect(m.kod)}
                                    />
                                </td>
                                <td><strong>{m.kod}</strong></td>
                                <td>{m.ad}</td>
                                <td><span className="badge badge-primary">{m.kategori}</span></td>
                                <td>{m.mevcut_stok}</td>
                                <td>{m.konum || '-'}</td>
                                <td><code style={{ fontSize: '0.8rem' }}>{m.barkod || '-'}</code></td>
                                <td><span className={`badge status-${m.durum?.toLowerCase()}`}>{m.durum}</span></td>
                                <td>
                                    <div className="actions">
                                        <button className="btn btn-secondary btn-icon-sm" onClick={() => printLabel(m)} title="Etiket Yazdır">🏷️</button>
                                        <button className="btn btn-secondary btn-icon-sm" onClick={() => openEdit(m)} title="Düzenle">✏️</button>
                                        <button className="btn btn-danger btn-icon-sm" onClick={() => del(m.kod)} title="Sil">🗑️</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Scanner Help */}
            <div className="scanner-help">
                <span className="scanner-help-icon">💡</span>
                <span><strong>Barkod Tarama:</strong> "📷 Tara" butonuna tıklayın → Kamera açılacak → Barkodu kameraya gösterin → Otomatik olarak arama yapılacak</span>
            </div>

            <Modal open={modal} onClose={() => setModal(false)} title={edit ? 'Düzenle' : 'Yeni Malzeme'}>
                <div className="modal-body">
                    <div className="form-row"><div className="form-group"><label className="form-label">Kod</label><input className="form-input" value={form.kod} onChange={e => setForm({ ...form, kod: e.target.value })} disabled={!!edit} /></div><div className="form-group"><label className="form-label">Ad</label><input className="form-input" value={form.ad} onChange={e => setForm({ ...form, ad: e.target.value })} /></div></div>
                    <div className="form-row"><div className="form-group"><label className="form-label">Kategori</label><select className="form-select" value={form.kategori} onChange={e => setForm({ ...form, kategori: e.target.value })}>{cats.map(c => <option key={c}>{c}</option>)}</select></div><div className="form-group"><label className="form-label">Birim</label><select className="form-select" value={form.birim} onChange={e => setForm({ ...form, birim: e.target.value })}>{units.map(u => <option key={u}>{u}</option>)}</select></div></div>
                    <div className="form-row-3"><div className="form-group"><label className="form-label">Stok</label><input className="form-input" type="number" value={form.mevcut_stok} onChange={e => setForm({ ...form, mevcut_stok: +e.target.value })} /></div><div className="form-group"><label className="form-label">Min</label><input className="form-input" type="number" value={form.min_seviye} onChange={e => setForm({ ...form, min_seviye: +e.target.value })} /></div><div className="form-group"><label className="form-label">Max</label><input className="form-input" type="number" value={form.max_seviye} onChange={e => setForm({ ...form, max_seviye: +e.target.value })} /></div></div>
                    <div className="form-row"><div className="form-group"><label className="form-label">Konum</label><input className="form-input" value={form.konum || ''} onChange={e => setForm({ ...form, konum: e.target.value })} /></div><div className="form-group"><label className="form-label">Raf</label><input className="form-input" value={form.raf || ''} onChange={e => setForm({ ...form, raf: e.target.value })} /></div></div>
                    <div className="form-row"><div className="form-group"><label className="form-label">Barkod</label><input className="form-input" value={form.barkod || ''} onChange={e => setForm({ ...form, barkod: e.target.value })} /></div><div className="form-group"><label className="form-label">Fiyat</label><input className="form-input" type="number" step="0.01" value={form.birim_fiyat} onChange={e => setForm({ ...form, birim_fiyat: +e.target.value })} /></div></div>
                </div>
                <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setModal(false)}>İptal</button><button className="btn btn-primary" onClick={save}>Kaydet</button></div>
            </Modal>
            <BarcodeScanner open={scannerOpen} onClose={() => setScannerOpen(false)} onScan={handleBarcodeScan} toast={toast} />

            {/* Excel Import Modal */}
            <Modal open={importModal} onClose={() => { setImportModal(false); setImportResult(null) }} title="📤 Excel'den Malzeme Yükle">
                <div className="modal-body">
                    <div className="import-info">
                        <p><strong>Desteklenen Format:</strong></p>
                        <ul style={{ marginLeft: 20, marginTop: 8 }}>
                            <li>Sayı | <strong>Ürün Adı</strong> | Adet | Durum</li>
                            <li>Adet kolonu: "11 KUTU", "5 KUTU", "2 BİDON", "37" gibi değerler</li>
                        </ul>
                    </div>

                    <div className="form-group" style={{ marginTop: 16 }}>
                        <label className="form-label">Excel Dosyası Seçin (.xlsx, .xls)</label>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx,.xls"
                            className="form-input"
                            onChange={handleExcelImport}
                            disabled={importing}
                        />
                    </div>

                    {importing && (
                        <div className="import-progress">
                            <span className="loading-spinner">⏳</span> Yükleniyor...
                        </div>
                    )}

                    {importResult && (
                        <div className={`import-result ${importResult.success ? 'success' : 'error'}`}>
                            {importResult.success ? (
                                <>
                                    <div className="result-icon">✅</div>
                                    <div className="result-content">
                                        <strong>{importResult.imported} malzeme başarıyla içe aktarıldı</strong>
                                        {importResult.skipped > 0 && (
                                            <p style={{ marginTop: 8, color: '#fbbf24' }}>
                                                ⚠️ {importResult.skipped} malzeme atlandı (zaten mevcut)
                                            </p>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="result-icon">❌</div>
                                    <div className="result-content">
                                        <strong>Hata:</strong> {importResult.error}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={() => { setImportModal(false); setImportResult(null) }}>Kapat</button>
                </div>
            </Modal>
        </div>
    )
}

// Movements
const MovementsPage = ({ materials, movements, refresh, toast }) => {
    const [modal, setModal] = useState(false)
    const [form, setForm] = useState({ malzeme_kodu: '', islem_tipi: 'Giriş', miktar: 1, tedarikci_teslim_alan: '', aciklama: '' })
    const save = async () => { await api.post('/movements', form); setModal(false); refresh(); toast('Hareket kaydedildi') }

    return (
        <div className="card">
            <div className="card-header"><h3 className="card-title">📋 Stok Hareketleri</h3><div className="card-actions"><button className="btn btn-secondary btn-sm" onClick={() => exportExcel('movements', toast)}>📥 Excel</button><button className="btn btn-primary" onClick={() => setModal(true)}>+ Yeni</button></div></div>
            <div className="table-container">
                <table className="table">
                    <thead><tr><th>Tarih</th><th>Malzeme</th><th>İşlem</th><th>Miktar</th><th>Kişi/Firma</th><th>Açıklama</th></tr></thead>
                    <tbody>{movements.map((m, i) => <tr key={i}><td>{m.tarih}</td><td><strong>{m.malzeme_kodu}</strong></td><td><span className={`badge ${m.islem_tipi === 'Giriş' ? 'badge-success' : 'badge-danger'}`}>{m.islem_tipi === 'Giriş' ? '↓ Giriş' : '↑ Çıkış'}</span></td><td className={m.islem_tipi === 'Giriş' ? 'movement-amount giris' : 'movement-amount cikis'}>{m.islem_tipi === 'Giriş' ? '+' : '-'}{m.miktar}</td><td>{m.tedarikci_teslim_alan || '-'}</td><td>{m.aciklama || '-'}</td></tr>)}</tbody>
                </table>
            </div>
            <Modal open={modal} onClose={() => setModal(false)} title="Yeni Hareket">
                <div className="modal-body">
                    <div className="form-group"><label className="form-label">Malzeme</label><select className="form-select" value={form.malzeme_kodu} onChange={e => setForm({ ...form, malzeme_kodu: e.target.value })}><option value="">Seçin...</option>{materials.map(m => <option key={m.kod} value={m.kod}>{m.kod} - {m.ad}</option>)}</select></div>
                    <div className="form-row"><div className="form-group"><label className="form-label">İşlem</label><select className="form-select" value={form.islem_tipi} onChange={e => setForm({ ...form, islem_tipi: e.target.value })}><option>Giriş</option><option>Çıkış</option></select></div><div className="form-group"><label className="form-label">Miktar</label><input className="form-input" type="number" value={form.miktar} onChange={e => setForm({ ...form, miktar: +e.target.value })} /></div></div>
                    <div className="form-group"><label className="form-label">{form.islem_tipi === 'Giriş' ? 'Tedarikçi' : 'Teslim Alan'}</label><input className="form-input" value={form.tedarikci_teslim_alan} onChange={e => setForm({ ...form, tedarikci_teslim_alan: e.target.value })} /></div>
                    <div className="form-group"><label className="form-label">Açıklama</label><input className="form-input" value={form.aciklama} onChange={e => setForm({ ...form, aciklama: e.target.value })} /></div>
                </div>
                <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setModal(false)}>İptal</button><button className="btn btn-success" onClick={save}>Kaydet</button></div>
            </Modal>
        </div>
    )
}

// Requests
const RequestsPage = ({ materials, requests, user, refresh, toast }) => {
    const [modal, setModal] = useState(false)
    const [form, setForm] = useState({ malzeme_kodu: '', miktar: 1, oncelik: 'Normal', aciklama: '' })
    const create = async () => { const mat = materials.find(m => m.kod === form.malzeme_kodu); await api.post('/requests', { ...form, malzeme_adi: mat?.ad || '', talep_eden: user.ad_soyad, departman: user.departman }); setModal(false); refresh(); toast('Talep oluşturuldu') }
    const approve = async (no) => { await api.put(`/requests/${no}/approve?onaylayan=${user.ad_soyad}`); refresh(); toast('Onaylandı') }
    const reject = async (no) => { const reason = prompt('Red nedeni:'); if (reason) { await api.put(`/requests/${no}/reject?onaylayan=${user.ad_soyad}&red_nedeni=${reason}`); refresh(); toast('Reddedildi') } }

    return (
        <div className="card">
            <div className="card-header"><h3 className="card-title">📝 Talepler</h3><div className="card-actions"><button className="btn btn-secondary btn-sm" onClick={() => exportExcel('requests', toast)}>📥 Excel</button><button className="btn btn-primary" onClick={() => setModal(true)}>+ Yeni</button></div></div>
            <div className="table-container">
                <table className="table">
                    <thead><tr><th>No</th><th>Tarih</th><th>Malzeme</th><th>Miktar</th><th>Öncelik</th><th>Talep Eden</th><th>Durum</th><th>İşlem</th></tr></thead>
                    <tbody>{requests.map(r => <tr key={r.talep_no}><td><strong>{r.talep_no}</strong></td><td>{r.tarih}</td><td>{r.malzeme_adi}</td><td>{r.miktar}</td><td><span className={`badge priority-${r.oncelik?.toLowerCase()}`}>{r.oncelik}</span></td><td>{r.talep_eden}</td><td><span className={`badge status-${r.durum?.toLowerCase().replace(' ', '-')}`}>{r.durum}</span></td>
                        <td>{r.durum === 'Beklemede' && (user.rol === 'Admin' || user.rol === 'Yönetici') && <div className="actions"><button className="btn btn-success btn-xs" onClick={() => approve(r.talep_no)}>✓</button><button className="btn btn-danger btn-xs" onClick={() => reject(r.talep_no)}>✕</button></div>}</td>
                    </tr>)}</tbody>
                </table>
            </div>
            <Modal open={modal} onClose={() => setModal(false)} title="Yeni Talep">
                <div className="modal-body">
                    <div className="form-group"><label className="form-label">Malzeme</label><select className="form-select" value={form.malzeme_kodu} onChange={e => setForm({ ...form, malzeme_kodu: e.target.value })}><option value="">Seçin...</option>{materials.map(m => <option key={m.kod} value={m.kod}>{m.ad}</option>)}</select></div>
                    <div className="form-row"><div className="form-group"><label className="form-label">Miktar</label><input className="form-input" type="number" value={form.miktar} onChange={e => setForm({ ...form, miktar: +e.target.value })} /></div><div className="form-group"><label className="form-label">Öncelik</label><select className="form-select" value={form.oncelik} onChange={e => setForm({ ...form, oncelik: e.target.value })}><option>Düşük</option><option>Normal</option><option>Yüksek</option><option>Acil</option></select></div></div>
                    <div className="form-group"><label className="form-label">Açıklama</label><textarea className="form-textarea" value={form.aciklama} onChange={e => setForm({ ...form, aciklama: e.target.value })} /></div>
                </div>
                <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setModal(false)}>İptal</button><button className="btn btn-primary" onClick={create}>Oluştur</button></div>
            </Modal>
        </div>
    )
}

// Suppliers
const SuppliersPage = ({ suppliers, refresh, toast }) => {
    const [modal, setModal] = useState(false)
    const [edit, setEdit] = useState(null)
    const [form, setForm] = useState({ kod: '', ad: '', yetkili_kisi: '', telefon: '', email: '', adres: '', kategori: '', puan: 5 })
    const openAdd = () => { setEdit(null); setForm({ kod: '', ad: '', yetkili_kisi: '', telefon: '', email: '', adres: '', kategori: '', puan: 5 }); setModal(true) }
    const openEdit = (s) => { setEdit(s); setForm({ ...s }); setModal(true) }
    const save = async () => { if (edit) await api.put(`/suppliers/${edit.kod}`, form); else await api.post('/suppliers', form); setModal(false); refresh(); toast(edit ? 'Güncellendi' : 'Eklendi') }
    const del = async (kod) => { if (confirm('Silmek?')) { await api.delete(`/suppliers/${kod}`); refresh(); toast('Silindi') } }
    const stars = (n) => '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n))

    return (
        <div className="card">
            <div className="card-header"><h3 className="card-title">🏪 Tedarikçiler</h3><button className="btn btn-primary" onClick={openAdd}>+ Yeni</button></div>
            <div className="supplier-grid">{suppliers.map(s => <div key={s.kod} className="supplier-card">
                <div className="supplier-header"><div className="supplier-info"><h3>{s.ad}</h3><p>{s.kod}</p></div><div className="supplier-rating" style={{ color: '#fbbf24' }}>{stars(s.puan)}</div></div>
                <div className="supplier-details"><div className="supplier-detail"><span>Yetkili:</span><span>{s.yetkili_kisi || '-'}</span></div><div className="supplier-detail"><span>Telefon:</span><span>{s.telefon || '-'}</span></div><div className="supplier-detail"><span>E-posta:</span><span>{s.email || '-'}</span></div></div>
                <div className="supplier-footer"><span className={`badge ${s.aktif ? 'badge-success' : 'badge-muted'}`}>{s.aktif ? 'Aktif' : 'Pasif'}</span><div className="actions"><button className="btn btn-secondary btn-icon-sm" onClick={() => openEdit(s)}>✏️</button><button className="btn btn-danger btn-icon-sm" onClick={() => del(s.kod)}>🗑️</button></div></div>
            </div>)}</div>
            <Modal open={modal} onClose={() => setModal(false)} title={edit ? 'Düzenle' : 'Yeni Tedarikçi'}>
                <div className="modal-body">
                    <div className="form-row"><div className="form-group"><label className="form-label">Kod</label><input className="form-input" value={form.kod} onChange={e => setForm({ ...form, kod: e.target.value })} disabled={!!edit} /></div><div className="form-group"><label className="form-label">Ad</label><input className="form-input" value={form.ad} onChange={e => setForm({ ...form, ad: e.target.value })} /></div></div>
                    <div className="form-row"><div className="form-group"><label className="form-label">Yetkili</label><input className="form-input" value={form.yetkili_kisi || ''} onChange={e => setForm({ ...form, yetkili_kisi: e.target.value })} /></div><div className="form-group"><label className="form-label">Telefon</label><input className="form-input" value={form.telefon || ''} onChange={e => setForm({ ...form, telefon: e.target.value })} /></div></div>
                    <div className="form-row"><div className="form-group"><label className="form-label">E-posta</label><input className="form-input" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} /></div><div className="form-group"><label className="form-label">Puan</label><input className="form-input" type="number" min="1" max="5" step="0.5" value={form.puan} onChange={e => setForm({ ...form, puan: +e.target.value })} /></div></div>
                </div>
                <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setModal(false)}>İptal</button><button className="btn btn-primary" onClick={save}>Kaydet</button></div>
            </Modal>
        </div>
    )
}

// Orders
const OrdersPage = ({ orders, suppliers, materials, user, refresh, toast }) => {
    const [modal, setModal] = useState(false)
    const [form, setForm] = useState({ tedarikci_kodu: '', kalemler: [], notlar: '' })
    const [item, setItem] = useState({ malzeme_kodu: '', miktar: 1, birim_fiyat: 0 })
    const addItem = () => { const mat = materials.find(m => m.kod === item.malzeme_kodu); if (mat) { setForm({ ...form, kalemler: [...form.kalemler, { ...item, malzeme_adi: mat.ad, birim_fiyat: mat.birim_fiyat }] }); setItem({ malzeme_kodu: '', miktar: 1, birim_fiyat: 0 }) } }
    const create = async () => { const sup = suppliers.find(s => s.kod === form.tedarikci_kodu); await api.post('/orders', { ...form, tedarikci_adi: sup?.ad || '', olusturan: user.ad_soyad }); setModal(false); setForm({ tedarikci_kodu: '', kalemler: [], notlar: '' }); refresh(); toast('Sipariş oluşturuldu') }
    const updateStatus = async (no, st) => { await api.put(`/orders/${no}/status?durum=${st}&onaylayan=${user.ad_soyad}`); refresh(); toast('Güncellendi') }

    return (
        <div className="card">
            <div className="card-header"><h3 className="card-title">🛒 Siparişler</h3><div className="card-actions"><button className="btn btn-secondary btn-sm" onClick={() => exportExcel('orders', toast)}>📥 Excel</button><button className="btn btn-primary" onClick={() => setModal(true)}>+ Yeni</button></div></div>
            <div className="table-container">
                <table className="table">
                    <thead><tr><th>No</th><th>Tarih</th><th>Tedarikçi</th><th>Tutar</th><th>Durum</th><th>İşlem</th></tr></thead>
                    <tbody>{orders.map(o => <tr key={o.siparis_no}><td><strong>{o.siparis_no}</strong></td><td>{o.tarih}</td><td>{o.tedarikci_adi}</td><td>{o.toplam_tutar?.toLocaleString('tr-TR')} ₺</td><td><span className="badge badge-warning">{o.durum}</span></td>
                        <td>{o.durum === 'Onay Bekliyor' && <button className="btn btn-success btn-xs" onClick={() => updateStatus(o.siparis_no, 'Onaylandı')}>Onayla</button>}
                            {o.durum === 'Onaylandı' && <button className="btn btn-info btn-xs" onClick={() => updateStatus(o.siparis_no, 'Yolda')}>Yolda</button>}
                            {o.durum === 'Yolda' && <button className="btn btn-success btn-xs" onClick={() => updateStatus(o.siparis_no, 'Teslim Edildi')}>Teslim</button>}</td>
                    </tr>)}</tbody>
                </table>
            </div>
            <Modal open={modal} onClose={() => setModal(false)} title="Yeni Sipariş" size="lg">
                <div className="modal-body">
                    <div className="form-group"><label className="form-label">Tedarikçi</label><select className="form-select" value={form.tedarikci_kodu} onChange={e => setForm({ ...form, tedarikci_kodu: e.target.value })}><option value="">Seçin...</option>{suppliers.map(s => <option key={s.kod} value={s.kod}>{s.ad}</option>)}</select></div>
                    <div className="form-row-3">
                        <div className="form-group"><label className="form-label">Malzeme</label><select className="form-select" value={item.malzeme_kodu} onChange={e => setItem({ ...item, malzeme_kodu: e.target.value })}><option value="">Seçin...</option>{materials.map(m => <option key={m.kod} value={m.kod}>{m.ad}</option>)}</select></div>
                        <div className="form-group"><label className="form-label">Miktar</label><input className="form-input" type="number" value={item.miktar} onChange={e => setItem({ ...item, miktar: +e.target.value })} /></div>
                        <div className="form-group"><label className="form-label">&nbsp;</label><button className="btn btn-secondary" onClick={addItem}>Ekle</button></div>
                    </div>
                    {form.kalemler.length > 0 && <table className="table" style={{ marginTop: 16 }}><thead><tr><th>Malzeme</th><th>Miktar</th><th>Tutar</th></tr></thead><tbody>{form.kalemler.map((k, i) => <tr key={i}><td>{k.malzeme_adi}</td><td>{k.miktar}</td><td>{(k.miktar * k.birim_fiyat).toLocaleString('tr-TR')} ₺</td></tr>)}</tbody></table>}
                </div>
                <div className="modal-footer"><span>Toplam: <strong>{form.kalemler.reduce((s, k) => s + k.miktar * k.birim_fiyat, 0).toLocaleString('tr-TR')} ₺</strong></span><button className="btn btn-secondary" onClick={() => setModal(false)}>İptal</button><button className="btn btn-primary" onClick={create}>Oluştur</button></div>
            </Modal>
        </div>
    )
}


// Analytics with Charts
const AnalyticsPage = () => {
    const [trends, setTrends] = useState({ labels: [], giris: [], cikis: [] })
    const [cats, setCats] = useState([])

    useEffect(() => {
        api.get('/analytics/trends').then(d => d && setTrends(d))
        api.get('/analytics/category').then(d => d && setCats(d))
    }, [])

    const trendData = { labels: trends.labels, datasets: [{ label: 'Giriş', data: trends.giris, borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.2)', fill: true }, { label: 'Çıkış', data: trends.cikis, borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.2)', fill: true }] }
    const catData = { labels: cats.map(c => c.kategori), datasets: [{ label: 'Miktar', data: cats.map(c => c.miktar), backgroundColor: '#6366f1' }] }

    return (
        <div className="grid-2">
            <div className="card"><div className="card-header"><h3 className="card-title">📈 Stok Trendi</h3></div><div style={{ height: 300 }}><Line data={trendData} options={chartOptions} /></div></div>
            <div className="card"><div className="card-header"><h3 className="card-title">📊 Kategori Dağılımı</h3></div><div style={{ height: 300 }}><Bar data={catData} options={chartOptions} /></div></div>
        </div>
    )
}

// Predictions
const PredictionsPage = () => {
    const [predictions, setPredictions] = useState([])
    useEffect(() => { api.get('/predictions').then(d => d && setPredictions(d)) }, [])

    return (
        <div className="card">
            <div className="card-header"><h3 className="card-title">🔮 Stok Tahminleri</h3></div>
            <div className="table-container">
                <table className="table">
                    <thead><tr><th>Malzeme</th><th>Mevcut</th><th>Günlük Tüketim</th><th>Tahmini Bitiş</th><th>Kalan Gün</th><th>Önerilen Sipariş</th><th>Öncelik</th></tr></thead>
                    <tbody>{predictions.map(p => <tr key={p.malzeme_kodu}><td><strong>{p.malzeme_adi}</strong></td><td>{p.mevcut_stok}</td><td>{p.gunluk_tuketim}</td><td>{p.tahmini_bitis}</td><td>{p.kalan_gun}</td><td>{p.onerilen_siparis}</td><td><span className={`badge priority-${p.oncelik?.toLowerCase()}`}>{p.oncelik}</span></td></tr>)}</tbody>
                </table>
            </div>
        </div>
    )
}

// Locations
const LocationsPage = () => {
    const [locations, setLocations] = useState([])
    const [modal, setModal] = useState(false)
    const [form, setForm] = useState({ kod: '', ad: '', adres: '', sorumlu: '', telefon: '', aktif: true })
    const load = () => api.get('/locations').then(d => d && setLocations(d))
    useEffect(() => { load() }, [])
    const save = async () => { await api.post('/locations', form); setModal(false); load() }
    const del = async (kod) => { if (confirm('Silmek?')) { await api.delete(`/locations/${kod}`); load() } }

    return (
        <div className="card">
            <div className="card-header"><h3 className="card-title">🏢 Lokasyonlar</h3><button className="btn btn-primary" onClick={() => setModal(true)}>+ Yeni</button></div>
            <div className="table-container">
                <table className="table">
                    <thead><tr><th>Kod</th><th>Ad</th><th>Adres</th><th>Sorumlu</th><th>Telefon</th><th>Durum</th><th>İşlem</th></tr></thead>
                    <tbody>{locations.map(l => <tr key={l.kod}><td><strong>{l.kod}</strong></td><td>{l.ad}</td><td>{l.adres}</td><td>{l.sorumlu}</td><td>{l.telefon}</td><td><span className={`badge ${l.aktif ? 'badge-success' : 'badge-muted'}`}>{l.aktif ? 'Aktif' : 'Pasif'}</span></td><td><button className="btn btn-danger btn-icon-sm" onClick={() => del(l.kod)}>🗑️</button></td></tr>)}</tbody>
                </table>
            </div>
            <Modal open={modal} onClose={() => setModal(false)} title="Yeni Lokasyon">
                <div className="modal-body">
                    <div className="form-row"><div className="form-group"><label className="form-label">Kod</label><input className="form-input" value={form.kod} onChange={e => setForm({ ...form, kod: e.target.value })} /></div><div className="form-group"><label className="form-label">Ad</label><input className="form-input" value={form.ad} onChange={e => setForm({ ...form, ad: e.target.value })} /></div></div>
                    <div className="form-row"><div className="form-group"><label className="form-label">Adres</label><input className="form-input" value={form.adres} onChange={e => setForm({ ...form, adres: e.target.value })} /></div><div className="form-group"><label className="form-label">Sorumlu</label><input className="form-input" value={form.sorumlu} onChange={e => setForm({ ...form, sorumlu: e.target.value })} /></div></div>
                    <div className="form-group"><label className="form-label">Telefon</label><input className="form-input" value={form.telefon} onChange={e => setForm({ ...form, telefon: e.target.value })} /></div>
                </div>
                <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setModal(false)}>İptal</button><button className="btn btn-primary" onClick={save}>Kaydet</button></div>
            </Modal>
        </div>
    )
}

// Audit Log
const AuditPage = () => {
    const [logs, setLogs] = useState([])
    useEffect(() => { api.get('/audit-logs?limit=100').then(d => d && setLogs(d)) }, [])

    return (
        <div className="card">
            <div className="card-header"><h3 className="card-title">📜 Audit Log</h3></div>
            <div className="table-container">
                <table className="table">
                    <thead><tr><th>Tarih</th><th>Kullanıcı</th><th>İşlem</th><th>Modül</th><th>Kayıt ID</th><th>Detay</th></tr></thead>
                    <tbody>{logs.map(l => <tr key={l.id}><td>{l.tarih}</td><td>{l.kullanici}</td><td><span className="badge badge-info">{l.islem}</span></td><td>{l.modul}</td><td>{l.kayit_id || '-'}</td><td style={{ maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.detay || '-'}</td></tr>)}</tbody>
                </table>
            </div>
        </div>
    )
}

// Reports
const ReportsPage = ({ toast }) => {
    const reports = [
        { icon: '📦', title: 'Envanter Raporu', type: 'materials', desc: 'Tüm malzemeler' },
        { icon: '📋', title: 'Hareket Raporu', type: 'movements', desc: 'Giriş/çıkış hareketleri' },
        { icon: '📝', title: 'Talep Raporu', type: 'requests', desc: 'Tüm talepler' },
        { icon: '🛒', title: 'Sipariş Raporu', type: 'orders', desc: 'Tüm siparişler' },
    ]
    return (
        <div className="grid-2">
            {reports.map((r, i) => <div key={i} className="report-card" onClick={() => exportExcel(r.type, toast)}><div className="report-icon">{r.icon}</div><h3 className="report-title">{r.title}</h3><p className="report-description">{r.desc}</p><button className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>📥 Excel İndir</button></div>)}
        </div>
    )
}

// Stock Count Page
const StockCountPage = ({ toast }) => {
    const [counts, setCounts] = useState([])
    const [materials, setMaterials] = useState([])
    const [modal, setModal] = useState(false)
    const [form, setForm] = useState({ lokasyon: '', planlanan_tarih: '', aciklama: '', malzeme_kodlari: [] })
    const [selectedMaterials, setSelectedMaterials] = useState([])

    const load = async () => {
        const [c, m] = await Promise.all([api.get('/stock-counts'), api.get('/materials')])
        if (c) setCounts(c)
        if (m) setMaterials(m)
    }
    useEffect(() => { load() }, [])

    const toggleMaterial = (kod) => {
        setSelectedMaterials(prev => prev.includes(kod) ? prev.filter(k => k !== kod) : [...prev, kod])
    }

    const create = async () => {
        const result = await api.post('/stock-counts', { ...form, malzeme_kodlari: selectedMaterials })
        if (result) {
            setModal(false)
            setForm({ lokasyon: '', planlanan_tarih: '', aciklama: '', malzeme_kodlari: [] })
            setSelectedMaterials([])
            load()
            toast('Sayım planlandı', 'success')
        }
    }

    const complete = async (sayim_no) => {
        const result = await api.put(`/stock-counts/${sayim_no}/complete?tamamlayan=Admin`)
        if (result) {
            load()
            toast('Sayım tamamlandı', 'success')
        }
    }

    const getStatusBadge = (durum) => {
        const colors = { 'Planlandı': 'badge-warning', 'Devam Ediyor': 'badge-info', 'Tamamlandı': 'badge-success' }
        return colors[durum] || 'badge-muted'
    }

    return (
        <div className="card">
            <div className="card-header">
                <h3 className="card-title">📋 Stok Sayımları</h3>
                <button className="btn btn-primary" onClick={() => setModal(true)}>+ Yeni Sayım</button>
            </div>

            {/* Aktif Sayımlar */}
            <div className="stock-count-grid">
                {counts.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📋</div>
                        <h3>Henüz sayım planlanmamış</h3>
                        <p>Yeni bir stok sayımı başlatmak için yukarıdaki butonu kullanın</p>
                    </div>
                ) : counts.map(c => (
                    <div key={c.sayim_no} className="stock-count-card">
                        <div className="stock-count-header">
                            <div>
                                <h4>{c.sayim_no}</h4>
                                <span className="stock-count-location">📍 {c.lokasyon || 'Tüm Lokasyonlar'}</span>
                            </div>
                            <span className={`badge ${getStatusBadge(c.durum)}`}>{c.durum}</span>
                        </div>
                        <div className="stock-count-details">
                            <div className="stock-count-detail">
                                <span>Planlanan Tarih</span>
                                <span>{c.planlanan_tarih}</span>
                            </div>
                            <div className="stock-count-detail">
                                <span>Malzeme Sayısı</span>
                                <span>{c.malzeme_sayisi || '-'}</span>
                            </div>
                            {c.tamamlayan && (
                                <div className="stock-count-detail">
                                    <span>Tamamlayan</span>
                                    <span>{c.tamamlayan}</span>
                                </div>
                            )}
                        </div>
                        {c.durum !== 'Tamamlandı' && (
                            <div className="stock-count-actions">
                                <button className="btn btn-success btn-sm" onClick={() => complete(c.sayim_no)}>✓ Tamamla</button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <Modal open={modal} onClose={() => setModal(false)} title="Yeni Stok Sayımı" size="lg">
                <div className="modal-body">
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Lokasyon</label>
                            <input className="form-input" value={form.lokasyon} onChange={e => setForm({ ...form, lokasyon: e.target.value })} placeholder="Tüm lokasyonlar için boş bırakın" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Planlanan Tarih</label>
                            <input className="form-input" type="date" value={form.planlanan_tarih} onChange={e => setForm({ ...form, planlanan_tarih: e.target.value })} />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Açıklama</label>
                        <textarea className="form-textarea" value={form.aciklama} onChange={e => setForm({ ...form, aciklama: e.target.value })} placeholder="Sayım açıklaması..." />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Sayılacak Malzemeler ({selectedMaterials.length} seçili)</label>
                        <div className="material-selection-grid">
                            {materials.slice(0, 20).map(m => (
                                <div key={m.kod} className={`material-select-item ${selectedMaterials.includes(m.kod) ? 'selected' : ''}`} onClick={() => toggleMaterial(m.kod)}>
                                    <span className="material-select-check">{selectedMaterials.includes(m.kod) ? '☑' : '☐'}</span>
                                    <div className="material-select-info">
                                        <span className="material-select-name">{m.ad}</span>
                                        <span className="material-select-stock">Stok: {m.mevcut_stok}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {selectedMaterials.length === 0 && <p className="hint-text">Boş bırakırsanız tüm malzemeler sayılacak</p>}
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={() => setModal(false)}>İptal</button>
                    <button className="btn btn-primary" onClick={create}>Sayım Planla</button>
                </div>
            </Modal>
        </div>
    )
}

// Main App
function App() {
    const [user, setUser] = useState(null)
    const [page, setPage] = useState('dashboard')
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({})
    const [materials, setMaterials] = useState([])
    const [movements, setMovements] = useState([])
    const [criticals, setCriticals] = useState([])
    const [requests, setRequests] = useState([])
    const [suppliers, setSuppliers] = useState([])
    const [orders, setOrders] = useState([])

    const { toasts, show } = useToast()

    const fetchData = async () => {
        setLoading(true)
        const [st, mat, mov, crit, req, sup, ord] = await Promise.all([
            api.get('/dashboard'), api.get('/materials'), api.get('/movements'), api.get('/materials/critical'),
            api.get('/requests'), api.get('/suppliers'), api.get('/orders')
        ])
        setStats(st || {}); setMaterials(mat || []); setMovements(mov || []); setCriticals(crit || [])
        setRequests(req || []); setSuppliers(sup || []); setOrders(ord || [])
        setLoading(false)
    }

    useEffect(() => { if (user) fetchData() }, [user, page])

    const login = (u) => { setUser(u) }
    const logout = () => { setUser(null) }
    const pendingReqs = requests.filter(r => r.durum === 'Beklemede').length

    if (!user) return <LoginPage onLogin={login} />

    const pageTitle = { dashboard: 'Dashboard', materials: 'Malzemeler', movements: 'Stok Hareketleri', requests: 'Talepler', orders: 'Siparişler', analytics: 'Analitik', predictions: 'Stok Tahminleri', locations: 'Lokasyonlar', stockcount: 'Stok Sayım', audit: 'Audit Log', reports: 'Raporlar' }

    return (
        <div className="app-layout">
            <Sidebar user={user} page={page} setPage={setPage} onLogout={logout} pendingRequests={pendingReqs} />
            <main className="main-content">
                <div className="top-bar"><div className="page-title-section"><h1>{pageTitle[page]}</h1><p>Hoş geldiniz, {user.ad_soyad}</p></div></div>
                {loading ? <div className="loading"><div className="spinner"></div></div> : <>
                    {page === 'dashboard' && <Dashboard stats={stats} criticals={criticals} movements={movements} requests={requests.filter(r => r.durum === 'Beklemede')} toast={show} />}
                    {page === 'materials' && <MaterialsPage materials={materials} refresh={fetchData} toast={show} />}
                    {page === 'movements' && <MovementsPage materials={materials} movements={movements} refresh={fetchData} toast={show} />}
                    {page === 'requests' && <RequestsPage materials={materials} requests={requests} user={user} refresh={fetchData} toast={show} />}
                    {page === 'orders' && <OrdersPage orders={orders} suppliers={suppliers} materials={materials} user={user} refresh={fetchData} toast={show} />}

                    {page === 'analytics' && <AnalyticsPage />}
                    {page === 'predictions' && <PredictionsPage />}
                    {page === 'locations' && <LocationsPage />}
                    {page === 'stockcount' && <StockCountPage toast={show} />}
                    {page === 'audit' && <AuditPage />}
                    {page === 'reports' && <ReportsPage toast={show} />}
                </>}
            </main>
            <div className="toast-container">{toasts.map(t => <div key={t.id} className={`toast ${t.type}`}><span className="toast-icon">{t.type === 'success' ? '✓' : '!'}</span><span>{t.msg}</span></div>)}</div>
        </div>
    )
}

export default App
