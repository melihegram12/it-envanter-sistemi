"""
Email Service for Inventory System
Handles sending notifications via SMTP
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Optional
import os

# Email configuration - can be set via environment variables
EMAIL_CONFIG = {
    "smtp_server": os.getenv("SMTP_SERVER", "smtp.gmail.com"),
    "smtp_port": int(os.getenv("SMTP_PORT", "587")),
    "sender_email": os.getenv("SENDER_EMAIL", ""),
    "sender_password": os.getenv("SENDER_PASSWORD", ""),
    "enabled": os.getenv("EMAIL_ENABLED", "false").lower() == "true"
}

class EmailService:
    def __init__(self):
        self.config = EMAIL_CONFIG
    
    def is_configured(self) -> bool:
        """Check if email is properly configured"""
        return bool(self.config["sender_email"] and self.config["sender_password"] and self.config["enabled"])
    
    def send_email(self, to_emails: List[str], subject: str, body: str, html: bool = True) -> bool:
        """Send email to recipients"""
        if not self.is_configured():
            print("Email not configured, skipping send")
            return False
        
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = self.config["sender_email"]
            msg["To"] = ", ".join(to_emails)
            
            if html:
                msg.attach(MIMEText(body, "html"))
            else:
                msg.attach(MIMEText(body, "plain"))
            
            with smtplib.SMTP(self.config["smtp_server"], self.config["smtp_port"]) as server:
                server.starttls()
                server.login(self.config["sender_email"], self.config["sender_password"])
                server.sendmail(self.config["sender_email"], to_emails, msg.as_string())
            
            return True
        except Exception as e:
            print(f"Email send failed: {e}")
            return False
    
    def send_critical_stock_alert(self, materials: List[dict], admin_emails: List[str]) -> bool:
        """Send critical stock level alert"""
        if not materials:
            return False
        
        subject = "⚠️ Kritik Stok Uyarısı - Envanter Sistemi"
        
        items_html = ""
        for m in materials:
            items_html += f"""
            <tr>
                <td style="padding: 12px; border-bottom: 1px solid #eee;">{m.get('kod', '')}</td>
                <td style="padding: 12px; border-bottom: 1px solid #eee;">{m.get('ad', '')}</td>
                <td style="padding: 12px; border-bottom: 1px solid #eee; color: #ef4444; font-weight: bold;">{m.get('mevcut_stok', 0)}</td>
                <td style="padding: 12px; border-bottom: 1px solid #eee;">{m.get('min_seviye', 0)}</td>
            </tr>
            """
        
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 20px; border-radius: 12px 12px 0 0;">
                <h1 style="color: white; margin: 0;">⚠️ Kritik Stok Uyarısı</h1>
            </div>
            <div style="background: #f9fafb; padding: 20px; border-radius: 0 0 12px 12px;">
                <p>Aşağıdaki malzemelerin stok seviyesi kritik seviyenin altına düşmüştür:</p>
                <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden;">
                    <thead>
                        <tr style="background: #f3f4f6;">
                            <th style="padding: 12px; text-align: left;">Kod</th>
                            <th style="padding: 12px; text-align: left;">Malzeme</th>
                            <th style="padding: 12px; text-align: left;">Mevcut Stok</th>
                            <th style="padding: 12px; text-align: left;">Min. Seviye</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items_html}
                    </tbody>
                </table>
                <p style="margin-top: 20px;">Lütfen gerekli tedbirleri alınız.</p>
                <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">Bu email otomatik olarak Envanter Yönetim Sistemi tarafından gönderilmiştir.</p>
            </div>
        </body>
        </html>
        """
        
        return self.send_email(admin_emails, subject, body)
    
    def send_order_status_notification(self, order: dict, status: str, to_email: str) -> bool:
        """Send order status change notification"""
        subject = f"📦 Sipariş Durumu Güncellendi - {order.get('siparis_no', '')}"
        
        status_colors = {
            "Onaylandı": "#10b981",
            "Yolda": "#3b82f6",
            "Teslim Edildi": "#22c55e",
            "İptal": "#ef4444"
        }
        
        color = status_colors.get(status, "#6b7280")
        
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 20px; border-radius: 12px 12px 0 0;">
                <h1 style="color: white; margin: 0;">📦 Sipariş Güncellemesi</h1>
            </div>
            <div style="background: #f9fafb; padding: 20px; border-radius: 0 0 12px 12px;">
                <p><strong>Sipariş No:</strong> {order.get('siparis_no', '')}</p>
                <p><strong>Tedarikçi:</strong> {order.get('tedarikci_adi', '')}</p>
                <p><strong>Yeni Durum:</strong> <span style="background: {color}; color: white; padding: 4px 12px; border-radius: 20px;">{status}</span></p>
                <p><strong>Toplam Tutar:</strong> {order.get('toplam_tutar', 0):,.2f} ₺</p>
                <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">Bu email otomatik olarak Envanter Yönetim Sistemi tarafından gönderilmiştir.</p>
            </div>
        </body>
        </html>
        """
        
        return self.send_email([to_email], subject, body)
    
    def send_request_notification(self, request: dict, action: str, to_email: str) -> bool:
        """Send request status notification"""
        action_text = {
            "created": "Yeni talep oluşturuldu",
            "approved": "Talep onaylandı",
            "rejected": "Talep reddedildi"
        }
        
        action_colors = {
            "created": "#3b82f6",
            "approved": "#10b981",
            "rejected": "#ef4444"
        }
        
        subject = f"📝 {action_text.get(action, 'Talep Güncellemesi')} - {request.get('talep_no', '')}"
        color = action_colors.get(action, "#6b7280")
        
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 20px; border-radius: 12px 12px 0 0;">
                <h1 style="color: white; margin: 0;">📝 Talep Bildirimi</h1>
            </div>
            <div style="background: #f9fafb; padding: 20px; border-radius: 0 0 12px 12px;">
                <p><strong>Durum:</strong> <span style="background: {color}; color: white; padding: 4px 12px; border-radius: 20px;">{action_text.get(action, action)}</span></p>
                <p><strong>Talep No:</strong> {request.get('talep_no', '')}</p>
                <p><strong>Malzeme:</strong> {request.get('malzeme_adi', '')}</p>
                <p><strong>Miktar:</strong> {request.get('miktar', 0)}</p>
                <p><strong>Talep Eden:</strong> {request.get('talep_eden', '')}</p>
                <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">Bu email otomatik olarak Envanter Yönetim Sistemi tarafından gönderilmiştir.</p>
            </div>
        </body>
        </html>
        """
        
        return self.send_email([to_email], subject, body)


# Singleton instance
email_service = EmailService()
