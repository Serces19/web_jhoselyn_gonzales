"""
Genera el QR para las tarjetas de presentación de Jhoselyn González.

Uso:
    uv run generate_qr.py

Output:
    qr_tarjeta.png  — PNG listo para entregar a imprenta (300 DPI, fondo blanco)
"""

import sys

# Instalar dependencias si no están
try:
    import qrcode
    from qrcode.image.styledpil import StyledPilImage
    from qrcode.image.styles.moduledrawers import RoundedModuleDrawer
    from PIL import Image
except ImportError:
    print("Instalando dependencias...")
    import subprocess
    subprocess.run([sys.executable, "-m", "pip", "install", "qrcode[pil]", "pillow"], check=True)
    import qrcode
    from qrcode.image.styledpil import StyledPilImage
    from qrcode.image.styles.moduledrawers import RoundedModuleDrawer
    from PIL import Image

# ============================================================
# CONFIGURACIÓN — Solo cambia QR_URL si cambias el endpoint
# ============================================================
QR_URL    = "https://main.d2caobufsyec5z.amplifyapp.com/go"
OUTPUT    = "qr_tarjeta.png"
QR_COLOR  = "#1a1a2e"   # Color oscuro para los módulos (ajusta al branding)
BG_COLOR  = "#ffffff"   # Fondo blanco
BOX_SIZE  = 12          # Tamaño de cada módulo en px
BORDER    = 4           # Quiet zone (mínimo recomendado: 4)
# ============================================================

def generate():
    qr = qrcode.QRCode(
        version=None,          # Auto-tamaño
        error_correction=qrcode.constants.ERROR_CORRECT_H,  # 30% redundancia
        box_size=BOX_SIZE,
        border=BORDER,
    )
    qr.add_data(QR_URL)
    qr.make(fit=True)

    img = qr.make_image(
        image_factory=StyledPilImage,
        module_drawer=RoundedModuleDrawer(),
        back_color=BG_COLOR,
        fill_color=QR_COLOR,
    )

    img.save(OUTPUT, dpi=(300, 300))
    print(f"[OK] QR generado: {OUTPUT}")
    print(f"   URL: {QR_URL}")
    print(f"   Tamano: {img.size[0]}x{img.size[1]} px @ 300 DPI")
    print()
    print("[!] Para imprenta: usar minimo 2x2 cm en la tarjeta.")
    print("[!] Para cambiar destino: editar amplify.yml -> target bajo /go")

if __name__ == "__main__":
    generate()
