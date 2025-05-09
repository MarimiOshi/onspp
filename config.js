// config.js

// メンバー情報
const members = [
    { name: 'マコ', imageFolders: { hutuu: { path: 'images/mako/hutuu/', imageCount: 3 }, ero: { path: 'images/mako/ero/', imageCount: 8 } }, color: '#F97430', tags: {} },
    { name: 'リオ', imageFolders: { hutuu: { path: 'images/rio/hutuu/', imageCount: 6 }, ero: { path: 'images/rio/ero/', imageCount: 8 } }, color: '#68C2E3', tags: {} },
    { name: 'マヤ', imageFolders: { hutuu: { path: 'images/maya/hutuu/', imageCount: 3 }, ero: { path: 'images/maya/ero/', imageCount: 8 } }, color: '#7F3F97', tags: {} },
    { name: 'リク', imageFolders: { hutuu: { path: 'images/riku/hutuu/', imageCount: 3 }, ero: { path: 'images/riku/ero/', imageCount: 2 } }, color: '#FDE152', tags: {} },
    { name: 'アヤカ', imageFolders: { hutuu: { path: 'images/ayaka/hutuu/', imageCount: 0 }, ero: { path: 'images/ayaka/ero/', imageCount: 1 } }, color: '#FFFFFF', tags: {} },
    { name: 'マユカ', imageFolders: { hutuu: { path: 'images/mayuka/hutuu/', imageCount: 11 }, ero: { path: 'images/mayuka/ero/', imageCount: 32 } }, color: '#00ABA9', tags: {} },
    { name: 'リマ', imageFolders: { hutuu: { path: 'images/rima/hutuu/', imageCount: 15 }, ero: { path: 'images/rima/ero/', imageCount: 35 } }, color: '#B02537', tags: {} },
    { name: 'ミイヒ', imageFolders: { hutuu: { path: 'images/miihi/hutuu/', imageCount: 27 }, ero: { path: 'images/miihi/ero/', imageCount: 54 } }, color: '#F8B9C9', tags: {} },
    { name: 'ニナ', imageFolders: { hutuu: { path: 'images/nina/hutuu/', imageCount: 4 }, ero: { path: 'images/nina/ero/', imageCount: 1 } }, color: '#005BAC', tags: {} },
];

// イメプレイ用キャラクタープリセット
const impurePresets = {
    "マコ": { name: "マコ", persona: { age: "23", firstPerson: "私", dialect: "標準語", appearance: "黒髪ボブ...", userName: "あなた", relationship: "大切な幼馴染...", heartEmoji: "🩷", personality: "しっかり者...", sexPreferences: "優しくリードされたい...", speechStyle: "丁寧語とタメ口", emotionExpressionDesc: "目は口ほどに物を言う" } },
    "リオ": { name: "リオ", persona: { age: "22", firstPerson: "私", dialect: "標準語", appearance: "クールビューティー...", userName: "あなた", relationship: "ダンス仲間", heartEmoji: "🩵", personality: "クールに見えて情熱的...", sexPreferences: "激しいのが好き...", speechStyle: "サバサバ", emotionExpressionDesc: "照れると早口" } },
    "マヤ": { name: "マヤ", persona: { age: "22", firstPerson: "私", dialect: "標準語", appearance: "白鳥のような清楚感...", userName: "あなた", relationship: "クラスメイト", heartEmoji: "💚", personality: "おっとり、優しい...", sexPreferences: "ロマンチック...", speechStyle: "ゆっくり優しい", emotionExpressionDesc: "困ると眉ハの字" } },
    "リク": { name: "リク", persona: { age: "21", firstPerson: "うち", dialect: "関西弁", appearance: "リスみたい...", userName: "りょうや", relationship: "幼馴染", heartEmoji: "💛", personality: "元気、明るい...", sexPreferences: "楽しいのが一番...", speechStyle: "元気な関西弁", emotionExpressionDesc: "感情が顔に出やすい" } },
    "アヤカ": { name: "アヤカ", persona: { age: "21", firstPerson: "私", dialect: "標準語", appearance: "ふわふわ...", userName: "あなた", relationship: "先輩", heartEmoji: "🤍", personality: "マイペース...", sexPreferences: "雰囲気に流されやすい...", speechStyle: "独特の間", emotionExpressionDesc: "瞳は雄弁" } },
    "マユカ": { name: "マユカ", persona: { age: "20", firstPerson: "私", dialect: "標準語（時々関西弁）", appearance: "猫顔...", userName: "あなた", relationship: "同級生", heartEmoji: "💜", personality: "人見知りだけど面白い...", sexPreferences: "恥ずかしがり...", speechStyle: "落ち着いたトーン", emotionExpressionDesc: "照れると赤面" } },
    "リマ": { name: "リマ", persona: { age: "20", firstPerson: "りま", dialect: "標準語（英語混じり）", appearance: "黒髪ロング...", userName: "りょうや", relationship: "秘密の恋人", heartEmoji: "❤️", personality: "クール、自由奔放...", sexPreferences: "積極的...", speechStyle: "英語交じり", emotionExpressionDesc: "行動で好意示す" } },
    "ミイヒ": { name: "ミイヒ", persona: { age: "19", firstPerson: "ミイヒ", dialect: "標準語", appearance: "笑顔が天使...", userName: "あなた", relationship: "ファン", heartEmoji: "🩷", personality: "可愛い、甘え上手...", sexPreferences: "可愛いって言われたい...", speechStyle: "甘えた話し方", emotionExpressionDesc: "表情豊か" } },
    "ニナ": { name: "ニナ", persona: { age: "19", firstPerson: "私", dialect: "標準語（英語混じり）", appearance: "末っ子...", userName: "あなた", relationship: "音楽仲間", heartEmoji: "💙", personality: "明るい、ポジティブ...", sexPreferences: "情熱的...", speechStyle: "ハキハキ英語出る", emotionExpressionDesc: "感情ストレート" } }
};
const situationPresets = ["二人きりの楽屋", "レッスンの休憩中", "宿泊先のホテル", "オフの日のデート中", "メンバーには秘密の場所", "オンライン通話中", "ステージ袖での出番待ち", "帰り道", "雨宿り中"];
const suggestedTagsCategorized = { "表情・感情": ["笑顔", "真顔", "怒り顔", "泣き顔", "困り顔", "嬉しい", "楽しい", "悲しい", "怒り", "恥ずかしがり", "照れ", "緊張", "誘惑", "キス顔", "舌出し", "恍惚", "イキ顔"], "画像種類": ["通常", "アイコラ", "文字コラ", "剥ぎコラ", "まんスジ", "ポロリ", "谷間"], "注目部位": ["おっぱい", "尻", "脚", "顔", "口", "太もも", "手", "腹", "脇", "まんこ", "乳首", "クリトリス"], "プレイ": ["手マン", "手コキ", "フェラ", "クンニ", "パイズリ", "乳首責め", "クリ責め", "挿入", "正常位", "騎乗位", "後背位", "駅弁", "立ちバック", "アナル", "ぶっかけ", "中出し", "顔射", "飲精", "潮吹き", "オナニー", "キス", "69", "お掃除フェラ"], "服装・状況": ["私服", "衣装", "水着", "下着", "裸", "制服", "パジャマ", "部屋着", "自撮り", "他撮り", "ベッド", "風呂", "屋外", "屋内", "ライブ", "レッスン"] };
let suggestedTags = []; try { if (typeof Object.values === 'function' && typeof Array.prototype.flat === 'function') { suggestedTags = Object.values(suggestedTagsCategorized).flat(); } else { console.warn("Using fallback for suggestedTags generation."); for (const category in suggestedTagsCategorized) { if (Array.isArray(suggestedTagsCategorized[category])) { suggestedTags = suggestedTags.concat(suggestedTagsCategorized[category]); } } } suggestedTags = [...new Set(suggestedTags)].sort(); console.log(`Generated ${suggestedTags.length} unique suggested tags.`); } catch (error) { console.error("Error generating flat suggestedTags list:", error); suggestedTags = []; }
const progressTagChoices = { "前戯": [ { name: "キス", color: "#a991d4" }, { name: "手マン", color: "#a991d4" }, { name: "フェラ", color: "#a991d4" }, { name: "手コキ", color: "#a991d4" }, { name: "クンニ", color: "#a991d4" }, { name: "パイズリ", color: "#a991d4" }, { name: "乳首責め", color: "#a991d4" }, { name: "69", color: "#a991d4" }, { name: "オナニー見せ合い", color: "#a991d4" }, ], "体位": [ { name: "正常位", color: "#e64980" }, { name: "騎乗位", color: "#e64980" }, { name: "後背位", color: "#e64980" }, { name: "駅弁", color: "#e64980" }, { name: "立ちバック", color: "#e64980" }, { name: "顔面騎乗", color: "#e64980" }, { name: "アナル", color: "#e64980" }, ], "フィニッシュ": [ { name: "フィニッシュ", color: "#fcc419" }, { name: "中出し", color: "#fcc419" }, { name: "ぶっかけ", color: "#fcc419" }, { name: "顔射", color: "#fcc419" }, { name: "飲精", color: "#fcc419" }, ], "その他": [ { name: "お掃除フェラ", color: "#a991d4" }, { name: "会話・休憩", color: "#868e96" }, ] };
const progressTagSfx = { "手マン": ["クチュ", "クチュクチュ", "ジュプッ", "ぬるん…", "びくっ♡"], "フェラ": ["んぐっ", "おぇっ…", "はむっ", "ちゅぱ", "んく…んく…"], "手コキ": ["シコシコ", "シュポシュポ", "きゅっ♡", "ズルッ", "ゴシゴシ"], "クンニ": ["ちゅぷ", "ずるっ", "くちゅ♡", "れろれろ", "じゅる…"], "パイズリ": ["むにゅ", "ふにふに", "にゅるん", "もちっ"], "乳首責め": ["クリクリ", "コリコリ", "きゅん♡", "ぴくっ"], "正常位": ["パンパン", "ズコン", "グチュグチュ", "奥まで…♡", "ぎしっ"], "騎乗位": ["グポォ", "ズブズブ", "ふのっ♡", "もちっ", "ぐりぐり"], "後背位": ["パンパンッ", "グチュッ", "ズドンッ", "突き上げて…♡"], "駅弁": ["ずぷり", "むぎゅ", "くっ…"], "立ちバック": ["ドンッ", "ずしっ", "ぷりっ"], "顔面騎乗": ["むぐっ", "んぐぅ…", "く、苦し…"], "アナル": ["ブスッ", "ぐりっ…", "きっ…♡", "ひくひく"], "中出し": ["ビュルルッ", "ドクドク…", "とぷん…♡", "あったかい…"], "ぶっかけ": ["ビュッ", "ビシャッ", "とろり…"], "顔射": ["べちゃっ", "とろ〜り", "んんっ！"], "飲精": ["ごくん…", "こくこく", "んっ…♡"], "キス": ["んむっ", "チュッ♡", "ちゅ…", "れろ…"], "フィニッシュ": ["びくんびくんっ！", "はうぅっ♡", "イッたぁ！", "あ゛ーーーっ！"], "お掃除フェラ": ["ぺろぺろ", "ごしごし", "綺麗にするね♡"], "会話・休憩": ["ふぅ…", "えへへ", "(休憩中)", "(見つめる)"], "オナニー見せ合い": ["くちゅ♡(自)", "びくっ♡(自)", "はぁはぁ…"], "69": ["れろれろ", "ちゅぱちゅぱ", "んぐっ", "ずるるっ"], "デフォルト": ["ドキッ", "ん…♡", "(見つめる)", "(息遣い)", "…？"] };

// --- ▼▼▼ ステッカー設定 ▼▼▼ ---
// 占いモードで使うステッカー画像のパスリスト (images/stickers/ に配置想定)
// 1.png から 21.png までを自動生成
const stickerImagePaths = Array.from({ length: 21 }, (_, i) => `images/stickers/${i + 1}.png`);
// 例: ['images/stickers/1.png', 'images/stickers/2.png', ..., 'images/stickers/21.png']

// ステッカーの色相回転の基準となる色 (デフォルトの赤)
const STICKER_BASE_COLOR_HEX = '#ff0000';
// --- ▲▲▲ ステッカー設定 ▲▲▲ ---

// --- LocalStorage キー定義 ---
const TAG_STORAGE_KEY = 'onspImageTags_v2';
const WEAK_POINT_STORAGE_KEY = 'onspWeakPoints_v1';
const LS_PLAYER_INFO_KEY = "imepurePlayerInfo_v1";
const LS_IMEPRE_PREFIX = "imepureCustomPersona_v2_";
const LS_TIMELINE_KEY = "imepureTimeline_v1";