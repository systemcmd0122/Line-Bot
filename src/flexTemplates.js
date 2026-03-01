/**
 * Flex Message templates for the LINE Bot
 */

function createTimetableFlex(day, subjects, events = []) {
  const isWeekend = subjects.length === 0;

  const bodyContents = [];

  // Add subjects
  if (isWeekend) {
    bodyContents.push({
      "type": "text",
      "text": `${day}は授業がありません。`,
      "size": "md",
      "color": "#666666",
      "wrap": true
    });
  } else {
    subjects.forEach((subject, index) => {
      bodyContents.push({
        "type": "box",
        "layout": "horizontal",
        "contents": [
          {
            "type": "text",
            "text": `${index + 1}限`,
            "size": "sm",
            "color": "#888888",
            "flex": 1
          },
          {
            "type": "text",
            "text": subject || "-",
            "size": "md",
            "color": "#333333",
            "flex": 4,
            "weight": "bold",
            "wrap": true
          }
        ],
        "margin": "md",
        "paddingBottom": "sm"
      });
    });
  }

  // Add events if any
  if (events && events.length > 0) {
    bodyContents.push({
      "type": "separator",
      "margin": "xl"
    });
    bodyContents.push({
      "type": "text",
      "text": "📅 本日の行事",
      "weight": "bold",
      "size": "sm",
      "margin": "md",
      "color": "#4CAF50"
    });

    events.forEach(event => {
      bodyContents.push({
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "text",
            "text": event.summary,
            "size": "sm",
            "weight": "bold",
            "wrap": true
          }
        ],
        "margin": "sm",
        "paddingStart": "md"
      });
    });
  }

  return {
    "type": "flex",
    "altText": `【${day}の時間割】`,
    "contents": {
      "type": "bubble",
      "header": {
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "text",
            "text": day,
            "weight": "bold",
            "size": "xl",
            "color": "#ffffff"
          }
        ],
        "backgroundColor": "#4CAF50"
      },
      "body": {
        "type": "box",
        "layout": "vertical",
        "contents": bodyContents
      },
      "footer": {
        "type": "box",
        "layout": "vertical",
        "spacing": "sm",
        "contents": [
          {
            "type": "button",
            "style": "link",
            "height": "sm",
            "action": {
              "type": "uri",
              "label": "詳細をサイトで見る",
              "uri": process.env.SITE_URL || "https://shs2d-linebot.aeroindust.com"
            }
          }
        ]
      }
    }
  };
}

function createHelpFlex() {
  return {
    "type": "flex",
    "altText": "【時間割ボットの使い方】",
    "contents": {
      "type": "bubble",
      "header": {
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "text",
            "text": "使い方・ヘルプ",
            "weight": "bold",
            "size": "xl",
            "color": "#ffffff"
          }
        ],
        "backgroundColor": "#2196F3"
      },
      "body": {
        "type": "box",
        "layout": "vertical",
        "spacing": "md",
        "contents": [
          {
            "type": "text",
            "text": "以下のコマンドを送信するか、下のボタンをタップしてください。",
            "wrap": true,
            "size": "sm"
          },
          {
            "type": "separator"
          },
          {
            "type": "text",
            "text": "• 今日の時間割\n• 今日の行事\n• 明日の時間割 / 行事\n• 〇曜日の時間割\n• 通知オン / 通知オフ",
            "wrap": true,
            "margin": "md"
          }
        ]
      },
      "footer": {
        "type": "box",
        "layout": "vertical",
        "spacing": "sm",
        "contents": [
          {
            "type": "button",
            "style": "primary",
            "color": "#4CAF50",
            "action": {
              "type": "message",
              "label": "今日の時間割",
              "text": "今日の時間割"
            }
          },
          {
            "type": "box",
            "layout": "horizontal",
            "spacing": "sm",
            "contents": [
              {
                "type": "button",
                "style": "secondary",
                "action": {
                  "type": "message",
                  "label": "通知オン",
                  "text": "通知オン"
                },
                "flex": 1
              },
              {
                "type": "button",
                "style": "secondary",
                "action": {
                  "type": "message",
                  "label": "通知オフ",
                  "text": "通知オフ"
                },
                "flex": 1
              }
            ]
          }
        ]
      }
    }
  };
}

function getQuickReplies() {
  return {
    "items": [
      {
        "type": "action",
        "action": {
          "type": "message",
          "label": "今日の予定",
          "text": "今日の時間割"
        }
      },
      {
        "type": "action",
        "action": {
          "type": "message",
          "label": "今日の行事",
          "text": "今日の行事"
        }
      },
      {
        "type": "action",
        "action": {
          "type": "message",
          "label": "明日",
          "text": "明日の時間割"
        }
      },
      {
        "type": "action",
        "action": {
          "type": "message",
          "label": "通知ON",
          "text": "通知オン"
        }
      },
      {
        "type": "action",
        "action": {
          "type": "message",
          "label": "通知OFF",
          "text": "通知オフ"
        }
      },
      {
        "type": "action",
        "action": {
          "type": "message",
          "label": "ヘルプ",
          "text": "ヘルプ"
        }
      }
    ]
  };
}

function createEventsFlex(day, events = []) {
  const bodyContents = [];

  if (events.length === 0) {
    bodyContents.push({
      "type": "text",
      "text": `${day}に予定されている行事はありません。`,
      "size": "md",
      "color": "#666666",
      "wrap": true
    });
  } else {
    events.forEach(event => {
      bodyContents.push({
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "text",
            "text": event.summary,
            "weight": "bold",
            "size": "md",
            "wrap": true
          }
        ],
        "margin": "md",
        "backgroundColor": "#f0fdf4",
        "cornerRadius": "md",
        "paddingAll": "md"
      });
      if (event.location || event.description) {
        const details = [];
        if (event.location) details.push(`📍 ${event.location}`);
        if (event.description) details.push(event.description);

        bodyContents.push({
          "type": "text",
          "text": details.join('\n'),
          "size": "xs",
          "color": "#888888",
          "wrap": true,
          "margin": "sm",
          "paddingStart": "md"
        });
      }
    });
  }

  return {
    "type": "flex",
    "altText": `【${day}の行事予定】`,
    "contents": {
      "type": "bubble",
      "header": {
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "text",
            "text": `${day} の行事`,
            "weight": "bold",
            "size": "xl",
            "color": "#ffffff"
          }
        ],
        "backgroundColor": "#4CAF50"
      },
      "body": {
        "type": "box",
        "layout": "vertical",
        "contents": bodyContents
      }
    }
  };
}

module.exports = {
  createTimetableFlex,
  createHelpFlex,
  getQuickReplies,
  createEventsFlex
};
