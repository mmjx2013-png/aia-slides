import {ReportGenerator} from '/tmp/lh/node_modules/lighthouse/report/generator/report-generator.js';
import fs from 'fs';
const E = process.argv[2];
for (const n of ['old-mobile','old-desktop','new-mobile','new-desktop']) {
  const lhr = JSON.parse(fs.readFileSync(`${E}/raw/${n}.json`,'utf8'));
  fs.writeFileSync(`${E}/reports/${n}.html`, ReportGenerator.generateReportHtml(lhr));
  const c = lhr.categories;
  console.log(n, lhr.lighthouseVersion, lhr.fetchTime, lhr.finalDisplayedUrl, Object.values(c).map(x=>x.id+':'+Math.round(x.score*100)).join(' '),
   'LCP', lhr.audits['largest-contentful-paint'].displayValue, 'weight', lhr.audits['total-byte-weight'].displayValue, 'net', lhr.configSettings.throttlingMethod, lhr.configSettings.formFactor, lhr.environment?.hostUserAgent?.slice(0,80));
}
