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
          .replace(/([0-9]+,)*[0-9]+/g, '')
          .replace(/\(/g, '')
          .replace(/\)/g, '')
          .replace(/Kcal/g, '')
          .replace(/kcal/g, '')
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

async function send(client, name, code) {
  const to = "대화";
  // const to = "홍재민";
  const type = "stream";
  const topic = "학식";
  const menu = await getMenus(code, today());
  const content = `# ${name}\n${menu}`
  const params = { to, type, topic, content };
  return await client.messages.send(params);
}

(async () => {
  const client = await zulipInit(config);
  console.log(await send(client, "동맛골", "east1"));
  console.log(await send(client, "서맛골", "west"));
  console.log(await send(client, "카이마루", "fclt"));
  console.log(await send(client, "교수회관", "emp"));
})();
