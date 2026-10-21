const fs = require('fs');
let data = fs.readFileSync('data_only.sql', 'utf8');
const start = data.indexOf('COPY public."SequelizeMeta"');
if (start !== -1) {
  const end = data.indexOf('\\.', start);
  if (end !== -1) {
    data = data.substring(0, start) + data.substring(end + 2);
    fs.writeFileSync('data_only.sql', data.trim() + '\n');
  }
}
