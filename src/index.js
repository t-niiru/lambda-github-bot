'use strict';

// httpsモジュールの読み込み
const https = require('https');

//SlackのIncoming Webhooks設定で取得したWebhook URLをセット
const slack = 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'

//GitHubとSlackのユーザー名マッピングを定義
// KeyがGitHubのユーザー名、ValueがSlackのユーザー名
const mention = {
  '@t-niiru': '<@t.niiru>'
};

exports.handler = (event, context, callback) => {

  //GitHubの通知メッセージをSNS経由で取得
  console.log('event:'+JSON.stringify(event));
  const message = JSON.parse(event.Records[0].Sns.Message);
  console.log('message:'+JSON.stringify(message));

  //GitHubのイベントタイプを取得
  const eventType = event.Records[0].Sns.MessageAttributes['X-Github-Event'].Value;
  console.log('eventType：'+eventType);

  let text = '';
  switch (eventType) {
    // イベントタイプが "issue_comment"の場合
    case 'issue_comment':
      console.log('switch-eventType：issue_comment');
      const repositoryUrl = message.repository.html_url;
      const repository = '[' + message.repository.full_name + ']';
      const author = message.comment.user.login;
      const issueUrl = message.issue.html_url;
      const number = message.issue.number;
      const title = message.issue.title;
      const issue = '#' + number + ':' + title;
      const comment = mapping(message.comment.body);
      text += link(repositoryUrl, repository) + ' New comment by ' + author + ' on issue ' + link(issueUrl, issue) + '\n';
      text += comment;
      break;
    default:
      console.log('switch-eventType：default');
      console.log('switch-eventType：' + eventType);
      break;
  }

  if (text.length === 0) {
    callback(null, 'success');
  } else {
    const body = {
      text: text
    };
    console.log(JSON.stringify(body));

    const options = {
      host: slack.split('/')[2],
      port: 443,
      path: '/' + slack.split('/').slice(3).join('/'),
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(JSON.stringify(body))
      },
      method: 'POST'
    };
    console.log(JSON.stringify(options));

    const req = https.request(options, (res) => {
      res.setEncoding('utf8');
      console.log(JSON.stringify({statusCode: res.statusCode}));
      console.log(JSON.stringify(res.headers));
      res.on('data', (chunk) => {
        console.log(JSON.stringify({chunk: chunk}));
      });
      res.on('end', () => {
        console.log(JSON.stringify({message: 'No more data in response.'}));
        callback(null, 'success');
      });
    });
    req.write(JSON.stringify(body));
    req.on('error', (e) => {
      // console.log(e);
      callback(e);
    });
    req.end();
  }

  // リンクを生成する関数
  function link(url, text) {
    return '<' + url + '|' + text + '>';
  }

  //GitHubとSlackのユーザー名をマッピングする関数
  function mapping(comment) {
    console.log('comment:'+comment);
    const result = comment.replace(/@[a-zA-Z0-9_\-]+/g, (match) => {
      return mention[match] || match;
    });
    console.log('result:'+result);
    return result;
  }
};
