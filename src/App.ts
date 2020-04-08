import { Support } from './typings'
import {
  LINE_ENDPOINT_MULTICAST,
  LINE_ENDPOINT_REPLY,
  SUPPORT_DETAIL_URL,
  SUPPORT_API_URL
} from './constants'
// Checking whether git and clasp are working correctly

const CHANNEL_ACCESS_TOKEN = PropertiesService.getScriptProperties().getProperty("CHANNEL_ACCESS_TOKEN");

// support data
const res = UrlFetchApp.fetch(SUPPORT_API_URL);
const supports: Support[] = JSON.parse(res.getContentText());
// user data
const SHEET2_ID = PropertiesService.getScriptProperties().getProperty("SHEET2_ID");
const SHEET2_NAME = 'users';
const SHEET2 = SpreadsheetApp.openById(SHEET2_ID).getSheetByName(SHEET2_NAME);
const SHEET2_DATA = SHEET2.getDataRange().getValues();

let sheet2DataArray = [];
for (let i = 0; i < SHEET2_DATA.length; i++) {
  sheet2DataArray.push(SHEET2_DATA[i][0]);
}

const SHEET2_DATA_ARRAY = sheet2DataArray;

function doPost(e) {
  let currentEvent = JSON.parse(e.postData.contents).events[0];
  switch (currentEvent.type) {
    case "follow":
      follow(currentEvent);
    case "unfollow":
      unfollow(currentEvent);
    case "message":
      let replyToken = currentEvent.replyToken;
      let postMessage = currentEvent.message.text;
      switch (postMessage) {
        case "VS COVID-19って？":
          replyAboutVSCovid19(replyToken);
          break;
        case "支援を検索したい":
          replyAboutHowToUseSearch(replyToken);
          break;
        case "感想や意見を送りたい":
          replyFormUrl(replyToken);
          break;
        default:
          replyMessages(replyToken, postMessage);
          break;
      }
    default:
      break;
  }
}

function follow(e) {
  SHEET2.appendRow([e.source.userId]);
}

function unfollow(e){
  let rows = [];
  for (let i = 0; i < SHEET2_DATA.length; i++) {
    if (SHEET2_DATA[i][0] == e.source.userId) {
      rows.unshift(i + 1);
    }
  }
  if (rows == []) {
    return;
  } else {
    for (let c = 0; c < rows.length; c++) {
      SHEET2.deleteRow(rows[c]);
    }
  }
}

function replyAboutVSCovid19(replyToken) {
  let messages = [`VS COVID-19は、新型コロナウイルス感染症に対応した支援をまとめたサイトです。政府から公表されたデータを使用しています。詳しくはこちら↓`,`●VS COVID-19`,`${SUPPORT_DETAIL_URL}`,`●政府のプレスリリース`,`https://www.soumu.go.jp/menu_news/s-news/01ryutsu02_02000267.html`];
  fetchLineEndpointReply(replyToken, messages);
}

function replyAboutHowToUseSearch(replyToken) {
  let messages = [`検索したい単語を送信してみてください`,`例えば…`,`教育`,`テレワーク`,`こんな感じ！`];
  fetchLineEndpointReply(replyToken, messages);
}

function replyFormUrl(replyToken) {
  const messages = [`以下のURLからご感想・ご意見をお寄せください！開発の参考にさせていただきます！`,`https://forms.gle/GffWz4bJwDPHaGMTA`];
  fetchLineEndpointReply(replyToken, messages);
}

function replyMessages(replyToken, postMessage) {
  const results = searchSupports(postMessage);
  const resultsCount = results.length;
  const messages = [`${resultsCount}件がヒットしました`];
  addMessages(results, resultsCount, messages);
  if (resultsCount > 3) {
    messages.push(`続きはこちらから！\n${SUPPORT_DETAIL_URL}` + "#" + `${postMessage}`);
  }
  fetchLineEndpointReply(replyToken, messages);
}

function fetchLineEndpointReply(replyToken, messages) {
  const replyMessages = messages.map(m => ({'type': 'text', 'text': m}));
  UrlFetchApp.fetch(LINE_ENDPOINT_REPLY, {
    'method': 'post',
    'headers': {
      'Content-Type': 'application/json; charset=UTF-8',
      'Authorization': 'Bearer ' + CHANNEL_ACCESS_TOKEN,
    },
    'payload': JSON.stringify({
      'replyToken': replyToken,
      'messages': replyMessages
    })
  });
}

function addMessages(results, resultsCount, messages) {
  const limit = resultsCount > 2 ? 3 : resultsCount;
  switch (resultsCount) {
    case 0:
      break;
    case 1:
    case 2:
    default:
      formatMessages(results, messages, limit);
      break;
  }
}

function formatMessages(results, messages, limit) {
  for (let i = 0; i < limit; i++) {
    let message = `【${results[i]["サービス名称"]}】` + `\n` + `${results[i]["URL"]}` + `\n\n●提供：` + `${results[i]["企業等"]}` + `\n●費用：` + `${results[i]["無料/有料"]}` + `\n●提供期間：` + `${results[i]["開始日"]}〜${results[i]["終了日"]} ${results[i]["期間備考"]}` + `\n●詳細：\n` + `${results[i]["詳細"]}` + `\n●情報元：` + `${results[i]["情報源"]}` + `\n●発表：` + `(${results[i]["発表日付"]})`;
    messages.push(message);
  }
}

function searchSupports(word: string): Support[] {
  const filteredByWordSupports = supports.filter(
    support =>
      support['サービス名称'].includes(word) ||
      support['詳細'].includes(word) ||
      support['企業等'].includes(word),
  );
  return filteredByWordSupports
}


function multicast() {
  let results = supports;
  let resultsCount = results.length;
  if (resultsCount !== 0) {
    let messages = [`昨日と今日は${resultsCount}件の新着情報がありました`];
    addMessages(results, resultsCount, messages);
    if (resultsCount > 3) {
      messages.push(`続きはこちらから！\n${SUPPORT_DETAIL_URL}`);
    }
    fetchLineEndpointMulticast(messages)
  }
}

function fetchLineEndpointMulticast(messages) {
  const multicastMessages = messages.map(m => ({'type': 'text', 'text': m}));
  UrlFetchApp.fetch(LINE_ENDPOINT_MULTICAST, {
    'method': 'post',
    'headers': {
      'Content-Type': 'application/json; charset=UTF-8',
      'Authorization': 'Bearer ' + CHANNEL_ACCESS_TOKEN,
    },
    'payload': JSON.stringify({
      "to": SHEET2_DATA_ARRAY,
      "messages": multicastMessages
    })
  })
}