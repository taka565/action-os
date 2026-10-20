export const HAZARDS = {
  "fire": {
    "id": "fire",
    "title": "火災の初動",
    "nodes": [
      {
        "id": "fire-alert",
        "title": "火災を周囲に知らせる",
        "summary": "火や煙・火災警報に気づいたら、声を出して周囲に知らせ、避難を始める。",
        "sourceIds": [
          "fire-initial",
          "fire-danger"
        ]
      },
      {
        "id": "fire-assess",
        "title": "初期消火を安全に行えるか",
        "summary": "火が小さく、退路を確保でき、危険を感じない場合に限り、適応する消火器で初期消火。",
        "branches": [
          {
            "condition": "炎が天井へ達した／危険を感じる／退路を確保できない",
            "action": "消火をやめて直ちに避難する"
          },
          {
            "condition": "火が小さく退路があり、安全に行える",
            "action": "出入口を背に消火器を使う。危険になれば中止し避難"
          },
          {
            "condition": "判断できない",
            "action": "無理に消火せず、避難を優先する"
          }
        ],
        "sourceIds": [
          "fire-initial",
          "fire-danger"
        ]
      },
      {
        "id": "fire-evacuate",
        "title": "早く避難する・戻らない",
        "summary": "持ち物にこだわらず避難。エレベーターを使わない。一度避難したら戻らない。",
        "sourceIds": [
          "fire-evac"
        ]
      },
      {
        "id": "fire-handover",
        "title": "避難状況を消防隊へ伝える",
        "summary": "安全な場所で、逃げ遅れた人・火元・初期消火の結果を確認できた範囲で伝える。未確認は未確認のまま記録。",
        "sourceIds": [
          "fire-roles"
        ]
      }
    ],
    "parallel": [
      {
        "title": "119番通報",
        "summary": "火災であること、住所・建物名・階、燃えているものを伝える。通報入力を避難の条件にしない。",
        "sourceIds": [
          "fire-call"
        ]
      },
      {
        "title": "声かけ・避難誘導",
        "summary": "周囲へ避難方向を知らせ、避難の介助が必要な人への対応と避難状況の共有を進める。",
        "sourceIds": [
          "fire-roles"
        ]
      }
    ],
    "name": "火災の初動",
    "edition": "共通初動・2026-10-20版",
    "checkedAt": "2026-10-20",
    "scope": "公的資料を基にした共通初動テンプレートの構成案。施設固有の消防計画・避難場所・避難経路・設備を確認したことは意味しない。",
    "sources": [
      {
        "name": "総務省消防庁｜防災危機管理eカレッジ「1.初期消火」",
        "edition": "Web公開版（ページ内に改訂日表示なし）",
        "url": "https://www.fdma.go.jp/relocation/e-college/cat67/cat49/cat43/1-14.html"
      },
      {
        "name": "東京消防庁｜やってみよう！防災訓練～避難のしかた～「避難時のポイント 1/2」",
        "edition": "Web公開版（ページ内に改訂日表示なし）",
        "url": "https://www.tfd.metro.tokyo.lg.jp/learning/contents/evacuation/contents04_1.html"
      },
      {
        "name": "東京消防庁｜やってみよう！防災訓練～119番通報のしかた～「119番通報のしかた 1/5」",
        "edition": "Web公開版（ページ内に改訂日表示なし）",
        "url": "https://www.tfd.metro.tokyo.lg.jp/learning/contents/report/contents04_1.html"
      },
      {
        "name": "東京都｜東京くらし防災 2023年版 114ページ",
        "edition": "2023年版",
        "url": "https://www.bousai.metro.tokyo.lg.jp/content/kb2023/pageindices/index114.html"
      },
      {
        "name": "東京消防庁｜どのように訓練を実施したらいいのか？",
        "edition": "PDF公開版（取得テキストで版表示を確認できず）",
        "url": "https://www.tfd.metro.tokyo.lg.jp/content/000077602.pdf"
      }
    ]
  },
  "earthquake": {
    "id": "earthquake",
    "title": "地震の初動",
    "nodes": [
      {
        "id": "quake-protect",
        "title": "揺れている間は身を守る",
        "summary": "頭を守り、物が落ちない・倒れない・移動してこない場所へ。丈夫な机の下などで揺れがおさまるまで身を守る。",
        "branches": [
          {
            "condition": "揺れが続いている／再び揺れた",
            "action": "身を守る行動を続ける。外へ飛び出さず、無理に火を消そうとしない"
          },
          {
            "condition": "揺れがおさまった",
            "action": "火の元と出口、周囲の危険を確認する"
          }
        ],
        "sourceIds": [
          "quake-action",
          "quake-eew"
        ]
      },
      {
        "id": "quake-tsunami",
        "title": "沿岸では津波の避難を優先",
        "summary": "海の近くで強い揺れ、弱くても長い揺れを感じたら、津波警報を待たず高台などへ避難。",
        "branches": [
          {
            "condition": "沿岸で強い／長い揺れ、または大津波警報・津波警報",
            "action": "ただちにより高い場所へ避難する。情報入力や安否確認の完了を待たない"
          },
          {
            "condition": "津波注意報で海の中・海岸にいる",
            "action": "ただちに海から上がり海岸から離れる"
          },
          {
            "condition": "該当するか未確認",
            "action": "現在地と津波情報を確認する。未確認を安全扱いしない"
          }
        ],
        "sourceIds": [
          "quake-tsunami"
        ]
      },
      {
        "id": "quake-check",
        "title": "揺れがおさまってから火の元・出口を確認",
        "summary": "破片や落下物に注意して出口を確保。出火があれば同じ事案の火災対応へつなぐ。",
        "sourceIds": [
          "quake-action"
        ]
      },
      {
        "id": "quake-people",
        "title": "安全な場所で安否と負傷を確認",
        "summary": "周囲の人の安否と出火を確認。負傷者がいれば必要な救命・通報の枝を追加する。",
        "sourceIds": [
          "quake-action"
        ]
      },
      {
        "id": "quake-continue",
        "title": "公式情報を確認し、安全確保を続ける",
        "summary": "行政等の情報を確認。津波警報・注意報が解除されるまで避難を続ける。再び揺れたら身を守る行動へ戻る。",
        "sourceIds": [
          "quake-action",
          "quake-tsunami"
        ]
      }
    ],
    "parallel": [
      {
        "title": "周囲への声かけ",
        "summary": "身を守る・避難する行動を周囲にも知らせる。",
        "sourceIds": [
          "quake-eew",
          "quake-action"
        ]
      },
      {
        "title": "公式情報・安否共有",
        "summary": "安全を確保してから地震・津波情報と確認できた安否を共有する。",
        "sourceIds": [
          "quake-action",
          "quake-tsunami"
        ]
      }
    ],
    "name": "地震の初動",
    "edition": "共通初動・2026-10-20版",
    "checkedAt": "2026-10-20",
    "scope": "公的資料を基にした共通初動テンプレートの構成案。施設固有の消防計画・避難場所・避難経路・設備を確認したことは意味しない。",
    "sources": [
      {
        "name": "東京消防庁｜地震 その時10のポイント",
        "edition": "2025年12月12日更新",
        "url": "https://www.tfd.metro.tokyo.lg.jp/lfe/bou_topic/jisin/point10.html"
      },
      {
        "name": "気象庁｜緊急地震速報を見聞きしたときは",
        "edition": "Web公開版（ページ内に全体の改訂日表示なし）",
        "url": "https://www.jma.go.jp/jma/kishou/know/jishin/eew/koudou/koudou.html"
      },
      {
        "name": "気象庁｜津波警報・注意報、津波情報、津波予報について",
        "edition": "Web公開版（ページ内に改訂日表示なし）",
        "url": "https://www.jma.go.jp/jma/kishou/know/jishin/joho/tsunamiinfo.html"
      }
    ]
  },
  "flood": {
    "id": "flood",
    "title": "大雨・浸水の初動",
    "nodes": [
      {
        "id": "flood-info",
        "title": "現在地の危険と避難情報を確認",
        "summary": "自治体の避難情報、ハザードマップ、キキクル等で危険な場所・避難先・経路を確認する。現地の危険が迫るときは情報入力を待たない。",
        "sourceIds": [
          "flood-action"
        ]
      },
      {
        "id": "flood-timing",
        "title": "危険な場所から早めに避難",
        "branches": [
          {
            "condition": "警戒レベル3 高齢者等避難",
            "action": "危険な場所にいる、避難に時間がかかる人と支援者は避難を開始"
          },
          {
            "condition": "警戒レベル4 避難指示",
            "action": "危険な場所から全員避難する"
          },
          {
            "condition": "相当する防災気象情報のみ発表",
            "action": "自治体の発令を待たず、キキクルや河川水位等を用いて避難を判断"
          },
          {
            "condition": "情報未確認",
            "action": "未確認を安全扱いせず、現在地の危険と公式情報を確認"
          }
        ],
        "sourceIds": [
          "flood-guideline",
          "flood-action"
        ]
      },
      {
        "id": "flood-imminent",
        "title": "災害が発生・切迫している場合",
        "summary": "警戒レベル5を待たない。既に危険が迫っているときは、川や崖から離れた頑丈な建物の上層階など、その時点で最善の安全確保行動をとる。",
        "sourceIds": [
          "flood-action"
        ]
      },
      {
        "id": "flood-continue",
        "title": "安全な場所で状況を継続確認",
        "summary": "自治体と気象庁の情報を確認し、居場所・避難状況を記録する。記録完了を危険の解消と同一に扱わない。",
        "sourceIds": [
          "flood-action"
        ]
      }
    ],
    "parallel": [
      {
        "title": "避難の支援",
        "summary": "避難に時間がかかる人の支援を進める。",
        "sourceIds": [
          "flood-guideline"
        ]
      },
      {
        "title": "情報の共有",
        "summary": "避難情報と現在地の危険を共有する。自治体の避難指示と気象庁の相当情報は分けて記録する。",
        "sourceIds": [
          "flood-action",
          "flood-2026"
        ]
      }
    ],
    "importantVersionNote": "2026年5月29日から新しい防災気象情報が運用開始。旧名称の固定表を新規実装しない。上記テンプレートは自治体の警戒レベル名称を用い、気象庁の相当情報と混同しない。",
    "name": "大雨・浸水の初動",
    "edition": "共通初動・2026-10-20版",
    "checkedAt": "2026-10-20",
    "scope": "公的資料を基にした共通初動テンプレートの構成案。施設固有の消防計画・避難場所・避難経路・設備を確認したことは意味しない。",
    "sources": [
      {
        "name": "内閣府｜避難情報に関するガイドラインの改定（令和8年3月）",
        "edition": "令和8年3月改定",
        "url": "https://www.bousai.go.jp/oukyu/hinanjouhou/r3_hinanjouhou_guideline/index.html"
      },
      {
        "name": "気象庁｜防災気象情報と警戒レベルとの対応について",
        "edition": "2026年の新防災気象情報に対応したWeb公開版",
        "url": "https://www.jma.go.jp/jma/kishou/know/bosai/alertlevel.html"
      },
      {
        "name": "気象庁｜新たな防災気象情報について（令和8年～）",
        "edition": "2026年5月29日運用開始",
        "url": "https://www.jma.go.jp/jma/kishou/know/bosai/keiho-update2026/index.html"
      }
    ]
  }
};
