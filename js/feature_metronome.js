// js/feature_metronome.js (v1.1 - WAV Playback & BPM Control)

window.metronomeModule = (() => {
    // --- 定数 ---
    const LOOKAHEAD = 25.0;         // スケジューラー呼び出し頻度(ms)
    const SCHEDULE_AHEAD_TIME = 0.1; // 音をスケジュールする未来の時間(s)
    const DEFAULT_BPM = 60.0;       // デフォルトBPM
    const MIN_BPM = 30.0;           // 最小BPM
    const MAX_BPM = 300.0;          // 最大BPM (必要に応じて調整)
    const SOUND_FILE_PATH = 'sounds/'; // 音源ファイルのパス
    const NUM_SOUND_FILES = 8;       // 音源ファイルの数 (1.wav ~ 8.wav)

    // --- 状態変数 ---
    let audioContext = null;
    let isRunning = false;
    let currentBpm = DEFAULT_BPM;   // ★ 現在のBPMを保持
    let nextNoteTime = 0.0;       // 次の音のスケジュール時刻
    let schedulerTimerID = null;  // スケジューラーのタイマーID
    let soundBuffers = [];        // デコード済み音声バッファをキャッシュ
    let soundsLoaded = false;     // 音声ロード完了フラグ

    // --- デバッグ用フラグ ---
    const DEBUG_METRONOME = false; // メトロノーム関連のログ出力

    // --- 音声ファイルの読み込みとデコード ---
    async function loadSound(url) {
        if (!audioContext) {
            console.error("AudioContext not initialized. Cannot load sound.");
            return null;
        }
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} for ${url}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            // decodeAudioData を使用
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            return audioBuffer;
        } catch (error) {
            console.error(`Error loading or decoding sound: ${url}`, error);
            return null;
        }
    }

    // すべての音声ファイルを事前に読み込む
    async function loadAllSounds() {
        if (!audioContext) return false;
        if (soundsLoaded) return true; // 既にロード済みなら何もしない

        console.log("Loading metronome sounds...");
        soundBuffers = []; // キャッシュをクリア
        const loadPromises = [];
        for (let i = 1; i <= NUM_SOUND_FILES; i++) {
            const url = `${SOUND_FILE_PATH}${i}.wav`;
            loadPromises.push(loadSound(url));
        }
        try {
            const buffers = await Promise.all(loadPromises);
            soundBuffers = buffers.filter(buffer => buffer !== null);
            if (soundBuffers.length === 0) {
                console.error("Failed to load any metronome sounds. Metronome will be silent.");
                soundsLoaded = false;
                return false;
            }
            console.log(`Successfully loaded ${soundBuffers.length} metronome sounds.`);
            soundsLoaded = true;
            return true;
        } catch (error) {
            console.error("Error loading metronome sounds:", error);
            soundsLoaded = false;
            return false;
        }
    }


    // --- 初期化 ---
    async function initialize() {
        console.log("Initializing Metronome module...");
        try {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!window.AudioContext) {
                console.error("Web Audio API is not supported.");
                return false;
            }
            if (!audioContext) {
                audioContext = new AudioContext();
                if (DEBUG_METRONOME) console.log("AudioContext initialized.");
                // アプリ初期化時に音声を非同期でロード開始
                await loadAllSounds();
            } else if (!soundsLoaded) {
                // AudioContextは存在するがサウンドが未ロードの場合 (resume後など)
                await loadAllSounds();
            }
            return true;
        } catch (e) {
            console.error("Error initializing AudioContext:", e);
            audioContext = null;
            return false;
        }
    }


    // --- ユーザー操作による再開 ---
    function resumeAudioContextIfNeeded() {
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume().then(async () => { // async追加
                if (DEBUG_METRONOME) console.log('AudioContext resumed successfully.');
                // 再開後に音がロードされていない場合はロード試行
                if (!soundsLoaded) {
                    await loadAllSounds(); // await追加
                }
            }).catch(e => {
                console.error('Error resuming AudioContext:', e);
            });
        }
         // まだロード中or失敗していたらロード試行
         else if (audioContext && !soundsLoaded) {
            loadAllSounds(); // 非同期でロード開始 (await不要)
         }
    }


    // --- BPM 設定・取得 ---
    function setBpm(newBpm) {
        if (typeof newBpm !== 'number' || isNaN(newBpm)) {
             console.warn(`Invalid BPM value type: ${newBpm}`);
             return;
         }
        currentBpm = Math.max(MIN_BPM, Math.min(MAX_BPM, newBpm));
        if (DEBUG_METRONOME) {
             // 頻繁にログが出ないように、変更があった時だけ出すなどの工夫も可能
             // console.log(`Metronome BPM set to: ${currentBpm.toFixed(1)}`);
        }
    }

    function getCurrentBpm() {
        return currentBpm;
    }

    // 従来の speedLevel (0-4) から BPM への変換
    function levelToBpm(speedLevel) {
        // DEFAULT_BPM_LEVELS を参照するように変更 (base.jsと合わせる)
        // 定数は base.js 側で定義されている想定だが、こちらにも持つ方が安全かも
        const bpmLevels = [90, 120, 140, 160, 240]; // base.js と同じ値
        const level = Math.max(0, Math.min(speedLevel, bpmLevels.length - 1));
        return bpmLevels[level];
    }
    function setSpeed(speedLevel) { setBpm(levelToBpm(speedLevel)); }

    // --- 再生ロジック ---
    function nextNote() {
        // BPMに基づいて次のノート時間を計算
        const secondsPerBeat = 60.0 / currentBpm;
        nextNoteTime += secondsPerBeat;
    }

    // 指定した時刻にランダムな音を鳴らすスケジュール
    function scheduleNote(time) {
        if (!audioContext || !soundsLoaded || soundBuffers.length === 0) return;

        // ランダムなサウンドバッファを選択
        const randomIndex = Math.floor(Math.random() * soundBuffers.length);
        const bufferToPlay = soundBuffers[randomIndex];

        if (!bufferToPlay) {
            // console.warn(`Sound buffer at index ${randomIndex} is invalid.`); // 頻繁に出る可能性があるのでコメントアウト推奨
            return;
        }

        // AudioBufferSourceNode を作成して再生
        const source = audioContext.createBufferSource();
        source.buffer = bufferToPlay;
        source.connect(audioContext.destination);
        // 再生時刻が過去になっていないかチェック（遅延対策）
        const startTime = Math.max(time, audioContext.currentTime);
        source.start(startTime);

        if (DEBUG_METRONOME) {
            // console.log(`Sound ${randomIndex + 1}.wav scheduled at: ${time.toFixed(3)}, started at: ${startTime.toFixed(3)}`);
        }
    }

    // スケジューラー本体
    function scheduler() {
        if (!isRunning || !audioContext) return;
        const currentTime = audioContext.currentTime;
        while (nextNoteTime < currentTime + SCHEDULE_AHEAD_TIME) {
            scheduleNote(nextNoteTime);
            nextNote();
        }
        // 次回のスケジューラー呼び出しをセット
        schedulerTimerID = window.setTimeout(scheduler, LOOKAHEAD);
    }

    // --- 制御関数 ---
    function start() {
        if (isRunning) return false;
        if (!audioContext) {
             console.error("AudioContext not initialized. Cannot start.");
             return false;
        }
         resumeAudioContextIfNeeded();
         if(audioContext.state === 'suspended') {
             console.warn("AudioContext is suspended. Cannot start metronome yet.");
             // alert("音声を再生するために、ページ上のどこかをクリックまたはタップしてください。");
             return false;
         }
         if (!soundsLoaded) {
             console.error("Metronome sounds not loaded yet. Cannot start.");
             // 必要ならここでロードを待つか、再試行
             // loadAllSounds().then(success => { if(success) start(); });
             return false;
         }

        isRunning = true;
        nextNoteTime = audioContext.currentTime + 0.05; // 開始タイミング調整
        if (DEBUG_METRONOME) console.log(`Metronome starting at BPM: ${currentBpm.toFixed(1)}`);
        scheduler(); // スケジューラを開始
        return true;
    }

    function stop() {
        if (!isRunning) return false;
        window.clearTimeout(schedulerTimerID);
        schedulerTimerID = null;
        isRunning = false;
        if (DEBUG_METRONOME) console.log("Metronome stopped.");
        return true;
    }


    // --- 公開インターフェース ---
    return {
        initialize,
        start,
        stop,
        setSpeed,      // 互換性のため
        setBpm,        // BPMを直接設定
        getCurrentBpm, // 現在のBPMを取得
        resumeAudioContextIfNeeded
    };
})();