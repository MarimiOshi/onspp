// ==================================================================
// feature_counter.js - メンバー別カウンター機能 (vRebuild 2.16.11 相当)
// ==================================================================

// グローバルスコープに関数を公開するためのラッパー
window.counterModule = (function() {
    'use strict';

    // --- グローバル変数 (モジュールスコープ) ---
    const COUNTER_STORAGE_PREFIX = 'niziuCounter_'; // ローカルストレージのキー接頭辞
    let isDecreaseMode = false; // 減らすモードフラグ

    // --- HTML要素参照 (初期化時に取得) ---
    let counterGrid = null;
    let decreaseModeButton = null;
    // 各メンバーのカウンター要素を格納するオブジェクト
    // { 'メンバー名': { element: div要素, countElement: span要素, count: 数値 } }
    const counterItems = {};
    let configMembers = []; // config.jsのmembersを保持

    // --- ローカルストレージ関連関数 ---

    // ページ読み込み時にローカルストレージからカウントを読み込む
    function loadCounts() {
        console.log("Loading counts from local storage...");
        try {
            configMembers.forEach(member => {
                if (!member?.name) {
                    console.warn("Skipping member data with no name:", member);
                    return;
                }
                const memberName = member.name;

                if (counterItems[memberName] && counterItems[memberName].countElement) {
                    let count = 0;
                    try {
                        const storedCount = localStorage.getItem(COUNTER_STORAGE_PREFIX + memberName);
                        if (storedCount !== null && storedCount !== undefined) {
                            const parsedCount = parseInt(storedCount, 10);
                            if (!isNaN(parsedCount)) {
                                count = parsedCount;
                            } else {
                                console.warn(`Invalid stored count for ${memberName}: "${storedCount}". Using default 0.`);
                            }
                        }
                    } catch (storageError) {
                        console.error(`Error reading localStorage for ${memberName}:`, storageError);
                    }
                    counterItems[memberName].count = count;
                    counterItems[memberName].countElement.textContent = count;
                } else {
                     // console.warn(`Counter item or element not ready for ${memberName} during loadCounts.`);
                }
            });
            console.log("Counts loading process finished.");
        } catch (error) {
            console.error("Error during loadCounts:", error);
        }
    }

    // 指定されたメンバーのカウントをローカルストレージに保存
    function saveCount(memberName, count) {
        if (typeof memberName !== 'string' || memberName === '') {
            console.error("saveCount: Invalid memberName provided."); return;
        }
        if (typeof count !== 'number' || isNaN(count)) {
            console.error(`saveCount: Invalid count provided for ${memberName}:`, count); return;
        }

        try {
            localStorage.setItem(COUNTER_STORAGE_PREFIX + memberName, count.toString());
        } catch (error) {
            console.error(`Failed to save count for ${memberName} to localStorage:`, error);
            // alert(`カウンターの保存に失敗しました: ${error.message}`);
        }
    }

    // --- イベントハンドラ ---

    // カウンターアイテムクリック時の処理
    function handleCounterClick(event) {
        const memberElement = event?.currentTarget;
        const memberName = memberElement?.dataset?.memberName;

        if (!memberName || !counterItems[memberName]) {
            console.error("Counter click: Member data not found for the clicked element."); return;
        }

        const memberData = counterItems[memberName];
        if (!memberData.countElement) {
            console.error("Counter click: Count display element not found for member:", memberName); return;
        }

        try {
            let currentCount = memberData.count;
            let newCount;

            if (isDecreaseMode) {
                if (currentCount > 0) {
                    newCount = currentCount - 1;
                } else {
                    return; // 0の場合は何もしない
                }
            } else {
                newCount = currentCount + 1;
            }

            memberData.count = newCount;
            memberData.countElement.textContent = newCount;
            saveCount(memberName, newCount);

            // クリック時の視覚効果
            if (memberElement) {
                memberElement.classList.add('clicked');
                setTimeout(() => { memberElement?.classList.remove('clicked'); }, 150);
            }
        } catch (error) {
            console.error(`Error handling counter click for ${memberName}:`, error);
        }
    }

    // 減らすモード切り替えボタンクリック時の処理
    function toggleDecreaseMode() {
        try {
            isDecreaseMode = !isDecreaseMode;
            if (decreaseModeButton) {
                decreaseModeButton.textContent = `減らすモード ${isDecreaseMode ? 'ON' : 'OFF'}`;
                decreaseModeButton.classList.toggle('decrease-mode-active', isDecreaseMode);
                console.log(`Decrease mode toggled: ${isDecreaseMode ? 'ON' : 'OFF'}`);
            } else {
                console.warn("Decrease mode button element not found when toggling.");
            }
        } catch (error) {
            console.error("Error toggling decrease mode:", error);
        }
    }

    // --- カウンター要素生成・初期化関数 ---
    function initializeCounters(membersData, getElementFunc) {
        console.log("--- Counter Initialization Start ---");
        if (!membersData || !getElementFunc) {
             console.error("Counter initialization failed: Missing membersData or getElementFunc.");
             return false;
        }
        configMembers = membersData; // membersデータを保持

        try {
            // 必要なHTML要素を取得 (getElementFunc経由で)
            // HTML側で <div class="counter-grid"> に id="counterGrid" を追加した想定
            counterGrid = getElementFunc('counterGrid');
            decreaseModeButton = getElementFunc('decreaseModeButton');

            if (!counterGrid) {
                throw new Error("Element with ID 'counterGrid' not found. Counter cannot be initialized.");
            }

            counterGrid.innerHTML = ''; // 既存の内容をクリア
            Object.keys(counterItems).forEach(key => delete counterItems[key]); // 内部データもクリア

            configMembers.forEach(member => {
                try {
                    if (!member?.name) {
                        console.warn("Skipping invalid member data during counter creation:", member); return;
                    }
                    const memberName = member.name;

                    const item = document.createElement('div');
                    item.className = 'counter-item';
                    item.dataset.memberName = memberName; // data属性にメンバー名を設定
                    item.tabIndex = 0; // フォーカス可能にする (アクセシビリティ)

                    const img = document.createElement('img');
                    const imgPath = `images/count/${memberName}.jpg`; // カウンター用画像パス
                    img.src = imgPath;
                    img.alt = memberName;
                    img.loading = 'lazy'; // 遅延読み込み
                    img.onerror = (e) => { // 画像読み込み失敗時の処理
                        console.warn(`Failed to load counter image: ${imgPath}.`);
                        if(e.target) e.target.src = 'placeholder.png'; // 代替画像
                        e.target.classList.add('image-error'); // エラー用スタイル
                    };

                    const nameSpan = document.createElement('span');
                    nameSpan.className = 'counter-member-name';
                    nameSpan.textContent = memberName;

                    const countSpan = document.createElement('span');
                    countSpan.className = 'count-number';
                    countSpan.textContent = '0'; // 初期値

                    // 要素を組み立て
                    item.appendChild(img);
                    item.appendChild(nameSpan);
                    item.appendChild(countSpan);

                    // イベントリスナー設定
                    item.addEventListener('click', handleCounterClick);
                    item.addEventListener('keydown', (e) => { // Enterキーでも反応するように
                        if (e.key === 'Enter') {
                            handleCounterClick(e);
                        }
                    });


                    counterGrid.appendChild(item); // グリッドに追加

                    // 内部データとして保持
                    counterItems[memberName] = {
                        element: item,
                        countElement: countSpan,
                        count: 0 // 初期カウントは0
                    };
                } catch (loopError) {
                    console.error(`Error creating counter item for member:`, member, loopError);
                }
            });

            // 減らすモードボタンの初期化
            if (decreaseModeButton) {
                decreaseModeButton.addEventListener('click', toggleDecreaseMode);
                // 現在のモードに合わせてボタン表示を初期化
                decreaseModeButton.textContent = `減らすモード ${isDecreaseMode ? 'ON' : 'OFF'}`;
                decreaseModeButton.classList.toggle('decrease-mode-active', isDecreaseMode);
            }
            else {
                console.warn("Decrease mode button element ('decreaseModeButton') not found. Toggle functionality will be unavailable.");
            }

            // ローカルストレージから保存されたカウントを読み込む
            loadCounts();

            console.log("--- Counter Initialization Complete ---");
            return true; // 初期化成功

        } catch (error) {
            console.error("Counter initialization failed:", error);
            if (counterGrid) { // エラーメッセージを表示試行
                try {
                    counterGrid.innerHTML = `<p class="error-message">カウンター表示エラー: ${error.message}</p>`;
                } catch (displayError) {
                    console.error("Failed to display counter initialization error message:", displayError);
                }
            }
            // alert(`カウンター機能の初期化に失敗しました: ${error.message}`); // 必要ならアラート
            return false; // 初期化失敗
        }
    }

    // --- グローバルスコープ関数 (外部からの呼び出し用) ---

    /**
     * 指定されたメンバーのカウントを1増やし、表示とストレージを更新する。
     * base.js や imepureModule から呼び出される。
     * @param {string} memberName カウントを増やすメンバーの名前
     */
    function incrementCount(memberName) {
        if (!counterItems || typeof counterItems !== 'object') {
            console.error("Counter items not initialized yet. Cannot increment count."); return;
        }
        if (typeof memberName !== 'string' || !counterItems[memberName]) {
            console.warn(`Member "${memberName}" not found in counterItems. Cannot increment count.`); return;
        }

        const memberData = counterItems[memberName];
        if (memberData && memberData.countElement) {
            try {
                const newCount = (memberData.count ?? 0) + 1;
                memberData.count = newCount;
                memberData.countElement.textContent = newCount;
                saveCount(memberName, newCount);
                console.log(`Count for ${memberName} incremented to ${newCount} via global function.`);

                // 加算時にもクリック同様の視覚効果を適用
                if (memberData.element) {
                    memberData.element.classList.add('clicked');
                    setTimeout(() => { memberData.element?.classList.remove('clicked'); }, 150);
                }
            } catch (error) {
                console.error(`Error incrementing count for ${memberName} via global function:`, error);
            }
        } else {
            console.warn(`Counter element missing for ${memberName} during global increment. Cannot update display.`);
        }
    }

    // --- 公開インターフェース ---
    return {
        initialize: initializeCounters, // base.jsから呼び出される初期化関数
        incrementCount: incrementCount // base.js, imepure.jsから呼び出される関数
    };
})(); // IIFE 即時実行