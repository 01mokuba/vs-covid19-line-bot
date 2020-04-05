// Checking whether git and clasp are working correctly
const COVID_19 = 'https://vscovid19.code4japan.org/';

const CHANNEL_ACCESS_TOKEN = PropertiesService.getScriptProperties().getProperty("CHANNEL_ACCESS_TOKEN");
const LINE_ENDPOINT_REPLY = 'https://api.line.me/v2/bot/message/reply';
const LINE_ENDPOINT_MULTICAST = 'https://api.line.me/v2/bot/message/multicast';

const SHEET1_ID = PropertiesService.getScriptProperties().getProperty("SHEET1_ID");
const SHEET1_NAME = 'data';
const SHEET2_ID = PropertiesService.getScriptProperties().getProperty("SHEET2_ID");
const SHEET2_NAME = 'users';

const SHEET1 = SpreadsheetApp.openById(SHEET1_ID).getSheetByName(SHEET1_NAME);
const SHEET1_DATA = SHEET1.getRange(2,1,SHEET1.getLastRow()-1,SHEET1.getLastColumn()-1).getValues();

let sheet1DataArrayOfDicts = [];
for (var i = 0; i < SHEET1_DATA.length; i++) {
  sheet1DataArrayOfDicts.push([]);
  sheet1DataArrayOfDicts[i]["id"] = SHEET1_DATA[i][0];
  sheet1DataArrayOfDicts[i]["addDate"] = SHEET1_DATA[i][1];
  sheet1DataArrayOfDicts[i]["field"] = SHEET1_DATA[i][2];
  sheet1DataArrayOfDicts[i]["category"] = SHEET1_DATA[i][3];
  sheet1DataArrayOfDicts[i]["keyword"] = SHEET1_DATA[i][4];
  sheet1DataArrayOfDicts[i]["serviceName"] = SHEET1_DATA[i][5];
  sheet1DataArrayOfDicts[i]["target"] = SHEET1_DATA[i][6];
  sheet1DataArrayOfDicts[i]["startDate"] = SHEET1_DATA[i][7];
  sheet1DataArrayOfDicts[i]["endDate"] = SHEET1_DATA[i][8];
  sheet1DataArrayOfDicts[i]["dateNotes"] = SHEET1_DATA[i][9];
  sheet1DataArrayOfDicts[i]["price"] = SHEET1_DATA[i][10];
  sheet1DataArrayOfDicts[i]["support"] = SHEET1_DATA[i][11];
  sheet1DataArrayOfDicts[i]["orgName"] = SHEET1_DATA[i][12];
  sheet1DataArrayOfDicts[i]["details"] = SHEET1_DATA[i][13];
  sheet1DataArrayOfDicts[i]["releaseDate"] = SHEET1_DATA[i][14];
  sheet1DataArrayOfDicts[i]["url"] = SHEET1_DATA[i][15];
  sheet1DataArrayOfDicts[i]["source"] = SHEET1_DATA[i][16];
}

const SHEET1_DATA_ARRAY_OF_DICTS = sheet1DataArrayOfDicts;
const SHEET1_DATA_ARRAY_OF_DICTS_STRING = SHEET1_DATA.map(row => {
  return row.join(',');
});

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
        case "新着情報を知りたい":
          replyTodayData(replyToken);
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

function replyTodayData(replyToken) {
  const results = getTodayData();
  const resultsCount = results.length;
  if (resultsCount !== 0) {
    const messages = [`昨日と今日は${resultsCount}件の新着情報がありました`];
    addMessages(results, resultsCount, messages);
    if (resultsCount > 3) {
      messages.push(`続きはこちらから！\n${COVID_19}`);
    }
    fetchLineEndpointReply(replyToken, messages);
  } else {
    const messages = [`昨日と今日は新着情報がありません`];
    fetchLineEndpointReply(replyToken, messages);
  }
}

function replyFormUrl(replyToken) {
  const messages = [`以下のURLからご感想・ご意見をお寄せください！開発の参考にさせていただきます`,`https://forms.gle/GffWz4bJwDPHaGMTA`];
  fetchLineEndpointReply(replyToken, messages);
}

function replyMessages(replyToken, postMessage) {
  const results = getData(postMessage);
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

function getData(word) {
  let results = [];
  for (var i = 0; i < SHEET1_DATA_ARRAY_OF_DICTS_STRING.length; i++) {
    if (SHEET1_DATA_ARRAY_OF_DICTS_STRING[i].indexOf(word) !== -1) {
      results.push(SHEET1_DATA_ARRAY_OF_DICTS[i]);
    }
  }
  return results;
}

function dateToString(date) {
  let dateString = date;
  if (typeof dateString === "object") {
    dateString = Utilities.formatDate(date,"JST","yyyy/MM/dd");
  }
  return dateString;
}

function multicast() {
  let results = getTodayData();
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

function getTodayData() {
  let results = [];
  let now = new Date();
  let todayDate = dateToString(now);
  let yesterdayDate = dateToString(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
  for (var i = 0; i < SHEET1_DATA_ARRAY_OF_DICTS.length; i++) {
    if (SHEET1_DATA_ARRAY_OF_DICTS[i]["addDate"] !== "") {
      let addDate = dateToString(SHEET1_DATA_ARRAY_OF_DICTS[i]["addDate"]);
      if (addDate == todayDate || addDate == yesterdayDate) {
        results.push(SHEET1_DATA_ARRAY_OF_DICTS[i]);
      }
    }
  }
  return results;
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