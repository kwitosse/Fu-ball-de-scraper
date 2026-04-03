#!/usr/bin/env python3
"""
Generate minimal PNG icons for the PWA.
Uses only Python stdlib - writes raw PNG bytes.
"""
import struct
import zlib
import os

def make_png(size: int, r: int, g: int, b: int) -> bytes:
    """Create a solid-color PNG of given size (pixels)."""
    def chunk(name: bytes, data: bytes) -> bytes:
        c = struct.pack('>I', len(data)) + name + data
        crc = zlib.crc32(name + data) & 0xFFFFFFFF
        return c + struct.pack('>I', crc)

    # IHDR
    ihdr_data = struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)
    ihdr = chunk(b'IHDR', ihdr_data)

    # Image data: for each row, filter byte (0) + RGB pixels
    row = bytes([0]) + bytes([r, g, b] * size)
    raw = row * size
    compressed = zlib.compress(raw)
    idat = chunk(b'IDAT', compressed)

    iend = chunk(b'IEND', b'')

    signature = b'\x89PNG\r\n\x1a\n'
    return signature + ihdr + idat + iend

def main():
    # Dark blue background matching theme
    r, g, b = 0x0f, 0x34, 0x60  # --surface2 color

    script_dir = os.path.dirname(os.path.abspath(__file__))
    public_dir = os.path.join(script_dir, 'public')
    os.makedirs(public_dir, exist_ok=True)

    for size, name in [(192, 'icon-192.png'), (512, 'icon-512.png')]:
        path = os.path.join(public_dir, name)
        png_bytes = make_png(size, r, g, b)
        with open(path, 'wb') as f:
            f.write(png_bytes)
        print(f"Created {path} ({size}x{size}px, {len(png_bytes)} bytes)")

if __name__ == '__main__':
    main()
