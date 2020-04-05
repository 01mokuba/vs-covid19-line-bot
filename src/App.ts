import { Support } from './typings'
// Checking whether git and clasp are working correctly
const COVID_19 = 'https://vscovid19.code4japan.org/';

const CHANNEL_ACCESS_TOKEN = PropertiesService.getScriptProperties().getProperty("CHANNEL_ACCESS_TOKEN");
const LINE_ENDPOINT_REPLY = 'https://api.line.me/v2/bot/message/reply';
const LINE_ENDPOINT_MULTICAST = 'https://api.line.me/v2/bot/message/multicast';
const API_URL = "https://app.sabae.cc/api/googlespreadsheet.json?key=2PACX-1vSFMNp5HcRNOF5MrAujEUWR1dIoX2mncMEWTbPlVAaJqKWiq831-6gnCyI7n_G8YfPqNQXrfwyVjyHL&fbclid=IwAR1COPWKIjz5rH-nHD4Raned5-_tIxRCcDpFIfTplxqkGbjkh5ifKjOopOI"

// support data
const res = UrlFetchApp.fetch(API_URL);
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
  let messages = [`VS COVID-19は、新型コロナウイルス感染症に対応した支援をまとめたサイトです。政府から公表されたデータを使用しています。詳しくはこちら↓`,`●VS COVID-19`,`${COVID_19}`,`●政府のプレスリリース`,`https://www.soumu.go.jp/menu_news/s-news/01ryutsu02_02000267.html`];
  fetchLineEndpointReply(replyToken, messages);
}

function replyAboutHowToUseSearch(replyToken) {
  let messages = [`検索したい単語を送信してみてください`,`例えば…`,`教育`,`テレワーク`,`こんな感じ！`];
  fetchLineEndpointReply(replyToken, messages);
}

function replyFormUrl(replyToken) {
  const messages = [`以下のURLからご感想・ご意見をお寄せください！開発の参考にさせていただきます`,`https://forms.gle/GffWz4bJwDPHaGMTA`];
  fetchLineEndpointReply(replyToken, messages);
}

function replyMessages(replyToken, postMessage) {
  const results = searchSupports(postMessage);
  const resultsCount = results.length;
  const messages = [`${resultsCount}件がヒットしました`];
  addMessages(results, resultsCount, messages);
  if (resultsCount > 3) {
    messages.push(`続きはこちらから！\n${COVID_19}` + "#" + `${postMessage}`);
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
  let limit = 3;
  switch (resultsCount) {
    case 0:
      break;
    case 1:
    case 2:
      limit = resultsCount;
      formatMessages(results, resultsCount, messages, limit);
      break;
    default:
      limit = 3;
      formatMessages(results, resultsCount, messages, limit);
      break;
  }
}

function formatMessages(results, resultsCount, messages, limit) {
  for (let i = 0; i < limit; i++) {
    results[i]["startDate"] = dateToString(results[i]["startDate"]);
    results[i]["endDate"] = dateToString(results[i]["endDate"]);
    results[i]["releaseDate"] = dateToString(results[i]["releaseDate"]);
    let message = `【${results[i]["serviceName"]}】` + `\n` + `${results[i]["url"]}` + `\n\n●提供：` + `${results[i]["orgName"]}` + `\n●費用：` + `${results[i]["price"]}` + `\n●提供期間：` + `${results[i]["startDate"]}〜${results[i]["endDate"]} ${results[i]["dateNotes"]}` + `\n●詳細：\n` + `${results[i]["details"]}` + `\n●情報元：` + `${results[i]["source"]}` + `\n●発表：` + `(${results[i]["releaseDate"]})`;
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

function dateToString(date) {
  let dateString = date;
  if (typeof dateString === "object") {
    dateString = Utilities.formatDate(date,"JST","yyyy/MM/dd");
  }
  return dateString;
}

function multicast() {
  let results = supports;
  let resultsCount = results.length;
  if (resultsCount !== 0) {
    let messages = [`昨日と今日は${resultsCount}件の新着情報がありました`];
    addMessages(results, resultsCount, messages);
    if (resultsCount > 3) {
      messages.push(`続きはこちらから！\n${COVID_19}`);
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