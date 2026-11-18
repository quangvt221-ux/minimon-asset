/* =====================================================================
 *  ĐỒNG BỘ ASSET:  GitHub (bản chính)  ->  Google Drive (bản sao)
 *  - Đọc manifest.json trên GitHub, so sha256 với lần đồng bộ trước (lưu trong Script Properties).
 *  - Chỉ tải file mới/đổi; tạo thư mục con trên Drive theo đúng đường dẫn; file bị xóa trên GitHub -> chuyển vào thùng rác Drive.
 *  - Một chiều: sửa trên Drive sẽ bị ghi đè ở lần đồng bộ sau. Muốn đổi asset: commit lên GitHub.
 *  Cách dùng: dán file này vào Apps Script, điền DRIVE_FOLDER_ID, chạy syncAssets() một lần (cấp quyền),
 *  rồi chạy installTrigger() để tự đồng bộ mỗi 30 phút.  Xem kết quả: View > Logs.
 * ===================================================================== */
var AS_REPO = 'quangvt221-ux/minimon-asset';
var AS_BRANCH = 'main';
var AS_DRIVE_FOLDER_ID = '';          // <-- ID thư mục gốc trên Drive chứa asset (phần cuối của URL thư mục)
var AS_MAX_PER_RUN = 25;               // số file tải tối đa mỗi lần chạy (tránh quá giờ 6 phút); lần sau chạy tiếp
var AS_PROP = 'ASSET_SYNC_STATE';

function asRaw_(path) { return 'https://raw.githubusercontent.com/' + AS_REPO + '/' + AS_BRANCH + '/' + path.split('/').map(encodeURIComponent).join('/'); }

function syncAssets() {
  if (!AS_DRIVE_FOLDER_ID) throw new Error('Chưa điền AS_DRIVE_FOLDER_ID.');
  var res = UrlFetchApp.fetch(asRaw_('manifest.json') + '?t=' + Date.now(), { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('Không đọc được manifest.json (HTTP ' + res.getResponseCode() + ').');
  var man = JSON.parse(res.getContentText()).files, root = DriveApp.getFolderById(AS_DRIVE_FOLDER_ID);
  var props = PropertiesService.getScriptProperties(), state = JSON.parse(props.getProperty(AS_PROP) || '{}');   // {path: {sha, id}}
  var todo = Object.keys(man).filter(function (p) { return !state[p] || state[p].sha !== man[p].sha256; }), n = 0, fail = 0;
  for (var i = 0; i < todo.length && n < AS_MAX_PER_RUN; i++) {
    var p = todo[i], r = UrlFetchApp.fetch(asRaw_(p), { muteHttpExceptions: true });
    if (r.getResponseCode() !== 200) { fail++; Logger.log('LỖI ' + r.getResponseCode() + ': ' + p); continue; }
    var sha = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, r.getContent()).map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
    if (sha !== man[p].sha256) { fail++; Logger.log('SHA không khớp (manifest cũ?): ' + p); continue; }
    var parts = p.split('/'), name = parts.pop(), dir = root;
    parts.forEach(function (d) { var it = dir.getFoldersByName(d); dir = it.hasNext() ? it.next() : dir.createFolder(d); });
    var blob = r.getBlob().setName(name), old = state[p] && state[p].id, file = null;
    if (old) { try { file = DriveApp.getFileById(old); } catch (e) { file = null; } }
    if (!file) { var ex = dir.getFilesByName(name); if (ex.hasNext()) file = ex.next(); }
    if (file) { Drive.Files.update({ title: name }, file.getId(), blob); }       // cần bật Advanced Service "Drive API" để GIỮ NGUYÊN ID file
    else file = dir.createFile(blob);
    state[p] = { sha: sha, id: file.getId() }; n++;
    props.setProperty(AS_PROP, JSON.stringify(state));
  }
  Object.keys(state).forEach(function (p) {          // file đã bị xóa trên GitHub
    if (man[p]) return;
    try { DriveApp.getFileById(state[p].id).setTrashed(true); } catch (e) {}
    delete state[p];
  });
  props.setProperty(AS_PROP, JSON.stringify(state));
  Logger.log('Đồng bộ: ' + n + ' file, lỗi ' + fail + ', còn chờ ' + Math.max(0, todo.length - n - fail));
}
function installTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'syncAssets') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('syncAssets').timeBased().everyMinutes(30).create();
}
/** Danh sách {path -> id Drive} để dán vào Sheet nếu cần. */
function assetDriveIds() { return JSON.parse(PropertiesService.getScriptProperties().getProperty(AS_PROP) || '{}'); }
