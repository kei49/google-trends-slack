const googleTrends = require('google-trends-api');
const EventEmitter = require('events');
const https = require('https');
require('dotenv').config()

class GoogleTrendsSlack {
  constructor() {
    this.eventEmitter = new EventEmitter();
    this.dailyData;
    this.trendsData;
    this.searchedData;
  }

  init() {
    this.eventEmitter.once('daily', () => this.sendDailyNotify());
    this.eventEmitter.once('trends', () => this.sendTrendsNotify());
    this.eventEmitter.once('search', () => this.sendSearchNotify());
  }

  daily(date, geo) {
    googleTrends.dailyTrends({
      trendDate: date,
      geo
    }, (err, res) => {
      if (!err) {
        this.dailyData = JSON.parse(res);
        this.eventEmitter.emit('daily');
      }
    });
  }

  trends(geo, category) {
    googleTrends.realTimeTrends({
        geo,
        category // All : 'all' Entertainment: 'e' Business : 'b' Science/Tech : 't' Health : 'm' Sports : 's' Top Stories : 'h'
    },  (err, res) => {
      if (!err) {
        this.trendsData = JSON.parse(res);
        this.eventEmitter.emit('trends');
      }
    });
  }

  search(keyword, hl) {
    googleTrends.autoComplete({
      keyword,
      hl
    },  (err, res) => {
      if (!err) {
        this.searchedData = JSON.parse(res);
        this.eventEmitter.emit('search');
      }
    });
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

    const promise = this.sendSlackNotification(slackSection, "Daily");
    Promise.resolve(promise).then((res) => console.log(res));
  }

  sendTrendsNotify() {
    const trends = this.trendsData;
    const stories = trends.storySummaries.trendingStories;

    const slackSection = [{
      "type": "section",
      "text": {
        "type": "plain_text",
        "text": "Realtime Google Trends"
      }
    }];

    for (const storyKey in stories) {
      const story = stories[storyKey];
      const firstArticle = story.articles['0'];

      slackSection.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `<${firstArticle.url}|${firstArticle.articleTitle}>\n<${story.shareUrl}|google trends>`
        }
      })
    }

    const promise = this.sendSlackNotification(slackSection, "Realtime"); 
    Promise.resolve(promise).then((res) => console.log(res));
  }

  sendSearchNotify() {
    const search = this.searchedData;
    console.log(search.default.topics);
  }

  sendSlackNotification(slackSection, trendType) {
    const messageWithMeta = {
      'username': 'Google Trends',
      'text': `${trendType} | Google Trends`,
      'icon_emoji': ':ghost:',
      "blocks": slackSection.slice(0, 49) // 50件までしかnotifyできない
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
  const obj = new GoogleTrendsSlack();
  obj.init();

  const date = new Date();
  obj.daily(date, geo='JP');
}

function notifyDailyUS () {
  const obj = new GoogleTrendsSlack();
  obj.init();

  const date = new Date();
  obj.daily(date, geo='US');
}

function notifyTrendsJSBusiness () {
  const obj = new GoogleTrendsSlack();
  obj.init();

  obj.trends(geo='JP', category='b');
}

function notifyTrendsJSTech () {
  const obj = new GoogleTrendsSlack();
  obj.init();

  obj.trends(geo='JP', category='t');
}

function notifyTrendsUS () { // あまり役に立たない
  const obj = new GoogleTrendsSlack();
  obj.init();

  obj.trends(geo='US', category='b');
}

function search() {
  const obj = new GoogleTrendsSlack();
  obj.init();

  obj.search(keyword="metaverse", hl='en');
}


function main() {
  process.argv.forEach((val, index) => {
    if (index && index === 2) {
      switch (val) {
        case 'dj':
          notifyDailyJS();
          break
        case 'du':
          notifyDailyUS();
          break
        case 'tjb':
          notifyTrendsJSBusiness();
          break
        case 'tje':
          notifyTrendsJSTech();
          break
        case 'tu':
          notifyTrendsUS();
          break
        default:
          notifyTrendsJSBusiness();
      }
    }    
  });

  // search();
}

main();
