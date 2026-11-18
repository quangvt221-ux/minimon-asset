# minimon-asset

Kho asset của game **Minimon**. **GitHub là bản chính**, Google Drive là bản sao.

## Cấu trúc
| Thư mục | Nội dung |
|---|---|
| `Field/` | Ảnh nền sân đấu |
| `Icon/` | Atlas icon |
| `Item/` | Icon vật phẩm, chỉ số |
| `VFX/` | Sprite sheet hiệu ứng (kỹ năng, trạng thái, hệ) |
| `manifest.json` | Danh sách file: `size`, `sha256`, `v` (8 ký tự đầu sha), `w`/`h` (PNG). **Tự sinh, không sửa tay.** |
| `tools/build_manifest.py` | Script sinh manifest (chỉ dùng Python chuẩn) |
| `drive/AssetSync.gs` | Apps Script đồng bộ GitHub → Drive |
| `.github/workflows/manifest.yml` | Mỗi lần push, tự cập nhật `manifest.json` |

## Quy trình đổi asset
1. Thêm / thay file trong đúng thư mục, commit lên `main`.
2. GitHub Actions tự cập nhật `manifest.json` (hoặc chạy tay `python3 tools/build_manifest.py`).
3. Apps Script `syncAssets()` chạy mỗi 30 phút, chép file mới/đổi sang Drive (giữ nguyên ID file khi ghi đè).
4. **Không sửa asset trực tiếp trên Drive**: lần đồng bộ sau sẽ ghi đè.

## Dùng trong game
- URL gốc: `https://raw.githubusercontent.com/quangvt221-ux/minimon-asset/main/<đường dẫn>?v=<v trong manifest>`
- Hoặc CDN: `https://cdn.jsdelivr.net/gh/quangvt221-ux/minimon-asset@main/<đường dẫn>` (cache lâu, nên dùng tag/commit khi phát hành).
- Tham số `?v=` lấy từ `manifest.json` để trình duyệt tải lại khi file đổi.
- Dự phòng: nếu GitHub lỗi thì dùng link Drive (ID file lấy từ `assetDriveIds()`).

## Quy ước tên
Không dấu, không khoảng trắng; vật phẩm theo ID (`IT001.png`), sheet hiệu ứng theo mã (`F105_status2.png`).
File `Field/Gemini_Generated_Image_taij5htaij5htaij.png` nên đổi tên mô tả (ví dụ `Field/<TenSan>.png`) và cập nhật chỗ đang dùng.
