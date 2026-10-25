// Set SHEET_ID and INTAKE_SECRET in Script Properties.
// The receiver writes only to this configured private spreadsheet.
function doPost(e) {
  var reply = function (value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); };
  var lock = LockService.getScriptLock();
  try {
    var p = JSON.parse(e.postData.contents);
    var secret = PropertiesService.getScriptProperties().getProperty('INTAKE_SECRET');
    if (!secret || p.token !== secret || !/^[a-f0-9-]{36}$/i.test(p.requestId || '') || !['en', 'zh'].includes(p.locale) || p.website) return reply({ ok: false });
    if (p.type !== 'prototype') return reply({ ok: false });
    if (!p.name || !p.purpose || !p.audience || !p.contact || !['idea', 'prototype', 'ready'].includes(p.stage) || !['email', 'wechat'].includes(p.contactType)) return reply({ ok: false });
    if (!lock.tryLock(10000)) return reply({ ok: false });
    var sheet = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SHEET_ID')).getSheetByName('Prototype submissions');
    if (!sheet) return reply({ ok: false });
    var headers = ['Submitted at', 'Product name', 'What it does', 'Audience and problem', 'Stage', 'Contact method', 'Contact', 'Product link', 'Language', 'Request ID'];
    if (JSON.stringify(sheet.getRange(1, 1, 1, headers.length).getValues()[0]) !== JSON.stringify(headers)) return reply({ ok: false });
    var rows = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues() : [];
    if (rows.some(function (row) { return row[headers.length - 1] === p.requestId; })) return reply({ ok: true, requestId: p.requestId });
    var text = function (value) { var s = String(value || ''); return /^[=+\-@\t\r]/.test(s) ? "'" + s : s; };
    var row = [new Date(), text(p.name), text(p.purpose), text(p.audience), p.stage, p.contactType, text(p.contact), text(p.link), p.locale, p.requestId];
    sheet.appendRow(row);
    SpreadsheetApp.flush();
    return reply({ ok: true, requestId: p.requestId });
  } catch (error) { return reply({ ok: false }); }
  finally { if (lock.hasLock()) lock.releaseLock(); }
}
