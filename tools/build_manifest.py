#!/usr/bin/env python3
"""Tạo manifest.json cho toàn bộ asset (chỉ dùng thư viện chuẩn, chạy được trong GitHub Actions).
Mỗi file: size, sha256, v (8 ký tự đầu sha256, dùng để chống cache: <url>?v=<v>), và w/h cho PNG.
Chạy:  python3 tools/build_manifest.py            (ghi manifest.json)
       python3 tools/build_manifest.py --check    (thoát mã 1 nếu manifest.json đang lỗi thời)"""
import hashlib, json, os, struct, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP_DIRS = {'.git', '.github', 'tools', 'node_modules'}
SKIP_FILES = {'manifest.json', 'README.md', '.gitignore', '.gitattributes'}
EXT = {'.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.mp3', '.ogg', '.wav', '.json', '.mp4', '.webm'}

def png_size(data):
    if data[:8] == b'\x89PNG\r\n\x1a\n' and data[12:16] == b'IHDR':
        return struct.unpack('>II', data[16:24])
    return None

def build():
    files = {}
    for d, dirs, names in os.walk(ROOT):
        dirs[:] = sorted(x for x in dirs if x not in SKIP_DIRS and not x.startswith('.'))
        for n in sorted(names):
            if n in SKIP_FILES or os.path.splitext(n)[1].lower() not in EXT:
                continue
            p = os.path.join(d, n)
            rel = os.path.relpath(p, ROOT).replace(os.sep, '/')
            data = open(p, 'rb').read()
            h = hashlib.sha256(data).hexdigest()
            e = {'size': len(data), 'sha256': h, 'v': h[:8]}
            wh = png_size(data)
            if wh:
                e['w'], e['h'] = wh
            files[rel] = e
    return {'schema': 1, 'count': len(files), 'files': files}

def dump(m):
    return json.dumps(m, ensure_ascii=False, indent=1, sort_keys=True) + '\n'

if __name__ == '__main__':
    out = dump(build())
    path = os.path.join(ROOT, 'manifest.json')
    if '--check' in sys.argv:
        cur = open(path, encoding='utf8').read() if os.path.exists(path) else ''
        sys.exit(0 if cur == out else 1)
    open(path, 'w', encoding='utf8', newline='\n').write(out)
    print('manifest.json:', json.loads(out)['count'], 'file')
