/**
 * Flex Message templates for the LINE Bot
 */

function createTimetableFlex(day, subjects) {
  const isWeekend = subjects.length === 0;

  const bodyContents = isWeekend
    ? [
        {
          "type": "text",
          "text": `${day}は授業がありません。`,
          "size": "md",
          "color": "#666666",
          "wrap": true
        }
      ]
    : subjects.map((subject, index) => ({
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
      }));

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
            "text": "• 今日の時間割\n• 明日の時間割\n• 〇曜日の時間割\n• 通知オン / 通知オフ",
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
          "label": "今日",
          "text": "今日の時間割"
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

module.exports = {
  createTimetableFlex,
  createHelpFlex,
  getQuickReplies
};
