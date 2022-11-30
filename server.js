const request = require("request");
const cheerio = require("cheerio");
const zulipInit = require("zulip-js");

const config = { zuliprc: ".zuliprc" };

function today() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split("T")[0];
}

function getMenus(name, date) {
  return new Promise((resolve, reject) => {
    const url = `https://www.kaist.ac.kr/kr/html/campus/053001.html?dvs_cd=${name}&stt_dt=${date}`;
    request(url, (err, res, body) => {
      if (err || res.statusCode !== 200) {
        resolve("");
        return;
      }
      const $ = cheerio.load(body);
      const tds = $('td');
      function get(i) {
        return tds
          .eq(i)
          .text()
          .replace(/[1-9],[0-9][0-9][0-9]원/g, '')
          .replace(/[1-9],[0-9][0-9][0-9]/g, '')
          .replace(/[0-9][0-9][0-9]원/g, '')
          .replace(/[0-9][0-9][0-9]/g, '')
          .replace(/\(([0-9]+,)*[0-9]+\)/g, '')
          .split(/\s/)
          .filter(s => s.length)
          .join(' ');
      }
      const breakfast = get(0);
      const lunch = get(1);
      const dinner = get(2);
      resolve(`### 아침\n${breakfast}\n### 점심\n${lunch}\n### 저녁\n${dinner}`);
    });
  });
}

(async () => {
  const client = await zulipInit(config);

  const date = today();
  const east = await getMenus("east1", date);
  const west = await getMenus("west", date);

  const to = "대화";
  const type = "stream";
  const topic = "학식";
  const content = `# 동맛골\n${east}\n# 서맛골\n${west}`;
  const params = { to, type, topic, content };
  console.log(await client.messages.send(params));
})();
