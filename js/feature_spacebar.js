// ==================================================================
// feature_spacebar.js - スペース連打機能 (vRebuild 2.3 デフォルトOFF対応)
// ==================================================================
window.spacebarModule = (function() {
    'use strict';

    // --- 定数 ---
    const DEBUG_MODE = false;

    // --- 状態変数 ---
    let isFeatureActive = false; // デフォルトは false
    let isInChallengeMode = false;
    let requiredHits = 0;
    let currentHits = 0;

    // --- 依存関数 ---
    let baseGetElement = null;
    let baseRunFortune = null;

    // --- DOM要素キャッシュ ---
    const elements = {
        hpBarContainer: null, hpBarInner: null, hpCountSpan: null, hpTotalSpan: null, toggleCheckbox: null
    };

    // --- 初期化 ---
    function initialize(getElementFunc, runFortuneFunc) {
        console.log("Initializing Spacebar Module (v2.3)...");
        if (!getElementFunc || !runFortuneFunc) {
            console.error("Spacebar Init Failed: Missing dependencies (getElement or runFortune).");
            return false; // 初期化失敗
        }
        baseGetElement = getElementFunc;
        baseRunFortune = runFortuneFunc;

        try {
            elements.hpBarContainer = baseGetElement('hpBarContainer');
            elements.hpBarInner = baseGetElement('hpBarInner');
            elements.hpCountSpan = baseGetElement('hpCount');
            elements.hpTotalSpan = baseGetElement('hpTotal');
            elements.toggleCheckbox = baseGetElement('spacebarFeatureToggle');

            if (!elements.toggleCheckbox) {
                console.warn("Spacebar toggle checkbox ('spacebarFeatureToggle') missing. Feature will remain disabled.");
                isFeatureActive = false;
            } else {
                // HTMLのchecked属性を初期状態とする
                isFeatureActive = elements.toggleCheckbox.checked;
                console.log(`Initial spacebar state from checkbox: ${isFeatureActive}`);
                // イベントリスナーを設定
                elements.toggleCheckbox.removeEventListener('change', handleToggleChange); // 念のため既存を削除
                elements.toggleCheckbox.addEventListener('change', handleToggleChange);
            }

            if (!elements.hpBarContainer || !elements.hpBarInner || !elements.hpCountSpan || !elements.hpTotalSpan) {
                console.warn("HP bar elements (hpBarContainer, hpBarInner, hpCount, hpTotal) missing. HP bar will not display.");
            }

            hideHpBar(); // 初期状態では非表示
            console.log("--- Spacebar Module Initialized ---");
            return true; // 初期化成功
        } catch (error) {
            console.error("Spacebar initialization failed:", error);
            isFeatureActive = false; // エラー時は無効化
            if (elements.toggleCheckbox) {
                try {
                    elements.toggleCheckbox.disabled = true;
                    elements.toggleCheckbox.checked = false;
                } catch (e) { /* ignore */}
            }
            return false; // 初期化失敗
        }
    }

    // チェックボックス変更時のハンドラ
    function handleToggleChange() {
        if (!elements.toggleCheckbox) return;
        isFeatureActive = elements.toggleCheckbox.checked;
        console.log(`Spacebar feature toggled: ${isFeatureActive ? 'Active' : 'Inactive'}`);
        if (!isFeatureActive && isInChallengeMode) {
            console.log("Spacebar feature disabled during challenge. Resetting challenge.");
            resetChallenge(); // 機能OFF時にチャレンジ中ならリセット
        }
    }

    // スペースキー押下時の処理 (base.jsから呼ばれる)
    function handleHit() {
        if (!isInChallengeMode || !isFeatureActive) {
             // console.log(`Hit ignored: challenge=${isInChallengeMode}, active=${isFeatureActive}`);
             return false; // チャレンジ中でない、または機能OFFなら何もしない
        }
        try {
            currentHits++;
            if (DEBUG_MODE) console.log(`Hit registered: ${currentHits}/${requiredHits}`);
            updateHpBar(); // HPバー更新

            if (currentHits >= requiredHits) {
                console.log("Challenge complete!");
                const hitsTaken = currentHits; // 記録用
                resetChallenge(); // チャレンジ状態解除
                console.log(`Triggering next fortune after ${hitsTaken} hits.`);
                // 少し遅延させてから次の占いを実行
                setTimeout(() => {
                    try {
                         if (baseRunFortune) {
                             baseRunFortune(false); // isRetry=falseで通常実行
                         } else {
                             console.error("baseRunFortune function is not available to trigger next fortune.");
                         }
                    } catch (e) {
                        console.error("Error occurred during auto-running fortune after challenge completion:", e);
                    }
                }, 100); // 100ミリ秒の遅延
            }
            return true; // ヒット処理成功
        } catch (e) {
            console.error("Error processing spacebar hit:", e);
            resetChallenge(); // エラー発生時もリセット
            return true; // エラーでもキーイベントは処理済みとする
        }
    }

    // Enterキー押下時の処理 (base.jsから呼ばれる)
    function handleSkip() {
        if (!isInChallengeMode || !isFeatureActive) {
            // console.log(`Skip ignored: challenge=${isInChallengeMode}, active=${isFeatureActive}`);
            return false; // チャレンジ中でない、または機能OFFなら何もしない
        }
        console.log("Challenge skipped by user.");
        try {
            resetChallenge(); // チャレンジ状態解除
            console.log("Triggering next fortune after skip.");
            if (baseRunFortune) {
                baseRunFortune(false); // 次の占いを実行
            } else {
                console.error("baseRunFortune function is not available to trigger next fortune after skip.");
            }
            return true; // スキップ処理成功
        } catch (e) {
            console.error("Error occurred during skipping challenge:", e);
            resetChallenge(); // エラー発生時もリセット
             // エラーでも次の占いを試みる
             try { if (baseRunFortune) baseRunFortune(false); } catch {}
            return true; // エラーでもキーイベントは処理済みとする
        }
    }

    // チャレンジ開始 (base.jsから呼ばれる)
    function startChallenge(hits) {
        if (!isFeatureActive || typeof hits !== 'number' || !Number.isInteger(hits) || hits <= 0) {
            if (DEBUG_MODE && isFeatureActive) console.log(`Challenge skipped or invalid hits: ${hits}`);
            if (isInChallengeMode) resetChallenge(); // 無効な開始要求が来たら既存チャレンジはリセット
            return; // 機能OFFまたはヒット数が無効なら開始しない
        }
        console.log(`Starting spacebar challenge: ${hits} hits required.`);
        try {
            isInChallengeMode = true;
            requiredHits = hits;
            currentHits = 0;
            updateHpBar(); // HPバー初期化・表示
            if (elements.hpBarContainer) {
                elements.hpBarContainer.style.display = 'block'; // HPバー表示
            } else {
                console.warn("HP bar container missing, cannot display HP bar.");
            }
        } catch (e) {
            console.error("Error starting challenge:", e);
            resetChallenge(); // エラー時はリセット
        }
    }

    // チャレンジリセット (内部および base.js から呼ばれる)
    function resetChallenge() {
        if (!isInChallengeMode) return; // 既に解除済みなら何もしない
        if (DEBUG_MODE) console.log("Resetting spacebar challenge.");
        isInChallengeMode = false;
        requiredHits = 0;
        currentHits = 0;
        hideHpBar(); // HPバー非表示
    }

    // HPバー更新
    function updateHpBar() {
        if (!elements.hpBarContainer || !elements.hpBarInner || !elements.hpCountSpan || !elements.hpTotalSpan) {
            return; // HPバー要素がなければ何もしない
        }
        if (!isInChallengeMode) {
            hideHpBar(); return; // チャレンジ中でなければ非表示
        }
        try {
            const remainingHits = Math.max(0, requiredHits - currentHits);
            const percentage = requiredHits > 0 ? Math.min(100, Math.max(0, (currentHits / requiredHits) * 100)) : 0;

            elements.hpCountSpan.textContent = remainingHits;
            elements.hpTotalSpan.textContent = requiredHits;
            elements.hpBarInner.style.width = `${percentage}%`;

            if (elements.hpBarContainer.style.display === 'none') {
                elements.hpBarContainer.style.display = 'block';
            }
        } catch (e) {
            console.error("Error updating HP bar:", e);
            hideHpBar(); // エラー時は非表示
        }
    }

    // HPバー非表示
    function hideHpBar() {
        if (elements.hpBarContainer && elements.hpBarContainer.style.display !== 'none') {
            try {
                elements.hpBarContainer.style.display = 'none';
            } catch (e) {
                console.error("Error hiding HP bar:", e);
            }
        }
    }

    // --- 公開インターフェース ---
    return {
        initialize: initialize,       // 初期化
        startChallenge: startChallenge, // チャレンジ開始
        resetChallenge: resetChallenge, // チャレンジリセット
        handleHit: handleHit,         // スペースキー処理
        handleSkip: handleSkip          // Enterキー処理
    };
})();