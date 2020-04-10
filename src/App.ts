import {
  Support,
  Data as SubsidyData,
  Subsidy
} from './typings'

const LINE_ENDPOINT_REPLY = 'https://api.line.me/v2/bot/message/reply';
const LINE_ENDPOINT_MULTICAST = 'https://api.line.me/v2/bot/message/multicast';

// 支援情報 from 民間
const SUPPORT_DETAIL_URL = 'https://vscovid19.code4japan.org/';
const SUPPORT_API_URL = "https://app.sabae.cc/api/googlespreadsheet.json?key=2PACX-1vSFMNp5HcRNOF5MrAujEUWR1dIoX2mncMEWTbPlVAaJqKWiq831-6gnCyI7n_G8YfPqNQXrfwyVjyHL&fbclid=IwAR1COPWKIjz5rH-nHD4Raned5-_tIxRCcDpFIfTplxqkGbjkh5ifKjOopOI"

// 支援情報 from 行政
const SUBSIDY_API_URL =
  'https://jirei-seido-api.mirasapo-plus.go.jp/supports?keywords=%E6%96%B0%E5%9E%8B%E3%82%B3%E3%83%AD%E3%83%8A%E3%82%A6%E3%82%A4%E3%83%AB%E3%82%B9%E6%84%9F%E6%9F%93%E7%97%87%E9%96%A2%E9%80%A3';
const SUBSIDY_DETAIL_URL =
  'https://seido-navi.mirasapo-plus.go.jp/supports?keywords=%E6%96%B0%E5%9E%8B%E3%82%B3%E3%83%AD%E3%83%8A%E3%82%A6%E3%82%A4%E3%83%AB%E3%82%B9';

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

const doPost = (e) => {
  const currentEvent = JSON.parse(e.postData.contents).events[0];
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

const follow = (e) => {
  SHEET2.appendRow([e.source.userId]);
}

const unfollow = (e) => {
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

const replyAboutVSCovid19 = (replyToken: string) => {
  const messages = [
    'VS COVID-19は、新型コロナウイルス感染症に対応した支援をまとめたサイトです。政府から公表されたデータを使用しています。詳しくはこちら↓',
    '●政府のプレスリリース(企業による無償等支援に関する情報について)',
    'https://www.soumu.go.jp/menu_news/s-news/01ryutsu02_02000267.html',
    '●政府のプレスリリース(事業者向け政府支援制度情報について)',
    'https://www.soumu.go.jp/menu_news/s-news/01ryutsu06_02000243.html',

  ]
    ;
  fetchLineEndpointReply(replyToken, messages);
}

const replyAboutHowToUseSearch = (replyToken: string) => {
  const messages = [`検索したい単語を送信してみてください`,`例えば…`,`教育`,`テレワーク`,`こんな感じ！`];
  fetchLineEndpointReply(replyToken, messages);
}

const replyFormUrl = (replyToken: string) => {
  const messages = [`以下のURLからご感想・ご意見をお寄せください！開発の参考にさせていただきます！`,`https://forms.gle/GffWz4bJwDPHaGMTA`];
  fetchLineEndpointReply(replyToken, messages);
}

const replyMessages = (replyToken: string, postMessage?: string | null) => {
  if (!postMessage) {
    const messages = ['検索ワードがみつかりません'];
    return fetchLineEndpointReply(replyToken, messages);
  }
  let messages = [];
  // 民間支援情報
  const results = searchSupports(postMessage);
  const resultsCount = results && results?.length;
  (resultsCount && resultsCount > 0)
    ? messages.push(`民間支援情報: ${resultsCount}件がヒットしました`)
    : messages.push('民間支援情報: 該当する支援情報がみつかりませんでした');
  const limit = resultsCount > 1 ? 2 : resultsCount;
  const returnSupportResults = resultsCount > 0 && results.slice(0, limit)
  // 行政支援情報
  const subsidyResult = searchSubsidy(postMessage);
  const subsidyCount = subsidyResult && subsidyResult?.total;
  (subsidyCount && subsidyCount > 0)
    ? messages.push(`行政支援情報: ${subsidyCount}件がヒットしました`)
    : messages.push('行政支援情報: 該当する支援情報がみつかりませんでした')
  const subsidyLimit = subsidyCount > 1 ? 2 : subsidyCount;
  const returnSubsidyResults = subsidyCount > 0 && subsidyResult.items.slice(0, subsidyLimit)
  // 表示系
  const formattedMessages = formatMessages(returnSupportResults, returnSubsidyResults);
  formattedMessages?.length > 0 && Array.prototype.push.apply(messages, formattedMessages);
  if (resultsCount > 2) {
    messages.push(`民間支援情報: 続きはこちらから！\n${SUPPORT_DETAIL_URL}#${postMessage}`);
  }
  if (subsidyCount > 2) {
    messages.push(`行政支援情報: 続きはこちらから！\n${SUBSIDY_DETAIL_URL},${postMessage}`);
  }
  fetchLineEndpointReply(replyToken, messages);
}

const searchSupports = (word: string): Support[] => {
  const filteredByWordSupports = supports.filter(
    support =>
      support['サービス名称'].includes(word) ||
      support['詳細'].includes(word) ||
      support['企業等'].includes(word),
  );
  return filteredByWordSupports
}

const searchSubsidy = (word: string): SubsidyData => {
  const res = UrlFetchApp.fetch(`${SUBSIDY_API_URL},${word}`);
  const result: SubsidyData = JSON.parse(res.getContentText());
  return result;
}

const formatMessages = (
  supports: Support[],
  subsidies: Subsidy[]
): string[] => {
    const formattedSupports = (supports?.length > 0) ? supports.map(
      (result: Support) =>  {
        return `【${result?.['サービス名称']}】\n` +
        `${result?.URL}\n\n` +
        `●提供：${result?.['企業等']}\n` +
        `●費用：${result?.['無料/有料']}\n` +
        `●提供期間：${result?.['開始日']}〜${
          result?.['終了日']
        } ${result?.['期間備考']}\n` +
        `●詳細：\n` +
        `${result?.['詳細']}\n` +
        `●情報元：${result?.['情報源']}\n` +
        `●発表：(${result?.['発表日付']})`;;
      }
    ) : [];
    const formattedSubsidies = (subsidies?.length > 0) ? subsidies.map(
      (result: Subsidy) =>  {
        return `【${result?.title}】\n` +
        `${result?.refernece}\n\n` +
        `●提供：${result?.support_organization}\n` +
        `●対象：${result?.target}\n` +
        `●提供期間：${result?.reception_start_date}〜\n` +
        `●詳細：\n` +
        `${result?.summary}\n` +
        `●最終更新日：${result?.update_info?.last_modified_at}`;
      }
    ) : [];
    return formattedSupports.concat(formattedSubsidies)
}

const fetchLineEndpointReply = (replyToken: string, messages: string[]) => {
  const replyMessages = messages?.map(m => ({'type': 'text', 'text': m}));
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

const fetchLineEndpointMulticast = (messages: string[]) => {
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