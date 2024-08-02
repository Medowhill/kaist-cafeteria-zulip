const request = require("request");
const cheerio = require("cheerio");
const zulipInit = require("zulip-js");
const OpenAI = require("openai");

const config = { zuliprc: ".zuliprc" };
const openai = new OpenAI();
const useGpt = process.env.GPT !== undefined;

const system = `You are a helpful assistant. When I give you a string describing menus, you should extract the name of the meal course and its menus. Discard anything that is not menu names, e.g., prices. If a meal course does not have any name, the course name should be "" (empty string). Your response should be a valid JSON array containing zero or more JSON objects, each containing a string field "course", and a string array field "menus".`;
const user1 = `<한식코너 3,000원>
쌀밥
건새우미역국(9)
미트볼케찹조림(6,10,12,15)
콩나물무침
양반김
배추김치(9,13)
누룽지
<아메리칸 3,000원>
에그포테이토샌드위치(1,2,6)
옥수수스프(2,6)
치킨너겟(6,15)
요쿠르트(2)
그린샐러드`;
const assistant1 = `[
  {
    "course": "한식코너",
    "menu": [
      "쌀밥",
      "건새우미역국",
      "미트볼케찹조림",
      "콩나물무침",
      "양반김",
      "배추김치",
      "누룽지"
    ]
  },
  {
    "course": "아메리칸",
    "menu": [
      "에그포테이토샌드위치",
      "옥수수스프",
      "치킨너겟",
      "요쿠르트",
      "그린샐러드"
    ]
  }
]`;
const user2 = `<Cafeteria>
흑미밥          800원
오곡밥          1,000원
시금치된장국            600원
(할랄)허니머스타드치킨  (1,6,15)          2,500원
돈육간장불고기  (10)    1,800원
돈육간장불고기(소)      (10)    900원
(비건)연두부    (5)     700원
배추김치        (9,13)  400원
양반김          400원
(비건)리코타치즈샐러드  (2,12,13)       1,600원
컵과일  (11)    700원
3구세트         1,200원
<일품코너 1,  4,500원>
마파두부덮밥    (5,10,19)
시금치된장국
어니언돈육간장강정      (6,10,15)
<Self-Bar>
그린샐러드/단무지/배추김치 (9,13)`;
const assistant2 = `[
  {
    "course": "Cafeteria",
    "menu": [
      "흑미밥",
      "오곡밥",
      "시금치된장국",
      "허니머스타드치킨",
      "돈육간장불고기",
      "연두부",
      "배추김치",
      "양반김",
      "리코타치즈샐러드",
      "컵과일",
      "3구세트"
    ]
  },
  {
    "course": "일품코너 1",
    "menu": [
      "마파두부덮밥",
      "시금치된장국",
      "어니언돈육간장강정",
      "그린샐러드",
      "단무지",
      "배추김치"
    ]
  }
]`;
const user3 = `<한식코너  4,500원>
쌀밥
김칫국  (5,9,13)
(할랄)닭살야채볶음      (15)
목이버섯들깨무침
치커리겉절이
<Self-Bar>
그린샐러드/열무김치

<일품코너  4,500원>
유부김치가락국수        (5,6,9,13)
맛초킹만두강정  (6,10,15,19)
<Self-Bar>
그린샐러드/깍두기 (9)`;
const assistant3 = `[
  {
    "course": "한식코너",
    "menu": [
      "쌀밥",
      "김칫국",
      "닭살야채볶음",
      "목이버섯들깨무침",
      "치커리겉절이",
      "그린샐러드",
      "열무김치"
    ]
  },
  {
    "course": "일품코너",
    "menu": [
      "유부김치가락국수",
      "맛초킹만두강정",
      "그린샐러드",
      "깍두기"
    ]
  }
]`;
const user4 = `백미밥
경상도식소고기국5.6.16
두부조림5.6
버섯야채볶음5.6
도시락김
김치9
딸기우유
누룽지
★천원의 아침밥★
  - 식사시 학생증 및 모바일 학생증 소지 부탁 드립니다.`;
const assistant4 = `[
  {
    "course": "",
    "menu": [
      "백미밥",
      "경상도식소고기국",
      "두부조림",
      "버섯야채볶음",
      "도시락김",
      "김치",
      "딸기우유",
      "누룽지"
    ]
  }
]`;
const user5 = `자율배식 (5,000)
목살필라프(10,18)
근대된장국(5,6)
생선까스&소스(5,6)
단무지(13)
청경채겉절이
맛김치(9,13)
그린샐러드&드레싱(1,5,6,13)
1042kcal`;
const assistant5 = `[
  {
    "course": "자율배식",
    "menu": [
      "목살필라프",
      "근대된장국",
      "생선까스&소스",
      "단무지",
      "청경채겉절이",
      "맛김치",
      "그린샐러드&드레싱"
    ]
  }
]`;

async function normalizeWithGPT(text) {
  const completion = await openai.chat.completions.create({
    messages: [
      { role: "system", content: system },
      { role: "user", content: user1 },
      { role: "assistant", content: assistant1 },
      { role: "user", content: user2 },
      { role: "assistant", content: assistant2 },
      { role: "user", content: user3 },
      { role: "assistant", content: assistant3 },
      { role: "user", content: user4 },
      { role: "assistant", content: assistant4 },
      { role: "user", content: user5 },
      { role: "assistant", content: assistant5 },
      { role: "user", content: text },
    ],
    model: "gpt-4o-mini",
    temperature: 0,
  });
  const arr = JSON.parse(completion.choices[0].message.content);
  return arr.map(obj => {
    const course = obj.course === "" ? "" : `**${obj.course}** `;
    return `${course}${obj.menu.join(", ")}`;
  }).join("\n");
}

async function normalizeWithoutGPT(text) {
  return text
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

async function normalize(text) {
  if (text.length === 0)
    return "";
  else if (useGpt)
    return await normalizeWithGPT(text);
  else
    return await normalizeWithoutGPT(text);
}

function today() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split("T")[0];
}

function requestPromise(url) {
  return new Promise((resolve, reject) => {
    request(url, (err, res, body) => {
      if (err || res.statusCode !== 200)
        reject();
      else
        resolve(body);
    });
  });
}

async function getMenus(name, date) {
  const url = `https://www.kaist.ac.kr/kr/html/campus/053001.html?dvs_cd=${name}&stt_dt=${date}`;
  try {
    const body = await requestPromise(url);
    const $ = cheerio.load(body);
    const tds = $('td');
    function get(i) { return tds.eq(i).text().trim(); }
    const breakfastString = get(0);
    const lunchString = get(1);
    const dinnerString = get(2);
    const breakfast = await normalize(breakfastString);
    const lunch = await normalize(lunchString);
    const dinner = await normalize(dinnerString);
    const arr = [];
    if (breakfast !== "")
      arr.push(`#### 아침\n${breakfast}`);
    if (lunch !== "")
      arr.push(`#### 점심\n${lunch}`);
    if (dinner !== "")
      arr.push(`#### 저녁\n${dinner}`);
    return arr.length === 0 ? "" : arr.join("\n");
  } catch (e) {
    return "";
  }
}

async function send(client, name, code) {
  const to = "대화";
  // const to = "홍재민";
  const type = "stream";
  const topic = "학식";
  const menu = await getMenus(code, today());
  if (menu != "") {
    const content = `### ${name}\n${menu}`
    const params = { to, type, topic, content };
    return await client.messages.send(params);
  }
  return "";
}

async function main() {
  const client = await zulipInit(config);
  console.log(await send(client, "동맛골", "east1"));
  console.log(await send(client, "동측교직원", "east2"));
  console.log(await send(client, "서맛골", "west"));
  console.log(await send(client, "카이마루", "fclt"));
  console.log(await send(client, "교수회관", "emp"));
}

main();
