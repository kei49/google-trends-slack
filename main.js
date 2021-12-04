const googleTrends = require('google-trends-api');
const EventEmitter = require('events');
const https = require('https');
require('dotenv').config()

class GoogleTrendsSlack {
  constructor(date, geo) {
    this.date = date;
    this.geo = geo;

    this.eventEmitter = new EventEmitter();
    this.dailyData;
  }

  init() {
    this.eventEmitter.once('daily', () => this.sendDailyNotify());
  }

  sendDailyNotify() {
    const latest = this.dailyData.default.trendingSearchesDays['0'];
    const formattedDate = latest.formattedDate;
    const contents = latest.trendingSearches;

    const slackSection = [{
      "type": "section",
      "text": {
        "type": "plain_text",
        "text": "Today's Google Trends"
      }
    }];

    for (const topicKey in contents) {
      const topic = contents[topicKey];
      slackSection.push({
        type: "divider"
      })
      slackSection.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `<${topic.image.newsUrl}|${topic.title.query}>`
        }
      })

      for (const articleKey in topic.articles) {
        if (articleKey === '0' || articleKey === '1' || articleKey === '2') {
          const articles = topic.articles[articleKey];

          slackSection.push({
            type: "section",
            text: {
              type: "mrkdwn",
              text: `<${articles.url}|${articles.snippet}>`
            }
          })
        }
      }
    }

    const promise = this.sendSlackNotification(slackSection.slice(0, 49), "daily"); // 50件までしかnotifyできない
    Promise.resolve(promise).then((res) => console.log(res));
  }

  daily() {
    const res = googleTrends.dailyTrends({
      trendDate: this.date,
      geo: this.geo
    }, (err, res) => {
      if (!err) {
        this.dailyData = JSON.parse(res);
        this.eventEmitter.emit('daily');
      }
    });
  }

  sendSlackNotification(slackSection, trendType) {
    const messageWithMeta = {
      'username': 'Google Trends',
      'text': `Daily | Google Trends`,
      'icon_emoji': ':ghost:',
      "blocks": slackSection
    }

    let messageBody;
    try {
      messageBody = JSON.stringify(messageWithMeta);
    } catch (e) {
      throw new Error('Failed to stringify messageBody', e);
    }

    return new Promise((resolve, reject) => {
      const requestOptions = {
        method: 'POST',
        header: {
          'Content-Type': 'application/json'
        }
      };
  
      const req = https.request(process.env.WEB_HOOK_URL, requestOptions, (res) => {
        let response = '';
        res.on('data', (d) => {
          response += d;
        });
        res.on('end', () => {
          resolve(response);
        })
      });
  
      req.on('error', (e) => {
        reject(e);
      });

      req.write(messageBody);
      req.end();
    });
  }
}


function notifyDailyJS () {
  const date = new Date();
  const obj = new GoogleTrendsSlack(date, geo='JP');

  obj.init();
  obj.daily();
}

function notifyDailyUS () {
  const date = new Date();
  const obj = new GoogleTrendsSlack(date, geo='US');

  obj.init();
  obj.daily();
}


function main() {
  notifyDailyJS();
  // notifyDailyUS();
}

main();
