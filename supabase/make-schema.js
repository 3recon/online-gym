// schema.template.sql + public/shared.js(닉네임 단어·응원 문구·운동 목록) → schema.sql
// 닉네임 단어나 응원 문구를 바꾸면 `node supabase/make-schema.js` 다시 실행 후 Supabase에서 schema.sql 다시 Run
const fs = require('fs');
const path = require('path');
const { ADJ, NOUN, SHOUTS, EXERCISES } = require('../public/shared.js');

const sqlList = (arr) => arr.map((s) => `'${String(s).replace(/'/g, "''")}'`).join(', ');
const tpl = fs.readFileSync(path.join(__dirname, 'schema.template.sql'), 'utf8');
const out = tpl
  .replace('{{ADJ}}', sqlList(ADJ))
  .replace('{{NOUN}}', sqlList(NOUN))
  .replace('{{SHOUTS}}', sqlList(SHOUTS))
  .split('{{EXERCISES}}').join(sqlList(EXERCISES))
  .replace('(이 파일은 make-schema.js로 만든 것. 직접 고치지 말고 템플릿을 고칠 것)', '(make-schema.js로 만든 파일. 고칠 땐 schema.template.sql을 고치고 다시 만들 것)');

fs.writeFileSync(path.join(__dirname, 'schema.sql'), out);
console.log('schema.sql 생성 완료');
