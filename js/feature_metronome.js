// ==================================================================
// feature_metronome.js - しこしこメトロノーム機能 (ランダム音源・速度調整版)
// ==================================================================

window.metronomeModule = (function() {
    'use strict';

    // --- 定数 ---
    // ★★★ 5種類の音源ファイルパスを配列で定義 ★★★
    const SOUND_FILE_PATHS = [
        'sounds/click1.wav',
        'sounds/click2.wav',
        'sounds/click3.wav',
        'sounds/click4.wav',
        'sounds/click5.wav',
        'sounds/click6.wav',
        'sounds/click7.wav',
        'sounds/click8.wav',
        // 必要に応じてファイルパスを追加・変更してください
    ];
    const DEBUG_MODE = false;

    // --- 状態変数 ---
    let audioContext = null;
    // ★★★ デコードされた音源バッファを配列で保持 ★★★
    let soundBuffers = [];
    let soundsLoadedCount = 0; // 読み込み完了した音源の数
    let allSoundsLoaded = false; // 全ての音源読み込み完了フラグ
    let schedulerId = null;
    let currentSpeed = 0;
    let intervalMs = Infinity;

    // --- 初期化 ---
    function initialize() {
        console.log("Initializing Metronome Module (Random Sounds & Faster Tempo)...");
        try {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            if (window.AudioContext) {
                audioContext = new AudioContext();
            } else {
                console.error("Web Audio API is not supported. Metronome disabled.");
                return false;
            }
            // ★★★ 全ての音源読み込みを開始 ★★★
            loadAllSounds();

            console.log("--- Metronome Module Initialized ---");
            return true;
        } catch (error) {
            console.error("Metronome initialization failed:", error);
            audioContext = null;
            return false;
        }
    }

    // ユーザーインタラクション後に AudioContext を再開
    function resumeAudioContext() {
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                // console.log('AudioContext resumed.'); // デバッグ時以外は不要かも
            }).catch(e => {
                console.error('Error resuming AudioContext:', e);
            });
        }
    }

    // ★★★ 指定されたパスの音源を読み込みデコードする非同期関数 ★★★
    async function loadSound(filePath) {
        if (!audioContext) return null; // AudioContext がなければ失敗
        try {
            if (DEBUG_MODE) console.log(`Loading sound: ${filePath}`);
            const response = await fetch(filePath);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status} for ${filePath}`);
            const arrayBuffer = await response.arrayBuffer();
            const decodedBuffer = await audioContext.decodeAudioData(arrayBuffer);
             if (DEBUG_MODE) console.log(`Sound loaded and decoded: ${filePath}`);
            return decodedBuffer;
        } catch (error) {
            console.error(`Error loading or decoding sound (${filePath}):`, error);
            return null; // 失敗したらnullを返す
        }
    }

    // ★★★ 全ての音源を読み込む関数 ★★★
    async function loadAllSounds() {
        if (!audioContext || !SOUND_FILE_PATHS || SOUND_FILE_PATHS.length === 0) {
            console.error("Cannot load sounds: No AudioContext or sound file paths defined.");
            return;
        }
        console.log(`Loading ${SOUND_FILE_PATHS.length} sound(s)...`);
        allSoundsLoaded = false;
        soundsLoadedCount = 0;
        soundBuffers = []; // バッファ配列を初期化

        // Promise.allを使って並列読み込み
        const loadPromises = SOUND_FILE_PATHS.map(filePath => loadSound(filePath));

        try {
            const loadedBuffers = await Promise.all(loadPromises);
            // 読み込みに成功したバッファだけを格納
            soundBuffers = loadedBuffers.filter(buffer => buffer !== null);
            soundsLoadedCount = soundBuffers.length;

            if (soundsLoadedCount === SOUND_FILE_PATHS.length) {
                allSoundsLoaded = true;
                console.log("All sounds loaded successfully.");
            } else {
                console.warn(`Failed to load ${SOUND_FILE_PATHS.length - soundsLoadedCount} sound(s). Metronome will use available sounds.`);
                // 一部しか読み込めなくても、利用可能な音で動作させる
                allSoundsLoaded = soundsLoadedCount > 0; // 1つでも読み込めたら true とする
            }
            // 読み込み後に再生が必要な場合の処理 (必要なら)
             // if (currentSpeed > 0 && allSoundsLoaded) {
             //     setSpeed(currentSpeed); // 音がロードされたので再生再開
             // }
        } catch (error) {
             console.error("Error during loading multiple sounds:", error);
             allSoundsLoaded = false;
        }
    }

    // ★★★ ランダムな音を選択して再生する関数 ★★★
    function playSound() {
        resumeAudioContext(); // 再生前に再開試行

        // 再生可能な音があり、Contextが存在する場合のみ再生
        if (!audioContext || !allSoundsLoaded || soundBuffers.length === 0) {
            if (DEBUG_MODE && soundBuffers.length === 0) console.warn("playSound called, but no sounds are loaded/available.");
            else if (DEBUG_MODE) console.warn("playSound called, but audio cannot be played.");
            return;
        }

        try {
            // ランダムにバッファを選択
            const randomIndex = Math.floor(Math.random() * soundBuffers.length);
            const bufferToPlay = soundBuffers[randomIndex];

            const source = audioContext.createBufferSource();
            source.buffer = bufferToPlay;
            source.connect(audioContext.destination);
            source.start(0);
        } catch (e) {
             console.error("Error playing sound:", e);
        }
    }

    // メトロノームのスケジューラーを開始/更新
    function startScheduler() {
        stopScheduler();
        if (isFinite(intervalMs) && intervalMs > 0 && allSoundsLoaded) { // 音が読み込まれてから開始
            if (DEBUG_MODE) console.log(`Starting scheduler with interval: ${intervalMs}ms`);
            playSound(); // 初回再生
            schedulerId = setInterval(playSound, intervalMs);
        } else {
             if (DEBUG_MODE && !allSoundsLoaded) console.log("Scheduler not started yet (sounds loading).");
             else if (DEBUG_MODE) console.log("Scheduler not started (interval invalid or stopped).");
        }
    }

    // スケジューラー停止
    function stopScheduler() {
        if (schedulerId !== null) {
            clearInterval(schedulerId);
            schedulerId = null;
            if (DEBUG_MODE) console.log("Scheduler stopped.");
        }
    }

    // 速度設定 (外部から呼ばれる)
    // ★★★ intervalMs の値を調整して全体的に速くする ★★★
    function setSpeed(speedValue) {
        resumeAudioContext(); // 再開試行

        if (typeof speedValue !== 'number' || speedValue < 0 || speedValue > 4) {
            console.warn(`Invalid speed value received: ${speedValue}. Stopping metronome.`);
            stop();
            return;
        }

        currentSpeed = speedValue;

        // 速度に応じて再生間隔(ms)を設定 (全体的に短く調整)
        switch (currentSpeed) {
            case 0: intervalMs = Infinity; break; // 停止
            case 1: intervalMs = 500; break;  // 75 BPM相当 (旧1000ms)
            case 2: intervalMs = 400; break;  // 100 BPM相当 (旧750ms)
            case 3: intervalMs = 280; break;  // 150 BPM相当 (旧500ms)
            case 4: intervalMs = 240; break;  // 240 BPM相当 (旧350ms)
            default: intervalMs = Infinity; break;
        }

        console.log(`Metronome speed set to ${currentSpeed}, interval: ${isFinite(intervalMs) ? intervalMs + 'ms' : 'Stopped'}`);

        startScheduler(); // 新しい間隔でスケジューラー開始/更新
    }

    // 完全停止
    function stop() {
        console.log("Stopping metronome completely.");
        currentSpeed = 0;
        intervalMs = Infinity;
        stopScheduler();
    }

    // --- 公開インターフェース ---
    return {
        initialize: initialize,
        setSpeed: setSpeed,
        stop: stop,
        // resumeAudioContext: resumeAudioContext // 必要なら外部公開
    };
})();