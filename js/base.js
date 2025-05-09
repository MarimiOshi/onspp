// ==================================================================
// base.js - アプリケーション全体の制御 (vRebuild 2.16.11 Fixed + Metronome + CheckConfig Fixed + Sticker v2)
// ==================================================================
window.onspApp = {}; // グローバルスコープ用

(function() {
    'use strict';

    // --- 定数 ---
    const MEMBER_QUOTES_CSV_PATH = 'data/ONSP_セリフ.csv';
    const FORTUNES_CSV_PATH = 'data/ONSP_結果.csv';
    const MAX_IMAGE_LOAD_RETRIES = 3;
    const MAX_FILTER_RETRIES = 10;
    const DEBUG_MODE = false;
    const QUOTE_TAG_DELIMITER = '|';

    // --- 状態変数 ---
    let fortunesData = [];
    let memberQuotes = {};
    let memberQuotesWithTags = {};
    let imageTags = {};
    let allAvailableTags = new Set();
    let currentDisplayedMemberName = null;
    let currentDisplayedMemberColor = null;
    let lastDisplayedImageInfo = { memberName: null, relativePath: null };
    let imageLoadRetryCount = 0;
    let canRunFortune = false;
    let isTaggingMode = false;
    let taggingImages = [];
    let currentTaggingIndex = 0;
    let selectedFilterTags = [];
    let tagSearchMode = 'AND';
    let selectedImportFile = null;
    let weakPointImages = new Set();
    let selectedStickerPath = null;
    let stickerBaseHue = 0;

    // --- DOM要素キャッシュ ---
    const elements = {};

    // --- 初期化処理 ---
    async function initializeApp() {
        console.log("--- App Init Start (base.js vRebuild 2.16.11 Fixed + Metronome + CheckConfig Fixed + Sticker v2) ---");
        let initializationSuccess = true;
        try {
            console.log("1: Getting DOM elements...");
            getAllElements();
            validateElements();

            console.log("2: Setting initial UI states...");
            setInitialUIStates();

            console.log("3: Checking config...");
            checkConfig();
            initializeStickerBaseHue();

            console.log("4: Loading async data (Tags, CSV, WeakPoints)...");
            const tagStorageKey = typeof TAG_STORAGE_KEY !== 'undefined' ? TAG_STORAGE_KEY : 'onspImageTags_fallback';
            const weakPointStorageKey = typeof WEAK_POINT_STORAGE_KEY !== 'undefined' ? WEAK_POINT_STORAGE_KEY : 'onspWeakPoints_fallback';
            const playerInfoKey = typeof LS_PLAYER_INFO_KEY !== 'undefined' ? LS_PLAYER_INFO_KEY : 'imepurePlayerInfo_fallback';

            await Promise.all([
                loadTagsFromLocalStorage(tagStorageKey),
                loadWeakPoints(weakPointStorageKey),
                loadCsvData()
            ]);
            console.log("Async data loading complete.");

            console.log("5: Initializing UI components (post-data load)...");
            populateMemberSliders();
            populateGalleryFilters();
            initializeUIComponents();
            initializeStickerFeature();

            console.log("6: Attaching event listeners...");
            attachEventListeners();

            console.log("7: Initializing other feature modules...");
            const getElement = (id) => elements[id];
            const showNotification = showEjaculationNotification;
            const runFortuneFunc = runFortune;
            const applyTheme = applyMemberColorTheme;
            const getBaseImageTags = () => imageTags;
            const getAllImageTagsList = () => Array.from(allAvailableTags);
            const playerInfoData = JSON.parse(localStorage.getItem(playerInfoKey) || '{"name":"あなた", "age":"", "memo":""}');

            if (window.counterModule?.initialize) {
                 if (!window.counterModule.initialize(members, getElement)) console.error("Counter module initialization failed.");
                 else console.log("Counter module initialized.");
            } else console.warn("Counter module or its initialize function not found.");

             if (window.spacebarModule?.initialize) {
                  if (!window.spacebarModule.initialize(getElement, runFortuneFunc)) console.error("Spacebar module initialization failed.");
                  else console.log("Spacebar module initialized.");
             } else console.warn("Spacebar module or its initialize function not found.");

            if (window.imepureModule?.initialize) {
                console.log("Initializing imepureModule...");
                const imepureDeps = {
                    getElement, members: members ?? [], impurePresets: impurePresets ?? {}, situationPresets: situationPresets ?? [],
                    progressTagChoices: progressTagChoices ?? {}, progressTagSfx: progressTagSfx ?? {},
                    imageTags: getBaseImageTags, allImageTags: getAllImageTagsList,
                    incrementCounter: window.counterModule?.incrementCount,
                    showNotification, applyTheme, playerInfo: playerInfoData,
                };
                if (DEBUG_MODE) console.log("Imepure dependencies:", imepureDeps);
                if (!window.imepureModule.initialize(imepureDeps)) console.error("Imepure module initialization failed.");
                else console.log("Imepure module initialized.");
            } else console.warn("Imepure module or its initialize function not found.");

            if (window.metronomeModule?.initialize) {
                if (!window.metronomeModule.initialize()) console.error("Metronome module initialization failed.");
                else console.log("Metronome module initialized.");
            } else console.warn("Metronome module or its initialize function not found.");


            console.log("8: Setting initial tab and enabling UI...");
            switchTab('#fortuneSection');
            canRunFortune = true;
            if (elements.fortuneButton) elements.fortuneButton.disabled = false;
            elements.tabButtons?.forEach(btn => btn.disabled = false);

            console.log("--- App Init Complete ---");
            document.dispatchEvent(new CustomEvent('appInitialized', { detail: { success: initializationSuccess } }));
            console.log("Dispatched 'appInitialized' event.");

        } catch (error) {
            console.error("!CRITICAL INITIALIZATION ERROR!:", error);
            initializationSuccess = false;
            displayCriticalError(error);
            try {
                document.dispatchEvent(new CustomEvent('appInitialized', { detail: { success: initializationSuccess } }));
            } catch (e) { /* ignore */ }
            if (window.metronomeModule?.stop) window.metronomeModule.stop();
            deselectSticker();
        } finally {
            console.log(`Initialization process finished. Success: ${initializationSuccess}`);
        }
    }

    // --- DOM要素取得・検証 (変更なし) ---
    function getAllElements() {
        const elementIds = [
            'memberName', 'memberImage', 'memberQuote', 'fortuneResult', 'quoteTagsContainer',
            'imageTagsContainer', 'fortuneButton', 'ejaculateButton', 'accordionToggle',
            'accordionContent', 'memberSliderPlaceholder', 'pulseBrightnessSlider', 'pulseBrightnessValue',
            'spacebarFeatureToggle', 'hpBarContainer', 'hpBarInner', 'hpCount', 'hpTotal',
            'tagFilterButtonsContainer', 'tagSearchAnd', 'tagSearchOr', 'clearTagFilterButton',
            'tagFilterStatus', 'startTaggingButton', 'taggingModeSection', 'taggingImageContainer',
            'taggingImage', 'taggingImageInfo', 'tagInput', 'suggestedTagsContainer',
            'currentTagsContainer', 'currentTagsDisplay',
            'prevTagImageButton', 'saveTagsButton', 'skipTagImageButton',
            'nextTagImageButton', 'taggingProgress', 'exitTaggingButton', 'exportTagsButton',
            'importTagFile', 'importTagsButton', 'importStatus',
            'imepureCharacterSelect', 'imepureSituationSelect', 'imepureOpenSettingsButton',
            'imepureChatLog', 'imepureUserInput', 'imepureSendButton', 'imepureGenerateButton',
            'imepureEjaculateButton', 'imepureSettingsModal', 'imepureCloseModalButton',
            'modalCharacterName', 'modalCharacterAge', 'modalFirstPerson', 'modalDialect',
            'modalRelationship', 'modalHeartEmoji', 'modalPersonality', 'modalAppearance',
            'modalSpeechStyle', 'modalEmotionExpressionDesc', 'modalSexPreferences',
            'imepureSaveSettingsButton', 'playerInfoName', 'playerInfoAge', 'playerInfoMemo',
            'ejaculationNotification', 'decreaseModeButton', 'counterGrid',
            'imepureTimeline', 'imepureTagChoices', 'imepureTrashArea', 'imepureSfxArea',
            'galleryMemberFilter', 'galleryTypeFilter', 'galleryWeakPointFilter',
            'galleryRefreshButton', 'galleryGrid',
            'fortuneWeakPointButton',
            'fortuneDisplayArea', 'stickerSection', 'stickerChoiceContainer', 'stickerCursorPreview'
        ];
        elementIds.forEach(id => { elements[id] = document.getElementById(id); });
        elements.tabButtons = document.querySelectorAll('.tab-button');
        elements.tabContents = document.querySelectorAll('.tab-content');
        elements.noTagsMessage = document.querySelector('#tagFilterButtonsContainer .no-tags-message');
        elements.memberSlidersContainer = document.querySelector('.member-sliders');
        elements.memberWeightSliders = null;
        elements.timelinePlaceholder = document.querySelector('#imepureTimeline .timeline-placeholder');
        elements.galleryLoading = document.querySelector('#galleryGrid .gallery-loading');
        elements.stickerLoading = document.querySelector('#stickerChoiceContainer .sticker-loading');
    }
    function validateElements() {
        const requiredElementIds = [
            'fortuneButton', 'memberName', 'memberImage', 'memberQuote', 'fortuneResult', 'counterGrid',
            'imepureChatLog', 'imepureUserInput', 'imepureSendButton', 'imepureGenerateButton',
            'imageTagsContainer', 'imepureCharacterSelect', 'imepureTimeline', 'imepureTagChoices',
            'imepureTrashArea', 'imepureSfxArea', 'galleryMemberFilter', 'galleryTypeFilter',
            'galleryWeakPointFilter', 'galleryRefreshButton', 'galleryGrid', 'fortuneWeakPointButton',
            'fortuneDisplayArea', 'stickerSection', 'stickerChoiceContainer', 'stickerCursorPreview'
        ];
        const requiredSelectors = { tabButtons: '.tab-button', tabContents: '.tab-content' };
        let missingElements = [];
        requiredElementIds.forEach(id => { if (!elements[id]) missingElements.push(`#${id}`); });
        Object.entries(requiredSelectors).forEach(([key, selector]) => { if (!elements[key] || (elements[key] instanceof NodeList && elements[key].length === 0)) missingElements.push(selector); });
        if (missingElements.length > 0) throw new Error(`Fatal: Required elements missing: ${missingElements.join(', ')}`);
        const optionalElementIds = [
            'tagFilterButtonsContainer', 'startTaggingButton', 'spacebarFeatureToggle', 'imepureSettingsModal',
            'importTagFile', 'importTagsButton', 'suggestedTagsContainer', 'timelinePlaceholder',
            'galleryLoading', 'decreaseModeButton', 'currentTagsDisplay', 'stickerLoading'
         ];
        optionalElementIds.forEach(id => { if (!elements[id]) console.warn(`Optional element missing: #${id}`); });
    }

    // --- 初期UI状態設定 (変更なし) ---
    function setInitialUIStates() {
        if (elements.fortuneButton) elements.fortuneButton.disabled = true;
        if (elements.ejaculateButton) elements.ejaculateButton.disabled = true;
        if (elements.imepureEjaculateButton) elements.imepureEjaculateButton.disabled = true;
        if (elements.imepureOpenSettingsButton) elements.imepureOpenSettingsButton.disabled = true;
        if (elements.imepureSendButton) elements.imepureSendButton.disabled = true;
        if (elements.imepureGenerateButton) elements.imepureGenerateButton.disabled = true;
        if (elements.importTagsButton) elements.importTagsButton.disabled = true;
        elements.tabButtons?.forEach(btn => btn.disabled = true);
        if (elements.imepureUserInput) elements.imepureUserInput.disabled = true;
        if (elements.imepureSituationSelect) elements.imepureSituationSelect.disabled = true;
        if (elements.memberImage) elements.memberImage.src = 'placeholder.png';
        if (elements.hpBarContainer) elements.hpBarContainer.style.display = 'none';
        if (elements.taggingModeSection) elements.taggingModeSection.style.display = 'none';
        if (elements.imageTagsContainer) elements.imageTagsContainer.style.display = 'none';
        if (elements.quoteTagsContainer) elements.quoteTagsContainer.style.display = 'none';
        if (elements.fortuneWeakPointButton) elements.fortuneWeakPointButton.style.display = 'none';
        if (elements.stickerCursorPreview) elements.stickerCursorPreview.style.display = 'none';
        if (elements.fortuneDisplayArea) elements.fortuneDisplayArea.classList.remove('sticker-cursor-active');
        if (elements.stickerSection) elements.stickerSection.style.display = 'none'; // Initially hide sticker section
    }

    // --- config.js 内容チェック (変更なし) ---
    function checkConfig() {
        if (typeof members === 'undefined' || !Array.isArray(members) || members.length === 0) throw new Error("Config Error: `members` array is missing/empty.");
        members.forEach((member, index) => { if (!member || typeof member.name !== 'string' || !member.imageFolders || typeof member.imageFolders !== 'object' || typeof member.color !== 'string') console.warn(`Config Warn: Invalid structure for member at index ${index}:`, member); });
        if (typeof impurePresets !== 'object' || impurePresets === null) console.warn("Config Warn:`impurePresets` missing/invalid.");
        if (typeof situationPresets === 'undefined' || !Array.isArray(situationPresets)) console.warn("Config Warn:`situationPresets` missing/invalid.");
        if (typeof suggestedTagsCategorized !== 'object' || suggestedTagsCategorized === null) console.warn("Config Warn:`suggestedTagsCategorized` missing/invalid.");
        if (typeof progressTagChoices !== 'object' || progressTagChoices === null || Object.keys(progressTagChoices).length === 0) console.warn("Config Warn: `progressTagChoices` missing/empty.");
        if (typeof progressTagSfx !== 'object' || progressTagSfx === null) console.warn("Config Warn: `progressTagSfx` missing/invalid.");
        if (typeof stickerImagePaths === 'undefined' || !Array.isArray(stickerImagePaths) || stickerImagePaths.length === 0) console.warn("Config Warn: `stickerImagePaths` is missing or empty in config.js.");
        if (typeof STICKER_BASE_COLOR_HEX === 'undefined' || typeof STICKER_BASE_COLOR_HEX !== 'string' || !/^#([0-9A-F]{3}){1,2}$/i.test(STICKER_BASE_COLOR_HEX)) console.warn("Config Warn: `STICKER_BASE_COLOR_HEX` is missing or invalid in config.js. Using default red.");
    }

    // --- 致命的エラー表示 (変更なし) ---
    function displayCriticalError(error) { const body = document.body; if (body) { body.innerHTML = `<div class="tab-container" style="display:none;"></div><div class="tab-content active" style="display:block; background-color:#fff; box-shadow:none; border-radius:8px; margin-top:20px; padding: 20px;"><h1>致命的なエラー</h1><p class="error-message">初期化失敗。<br>詳細:${error.message}<br>(ファイルパスや設定、HTMLのID/クラス名を確認してください。開発者ツール(F12)のコンソールに詳細なエラーが出ている可能性があります。)</p></div>`; body.className = ''; body.style.backgroundColor = '#e9ecef'; } }

    // --- データ読み込み (変更なし) ---
    async function fetchCsv(filePath) { if (DEBUG_MODE) console.log(`Fetch:${filePath}`); try { const r=await fetch(filePath,{cache:"no-store"}); if (!r.ok) throw new Error(`Fetch ${filePath} fail:${r.status}`); const t=await r.text(); if(!t) return[]; const c=t.startsWith('\uFEFF')?t.substring(1):t; return c.split(/\r?\n/).map(l=>l.trim()).filter(l=>l); } catch (e) { console.error(`CSV load err(${filePath}):`,e); throw e; } }
    async function loadMemberQuotesData() { try { const lines = await fetchCsv(MEMBER_QUOTES_CSV_PATH); if (lines.length <= 1) { console.warn("No quote data."); return; } memberQuotes = {}; memberQuotesWithTags = {}; lines.slice(1).forEach((line, index) => { try { const firstCommaIndex = line.indexOf(','); const secondCommaIndex = line.indexOf(',', firstCommaIndex + 1); if (firstCommaIndex === -1 || secondCommaIndex === -1) { if (DEBUG_MODE) console.warn(`Skipping quote line ${index + 2}: Not enough commas.`); return; } const name = line.substring(0, firstCommaIndex).trim(); const quoteTextRaw = line.substring(firstCommaIndex + 1, secondCommaIndex).trim(); const quoteText = quoteTextRaw.startsWith('"') && quoteTextRaw.endsWith('"') ? quoteTextRaw.slice(1, -1).replace(/""/g, '"') : quoteTextRaw; const tagsString = line.substring(secondCommaIndex + 1).trim(); const tags = tagsString ? tagsString.split(QUOTE_TAG_DELIMITER).map(tag => tag.trim()).filter(tag => tag) : []; if (name && quoteText) { if (!memberQuotesWithTags[name]) memberQuotesWithTags[name] = []; memberQuotesWithTags[name].push({ text: quoteText, tags: tags }); } else { if (DEBUG_MODE) console.warn(`Skipping quote line ${index + 2}: Name or text missing.`); } } catch (parseError) { console.error(`Error parsing quote line ${index + 2}: "${line}"`, parseError); } }); if (DEBUG_MODE) console.log("Member quotes loaded:", memberQuotesWithTags); } catch (error) { console.error("Load member quotes fail:", error); if (elements.memberQuote) elements.memberQuote.textContent = "セリフ読込エラー"; } }
    async function loadFortunesData(){try{const l=await fetchCsv(FORTUNES_CSV_PATH);if(l.length<=1){console.warn("No fortune data.");fortunesData=[{text:"データなし",speed:1,hitsRequired:1}];return;}fortunesData=l.slice(1).map((ln,i)=>{try{const p=ln.split(',');const txt=p[0]?.trim()||"不明";let s=1,h=1;if(p[1]){const ps=parseInt(p[1].trim(),10);if(!isNaN(ps)&&ps>=0&&ps<=4)s=ps;else if(DEBUG_MODE)console.warn(`Invalid speed L${i+2}`);}if(p[2]){const ph=parseInt(p[2].trim(),10);if(!isNaN(ph)&&ph>=1)h=ph;else if(DEBUG_MODE)console.warn(`Invalid hits L${i+2}`);}if(s===0)h=0;return{text:txt,speed:s,hitsRequired:h};}catch(e){console.error(`Fortune parse L${i+2}:`,e);return{text:"パースエラー",speed:1,hitsRequired:1};}});if(fortunesData.length===0)fortunesData=[{text:"データなし",speed:1,hitsRequired:1}];if(DEBUG_MODE)console.log("Fortunes loaded:",fortunesData);}catch(e){console.error("Load fortunes fail:",e);fortunesData=[{text:"結果読込エラー",speed:1,hitsRequired:1}];if(elements.fortuneResult)elements.fortuneResult.textContent="結果読込エラー";}}
    async function loadCsvData(){await Promise.all([loadMemberQuotesData(),loadFortunesData()]);console.log("CSV data loaded.");}

    // --- タグデータ管理 (変更なし) ---
    async function loadTagsFromLocalStorage(storageKey) { try{const d=localStorage.getItem(storageKey);imageTags=d?JSON.parse(d):{};console.log(`Tags loaded(${storageKey}):${Object.keys(imageTags).length}`);mergeConfigTags();updateAllAvailableTags();}catch(e){console.error("LS tags load err:",e);imageTags={};mergeConfigTags();updateAllAvailableTags();}}
    function saveTagsToLocalStorage() { const storageKey = typeof TAG_STORAGE_KEY !== 'undefined' ? TAG_STORAGE_KEY : 'onspImageTags_fallback'; try{localStorage.setItem(storageKey, JSON.stringify(imageTags));if(DEBUG_MODE)console.log(`Tags saved(${storageKey})`);updateAllAvailableTags();populateTagFilterButtons();}catch(e){console.error("LS tags save err:",e);alert(`タグ保存失敗:${e.message}`);}}
    function mergeConfigTags(){let c=0;if(!Array.isArray(members))return;members.forEach(m=>{if(m.tags&&typeof m.tags==='object'){Object.entries(m.tags).forEach(([r,t])=>{if(!imageTags.hasOwnProperty(r)&&Array.isArray(t)){imageTags[r]=[...t];c++;}});}});if(c>0)console.log(`Merged ${c} initial tags.`);}
    function updateAllAvailableTags(){const tags=new Set();Object.values(imageTags).forEach(a=>{if(Array.isArray(a)){a.forEach(t=>{if(t&&typeof t==='string')tags.add(t.trim());});}});allAvailableTags=tags;if(DEBUG_MODE)console.log("Updated tags:",Array.from(allAvailableTags));}
    function setTagsForImage(r,t){if(!r||!Array.isArray(t)){console.error("setTags invalid args");return;}const clean=t.map(i=>String(i).trim()).filter(i=>i);if(clean.length>0){imageTags[r]=[...new Set(clean)];if(DEBUG_MODE)console.log(`Tags set ${r}:`,imageTags[r]);}else{if(imageTags.hasOwnProperty(r)){delete imageTags[r];if(DEBUG_MODE)console.log(`Tags cleared ${r}`);}}saveTagsToLocalStorage();}
    function getTagsForImage(r){return imageTags[r]||[];}

    // --- 弱点画像管理 (変更なし) ---
    function loadWeakPoints(storageKey) { try { const data = localStorage.getItem(storageKey); if (data) { const arr = JSON.parse(data); if (Array.isArray(arr)) { weakPointImages = new Set(arr); console.log(`Loaded ${weakPointImages.size} weak points(${storageKey})`); } else { weakPointImages = new Set(); } } else { weakPointImages = new Set(); } } catch (e) { console.error("Load weak points err:", e); weakPointImages = new Set(); } }
    function saveWeakPoints() { const storageKey = typeof WEAK_POINT_STORAGE_KEY !== 'undefined' ? WEAK_POINT_STORAGE_KEY : 'onspWeakPoints_fallback'; try { const arr = Array.from(weakPointImages); localStorage.setItem(storageKey, JSON.stringify(arr)); if (DEBUG_MODE) console.log(`Weak points saved(${storageKey}):`, arr); } catch (e) { console.error("Save weak points err:", e); } }
    function isWeakPointImage(relativePath) { return weakPointImages.has(relativePath); }
    function toggleWeakPoint(relativePath) { if (!relativePath) return false; let changed = false; if (weakPointImages.has(relativePath)) { weakPointImages.delete(relativePath); changed = true; console.log(`Weak removed: ${relativePath}`); } else { weakPointImages.add(relativePath); changed = true; console.log(`Weak added: ${relativePath}`); } if (changed) saveWeakPoints(); return weakPointImages.has(relativePath); }

    // --- UI初期化ヘルパー (変更なし) ---
    function initializeUIComponents(){if(elements.accordionToggle&&elements.accordionContent){elements.accordionToggle.addEventListener('click',()=>{const o=elements.accordionContent.classList.toggle('open');elements.accordionToggle.classList.toggle('active',o);elements.accordionToggle.setAttribute('aria-expanded',String(o));});elements.accordionContent.classList.remove('open');elements.accordionToggle.classList.remove('active');elements.accordionToggle.setAttribute('aria-expanded','false');}if(elements.pulseBrightnessSlider&&elements.pulseBrightnessValue){updatePulseBrightness();elements.pulseBrightnessSlider.addEventListener('input',updatePulseBrightness);}initializeTagFilter();initializeTaggingModeUI();}
    function populateMemberSliders(){const cont=elements.memberSlidersContainer,ph=elements.memberSliderPlaceholder;if(!cont||!ph){console.error("Slider cont/ph missing.");if(ph)ph.textContent="エラー";return;}if(!Array.isArray(members)){ph.textContent="メンバー情報エラー";return;}cont.innerHTML='';const w={'マコ':5,'リオ':3,'マヤ':4,'リク':0,'アヤカ':0,'マユカ':5,'リマ':5,'ミイヒ':5,'ニナ':0};members.forEach(m=>{if(!m?.name)return;const weight=w[m.name]??3;const item=document.createElement('div');item.className='member-slider-item';const lbl=document.createElement('label');const sId=`weight-${m.name.replace(/\s+/g,'-')}`;lbl.htmlFor=sId;lbl.textContent=`${m.name}:`;const slider=document.createElement('input');slider.type='range';slider.id=sId;slider.className='member-weight-slider';slider.dataset.memberName=m.name;slider.min="0";slider.max="5";slider.step="1";slider.value=String(weight);const val=document.createElement('span');val.className='slider-value';val.textContent=String(weight);slider.addEventListener('input',(e)=>{if(e.target&&val)val.textContent=e.target.value;});item.appendChild(lbl);item.appendChild(slider);item.appendChild(val);cont.appendChild(item);});elements.memberWeightSliders=document.querySelectorAll('.member-weight-slider');}
    function populateGalleryFilters() { if (!elements.galleryMemberFilter) return; elements.galleryMemberFilter.innerHTML = '<option value="all">全員</option>'; if (typeof members !== 'undefined' && Array.isArray(members)) { members.forEach(member => { if (member?.name) { const option = document.createElement('option'); option.value = member.name; option.textContent = member.name; elements.galleryMemberFilter.appendChild(option); } }); } }

    // --- イベントリスナー設定 (変更なし) ---
    function attachEventListeners(){
        elements.tabButtons?.forEach(b=>{b.addEventListener('click',()=>{if(isTaggingMode){alert("タグ設定モード中はタブ移動できません。");return;}if(selectedStickerPath){deselectSticker();}const tid=b.dataset.tabTarget;if(tid)switchTab(tid);});});
        if(elements.fortuneButton)elements.fortuneButton.addEventListener('click',handleFortuneButtonClick);
        if(elements.ejaculateButton)elements.ejaculateButton.addEventListener('click',handleEjaculateButtonClick);
        if(elements.fortuneWeakPointButton) elements.fortuneWeakPointButton.addEventListener('click', handleWeakPointToggleClick);
        document.addEventListener('keydown',handleGlobalKeyDown);
        initializeTaggingModeUI();
        initializeTagFilter();
        if(elements.importTagFile)elements.importTagFile.addEventListener('change',handleFileSelect);
        if(elements.importTagsButton)elements.importTagsButton.addEventListener('click',handleTagImport);
        if(elements.galleryRefreshButton) elements.galleryRefreshButton.addEventListener('click', populateGallery);
        if(elements.galleryMemberFilter) elements.galleryMemberFilter.addEventListener('change', populateGallery);
        if(elements.galleryTypeFilter) elements.galleryTypeFilter.addEventListener('change', populateGallery);
        if(elements.galleryWeakPointFilter) elements.galleryWeakPointFilter.addEventListener('change', populateGallery);

        if(elements.fortuneDisplayArea) {
            elements.fortuneDisplayArea.addEventListener('mousemove', handleStickerMouseMove);
            elements.fortuneDisplayArea.addEventListener('click', handleStickerClick);
            elements.fortuneDisplayArea.addEventListener('mouseleave', handleStickerMouseLeave);
        }
    }

    // --- タブ切り替え処理 (変更なし) ---
    function switchTab(targetId) {
        if (isTaggingMode) { console.log("Tab switch blocked during tagging mode."); return; }
        if (selectedStickerPath) { deselectSticker(); }
        if (DEBUG_MODE) console.log(`Switching tab to: ${targetId}`);
        try {
            elements.tabContents?.forEach(c => c.classList.remove('active'));
            elements.tabButtons?.forEach(b => b.classList.remove('active'));
            document.body.classList.remove('no-pulse', 'fortune-active', 'imepure-active');
            if (elements.imageTagsContainer) elements.imageTagsContainer.style.display = 'none';
            if (elements.quoteTagsContainer) elements.quoteTagsContainer.style.display = 'none';

             if (targetId !== '#fortuneSection' && window.metronomeModule?.stop) {
                  window.metronomeModule.stop();
             }

            const targetContent = document.querySelector(targetId);
            const targetButton = document.querySelector(`.tab-button[data-tab-target="${targetId}"]`);

            if (targetContent) {
                targetContent.classList.add('active');
                let themeColor = null;
                let currentSpeed = 1;

                if (targetId === '#fortuneSection') {
                    document.body.classList.add('fortune-active');
                    const currentMember = members.find(m => m.name === currentDisplayedMemberName);
                    themeColor = currentMember?.color || null;
                    currentDisplayedMemberColor = themeColor;
                    const currentFortune = fortunesData.find(f => f.text === elements.fortuneResult?.textContent);
                    currentSpeed = currentFortune?.speed ?? 1;
                    setAnimationSpeed(currentSpeed);
                    if (elements.imageTagsContainer && elements.imageTagsContainer.innerHTML.trim() !== '') elements.imageTagsContainer.style.display = 'block';
                    if (elements.quoteTagsContainer && elements.quoteTagsContainer.innerHTML.trim() !== '') elements.quoteTagsContainer.style.display = 'block';
                     if(currentDisplayedMemberName && window.metronomeModule?.setSpeed) {
                          window.metronomeModule.setSpeed(currentSpeed);
                     }
                     if (elements.stickerSection) elements.stickerSection.style.display = 'block';

                } else {
                    if (elements.stickerSection) elements.stickerSection.style.display = 'none';
                    if (targetId === '#counterSection') {
                        document.body.classList.add('no-pulse');
                    } else if (targetId === '#imepureSection') {
                        document.body.classList.add('no-pulse', 'imepure-active');
                        if (window.imepureModule?.getCurrentCharacterColor) themeColor = window.imepureModule.getCurrentCharacterColor();
                    } else if (targetId === '#gallerySection') {
                        document.body.classList.add('no-pulse');
                        populateGallery();
                    } else {
                        document.body.classList.add('no-pulse');
                    }
                }
                applyMemberColorTheme(themeColor);
            } else { console.error(`Target content missing: ${targetId}`); }
            if (targetButton) { targetButton.classList.add('active'); } else { console.error(`Target button missing for tab: ${targetId}`); }
        } catch (e) {
            console.error("Tab switch error:", e);
            applyMemberColorTheme(null); document.body.className = ''; document.body.classList.add('no-pulse');
            if (elements.tabContents?.[0] && elements.tabButtons?.[0]) { elements.tabContents.forEach((c, i) => c.classList.toggle('active', i === 0)); elements.tabButtons.forEach((b, i) => b.classList.toggle('active', i === 0)); }
            if (window.metronomeModule?.stop) window.metronomeModule.stop();
            deselectSticker();
        }
    }

    // --- テーマ・アニメーション (変更なし) ---
    function applyMemberColorTheme(hex){const root=document.documentElement.style;try{let rgb=[108,117,125];if(!hex||hex.toLowerCase()==='#ffffff'||hex===''){root.removeProperty('--member-main-bg');root.removeProperty('--member-display-bg');root.removeProperty('--member-text-color');root.removeProperty('--member-quote-color');root.removeProperty('--member-accent-color');root.removeProperty('--member-button-text');root.removeProperty('--pulse-hue');root.removeProperty('--pulse-sat');root.removeProperty('--pulse-light');root.setProperty('--member-accent-color-rgb',rgb.join(', '));if(DEBUG_MODE)console.log("Theme reset.");return;}const [h,s,l]=hexToHsl(hex);if(isNaN(h)||isNaN(s)||isNaN(l)||s<5||l<5||l>95){applyMemberColorTheme(null);return;}const pHue=h,pSat=s,pLight=Math.min(90,l+15);const light=l>65;const mainL=Math.min(97,l+(100-l)*0.85),mainS=Math.max(3,Math.min(25,s*0.25));const dispL=Math.min(95,l+(100-l)*0.75),dispS=Math.max(8,Math.min(40,s*0.40));const textL=Math.max(10,l*(light?0.2:0.4)),textS=Math.min(90,s*1.1);const quoteL=Math.max(15,l*(light?0.3:0.5)),quoteS=s;const accentL=l,accentS=s;const btnTxt=l>=60&&s>10?'rgb(0,0,0)':'rgb(255,255,255)';const mainBg=hslToCssString(h,mainS,mainL),dispBg=hslToCssString(h,dispS,dispL);const textC=hslToCssString(h,textS,textL),quoteC=hslToCssString(h,quoteS,quoteL);const accentC=hslToCssString(h,accentS,accentL);rgb=hslToRgb(h,accentS,accentL);root.setProperty('--member-main-bg',mainBg);root.setProperty('--member-display-bg',dispBg);root.setProperty('--member-text-color',textC);root.setProperty('--member-quote-color',quoteC);root.setProperty('--member-accent-color',accentC);root.setProperty('--member-button-text',btnTxt);root.setProperty('--pulse-hue',pHue.toFixed(0));root.setProperty('--pulse-sat',pSat.toFixed(0)+'%');root.setProperty('--pulse-light',pLight.toFixed(0)+'%');root.setProperty('--member-accent-color-rgb',rgb.join(', '));if(DEBUG_MODE)console.log(`Theme applied:${hex}`);}catch(e){console.error("Theme error:",e);try{applyMemberColorTheme(null);}catch{}}}
    function hexToHsl(hex){if(!hex||typeof hex!=='string')return[NaN,NaN,NaN];let r=0,g=0,b=0;hex=hex.replace('#','');if(hex.length===3){r=parseInt(hex[0]+hex[0],16);g=parseInt(hex[1]+hex[1],16);b=parseInt(hex[2]+hex[2],16);}else if(hex.length===6){r=parseInt(hex.substring(0,2),16);g=parseInt(hex.substring(2,4),16);b=parseInt(hex.substring(4,6),16);}else return[NaN,NaN,NaN];if(isNaN(r)||isNaN(g)||isNaN(b))return[NaN,NaN,NaN];r/=255;g/=255;b/=255;const max=Math.max(r,g,b),min=Math.min(r,g,b);let h=0,s=0,l=(max+min)/2;if(max!==min){const d=max-min;s=l>0.5?d/(2-max-min):d/(max+min);switch(max){case r:h=(g-b)/d+(g<b?6:0);break;case g:h=(b-r)/d+2;break;case b:h=(r-g)/d+4;break;}h/=6;}return [h*360,s*100,l*100];}
    function hslToRgb(h,s,l){h/=360;s/=100;l/=100;let r,g,b;if(s===0)r=g=b=l;else{const hue2rgb=(p,q,t)=>{if(t<0)t+=1;if(t>1)t-=1;if(t<1/6)return p+(q-p)*6*t;if(t<1/2)return q;if(t<2/3)return p+(q-p)*(2/3-t)*6;return p;};const q=l<0.5?l*(1+s):l+s-l*s;const p=2*l-q;r=hue2rgb(p,q,h+1/3);g=hue2rgb(p,q,h);b=hue2rgb(p,q,h-1/3);}return [Math.round(r*255),Math.round(g*255),Math.round(b*255)];}
    function hslToCssString(h,s,l){try{const[r,g,b]=hslToRgb(h,s,l);return`rgb(${r}, ${g}, ${b})`;}catch(e){console.error("HSL->CSS error:",e);return'rgb(200,200,200)';}}
    function setAnimationSpeed(speed){let dur=2.0;if(speed===0)dur=9999;else if(speed===2)dur=1.2;else if(speed===3)dur=0.7;else if(speed===4)dur=0.4;else if(speed===1)dur=2.0;try{document.documentElement.style.setProperty('--pulse-duration',`${dur.toFixed(1)}s`);if(DEBUG_MODE)console.log(`Anim speed ${speed}, dur ${dur.toFixed(1)}s`);document.body.classList.toggle('no-pulse',speed===0);}catch(e){console.error("Anim speed error:",e);}}
    function updatePulseBrightness(){if(!elements.pulseBrightnessSlider||!elements.pulseBrightnessValue)return;try{const v=elements.pulseBrightnessSlider.valueAsNumber,f=1.0+(v*0.06);document.documentElement.style.setProperty('--pulse-brightness-factor',f.toFixed(2));elements.pulseBrightnessValue.textContent=String(v);if(DEBUG_MODE)console.log(`Pulse bright ${v}(factor ${f.toFixed(2)})`);}catch(e){console.error("Brightness error:",e);}}
    function getWeightedRandomMember(weightedMembers) { if (!Array.isArray(weightedMembers) || weightedMembers.length === 0) return null; const totalWeight = weightedMembers.reduce((sum, item) => sum + (item?.weight || 0), 0); if (totalWeight <= 0) { console.warn("Total weight 0, using unweighted selection."); return getRandomElement(weightedMembers.map(item => item.member)); } const randomNum = Math.random() * totalWeight; let weightSum = 0; for (const item of weightedMembers) { weightSum += item.weight || 0; if (randomNum < weightSum) return item.member; } return getRandomElement(weightedMembers.map(item => item.member)); }

    // --- 占い実行 ---
    async function runFortune(isRetry = false, filterRetryCountInternal = 0) {
        if (!canRunFortune || isTaggingMode || selectedStickerPath) {
             if (DEBUG_MODE) console.warn(`Fortune blocked(canRun:${canRunFortune}, tagging:${isTaggingMode}, stickerSelected: ${!!selectedStickerPath})`);
             if (selectedStickerPath) deselectSticker();
             if(!isTaggingMode && !selectedStickerPath && elements.fortuneButton) elements.fortuneButton.disabled = false; // Ensure button is enabled if blocked only by sticker
             return;
        }
        canRunFortune = false; if (elements.fortuneButton) elements.fortuneButton.disabled = true; if (elements.ejaculateButton) elements.ejaculateButton.disabled = true; if (elements.fortuneWeakPointButton) elements.fortuneWeakPointButton.style.display = 'none';
        if (window.metronomeModule?.stop) window.metronomeModule.stop();
        // clearPastedStickers(); // 削除: ステッカーを永続化するため

        if (DEBUG_MODE) console.log(`--- runFortune Start(isRetry: ${isRetry}, filterRetry: ${filterRetryCountInternal}) ---`); if (window.spacebarModule?.resetChallenge) window.spacebarModule.resetChallenge(); currentDisplayedMemberName = null; currentDisplayedMemberColor = null;
        try {
            if (!isRetry) imageLoadRetryCount = 0; else if (!filterRetryCountInternal) { imageLoadRetryCount++; console.log(`Img Retry: ${imageLoadRetryCount}/${MAX_IMAGE_LOAD_RETRIES}`); if (imageLoadRetryCount >= MAX_IMAGE_LOAD_RETRIES) throw new Error(`Retry limit reach`); }
            const memberWeights = {}; elements.memberWeightSliders?.forEach(s => { if (s?.dataset?.memberName) memberWeights[s.dataset.memberName] = s.valueAsNumber; }); if (typeof members === 'undefined' || !Array.isArray(members)) throw new Error("'members' invalid."); const availableMembers = members.filter(m => m?.name && m.imageFolders?.ero?.imageCount > 0).map(m => ({ member: m, weight: memberWeights[m.name] || 0 })).filter(item => item.weight > 0); if (availableMembers.length === 0) { displayFortuneError("表示メンバーなし", "出現率を1以上に"); return; }
            let selectedMember = getWeightedRandomMember(availableMembers); if (!selectedMember) throw new Error("Member selection fail");
            currentDisplayedMemberName = selectedMember.name;
            currentDisplayedMemberColor = selectedMember.color || null;
            console.log(`Selected Member: ${selectedMember.name}`);
            let potentialImages = []; const eroFolderInfo = selectedMember.imageFolders?.ero; if (eroFolderInfo && eroFolderInfo.imageCount > 0 && eroFolderInfo.path) { for (let i = 1; i <= eroFolderInfo.imageCount; i++) { const fileName = `${i}.jpg`; const relativePath = `${selectedMember.name}/ero/${fileName}`; potentialImages.push({ path: `${eroFolderInfo.path}${fileName}`, tags: getTagsForImage(relativePath) || [], relativePath: relativePath, member: selectedMember.name, type: 'ero', number: i }); } } else { console.warn(`No valid ero img info: ${selectedMember.name}`); displayFortuneError(`${selectedMember.name} ERO情報なし`, "config.js 確認"); return; } if (potentialImages.length === 0) { displayFortuneError(`${selectedMember.name} ERO候補なし`, "画像フォルダ確認"); return; }
            let finalImageInfo = null; let selectedImage = null; let filterAppliedAndFound = false;
            if (selectedFilterTags.length > 0) { console.log(`Filter: [${selectedFilterTags.join(', ')}] mode: ${tagSearchMode}`); let filteredImages = potentialImages.filter(img => tagSearchMode === 'AND' ? selectedFilterTags.every(filterTag => img.tags.includes(filterTag)) : selectedFilterTags.some(filterTag => img.tags.includes(filterTag))); console.log(`Filtered count: ${filteredImages.length}`); if (filteredImages.length > 0) { const possibleChoices = filteredImages.filter(img => !(img.relativePath === lastDisplayedImageInfo.relativePath && img.member === lastDisplayedImageInfo.memberName)); selectedImage = getRandomElement(possibleChoices.length > 0 ? possibleChoices : filteredImages); filterAppliedAndFound = true; } else { if (filterRetryCountInternal < MAX_FILTER_RETRIES) { console.warn(`No match. Retrying... (${filterRetryCountInternal + 1}/${MAX_FILTER_RETRIES})`); canRunFortune = true; setTimeout(() => runFortune(false, filterRetryCountInternal + 1), 50); return; } else { displayFortuneError(`フィルター結果なし (${MAX_FILTER_RETRIES}回)`, `タグ [${selectedFilterTags.join(', ')}](${tagSearchMode})に合う${selectedMember.name}の画像なし`); return; } } }
            if (!filterAppliedAndFound) { const possibleChoices = potentialImages.filter(img => !(img.relativePath === lastDisplayedImageInfo.relativePath && img.member === lastDisplayedImageInfo.memberName)); selectedImage = getRandomElement(possibleChoices.length > 0 ? possibleChoices : potentialImages); } if (!selectedImage) throw new Error("Image selection fail");
            finalImageInfo = { memberName: selectedImage.member, imageNumber: selectedImage.number, type: selectedImage.type, relativePath: selectedImage.relativePath }; console.log(`Final image: ${finalImageInfo.relativePath}`); lastDisplayedImageInfo = { memberName: finalImageInfo.memberName, relativePath: finalImageInfo.relativePath };
            const quote = selectQuoteForMember(selectedMember, selectedFilterTags); const fortune = getRandomElement(fortunesData); const fText = fortune?.text || "（ご自由に）"; const hits = fortune?.hitsRequired ?? 1; const speed = fortune?.speed ?? 1;
            applyMemberColorTheme(selectedMember.color || null); elements.memberName.textContent = selectedMember.name; elements.memberQuote.textContent = quote.text; displayQuoteTags(quote.tags); elements.fortuneResult.textContent = fText; setAnimationSpeed(speed);
             if(window.metronomeModule?.setSpeed) window.metronomeModule.setSpeed(speed);
            await displayMemberImage(selectedImage.path, selectedMember.name); displayImageTags(selectedImage.tags); if (elements.fortuneWeakPointButton) { elements.fortuneWeakPointButton.dataset.relpath = finalImageInfo.relativePath; updateWeakPointButtonState(elements.fortuneWeakPointButton, isWeakPointImage(finalImageInfo.relativePath)); elements.fortuneWeakPointButton.style.display = 'inline-block'; } if (elements.ejaculateButton) elements.ejaculateButton.disabled = false;
            if (window.spacebarModule?.startChallenge) { const t = elements.spacebarFeatureToggle; if (t?.checked && hits > 0) { console.log(`Starting challenge: ${hits} hits`); window.spacebarModule.startChallenge(hits); } else { canRunFortune = true; if (elements.fortuneButton) elements.fortuneButton.disabled = false; } } else { canRunFortune = true; if (elements.fortuneButton) elements.fortuneButton.disabled = false; }
        } catch (e) { console.error("RunFortune Error:", e); displayFortuneError("エラー発生", e.message); }
        finally { if (DEBUG_MODE) console.log(`--- runFortune End(canRun:${canRunFortune}) ---`); }
    }

    // --- 占いヘルパー (変更なし) ---
    function selectQuoteForMember(member, filterTags = []) { const memberName = member.name; const allMemberQuotes = memberQuotesWithTags[memberName] || []; const defaultQuote = { text: "（……）", tags: [] }; if (allMemberQuotes.length === 0) return defaultQuote; if (!Array.isArray(filterTags) || filterTags.length === 0) { if (DEBUG_MODE) console.log("No UI filter tags, selecting random quote."); return getRandomElement(allMemberQuotes) || defaultQuote; } let filteredQuotes = []; if (tagSearchMode === 'AND') { filteredQuotes = allMemberQuotes.filter(quote => Array.isArray(quote.tags) && quote.tags.length >= filterTags.length && filterTags.every(filterTag => quote.tags.includes(filterTag)) ); } else { filteredQuotes = allMemberQuotes.filter(quote => Array.isArray(quote.tags) && quote.tags.length > 0 && filterTags.some(filterTag => quote.tags.includes(filterTag)) ); } if (DEBUG_MODE) console.log(`Found ${filteredQuotes.length} quotes matching UI filter [${filterTags.join(',')}] (${tagSearchMode})`); if (filteredQuotes.length > 0) { return getRandomElement(filteredQuotes); } else { if (DEBUG_MODE) console.log("No matching quote, return default."); return getRandomElement(allMemberQuotes) || defaultQuote; } }
    function displayQuoteTags(tags){if(!elements.quoteTagsContainer)return;elements.quoteTagsContainer.innerHTML='';if(Array.isArray(tags)&&tags.length>0){tags.forEach(t=>{const c=document.createElement('span');c.className='quote-tag-item';c.textContent=t;elements.quoteTagsContainer.appendChild(c);});elements.quoteTagsContainer.style.display='block';}else elements.quoteTagsContainer.style.display='none';}
    function displayImageTags(tags){if(!elements.imageTagsContainer)return;elements.imageTagsContainer.innerHTML='';if(Array.isArray(tags)&&tags.length>0){tags.forEach(t=>{const c=document.createElement('span');c.className='image-tag-item';c.textContent=t;elements.imageTagsContainer.appendChild(c);});elements.imageTagsContainer.style.display='block';}else elements.imageTagsContainer.style.display='none';}
    async function displayMemberImage(path,name){return new Promise((resolve,reject)=>{if(!elements.memberImage){reject(new Error("Img element missing"));return;}const i=elements.memberImage;i.onload=null;i.onerror=null;i.classList.remove('image-error');i.alt=`${name} 画像`;const ok=()=>{if(DEBUG_MODE)console.log(`Img OK:${path}`);imageLoadRetryCount=0;resolve();};const ng=()=>{console.error(`!!! Img Fail:${path}`);i.src='placeholder.png';i.alt=`読込失敗(${name})`;i.classList.add('image-error');reject(new Error(`Img load fail:${path}`));};i.onload=ok;i.onerror=ng;i.src='';i.src=path;if(i.complete){if(i.naturalWidth>0)setTimeout(ok,0);else if(i.src)setTimeout(ng,0);}});}
    function displayFortuneError(title,msg){console.error(`Fortune Error:${title}-${msg}`);if(elements.memberName)elements.memberName.textContent=title;if(elements.memberImage){elements.memberImage.onload=null;elements.memberImage.onerror=null;elements.memberImage.src='placeholder.png';elements.memberImage.alt='エラー';elements.memberImage.classList.add('image-error');}if(elements.memberQuote)elements.memberQuote.textContent=msg||"エラー発生";if(elements.fortuneResult)elements.fortuneResult.textContent="";if(elements.quoteTagsContainer)elements.quoteTagsContainer.style.display='none';if(elements.imageTagsContainer)elements.imageTagsContainer.style.display='none';if (elements.fortuneWeakPointButton) elements.fortuneWeakPointButton.style.display = 'none';
         if (window.metronomeModule?.stop) window.metronomeModule.stop();
        applyMemberColorTheme(null);setAnimationSpeed(1);canRunFortune=true;if(elements.fortuneButton)elements.fortuneButton.disabled=false;if(elements.ejaculateButton)elements.ejaculateButton.disabled=true;
        // clearPastedStickers(); // エラー時はクリアした方が良い場合もあるが、永続化のためコメントアウト
        deselectSticker();
    }
    function getRandomElement(arr){if(!arr?.length)return null;return arr[Math.floor(Math.random()*arr.length)];}

    // --- イベントハンドラ (変更なし) ---
    function handleFortuneButtonClick(){ if(DEBUG_MODE)console.log("Fortune btn click"); if(!canRunFortune || selectedStickerPath){console.warn("Fortune blocked (running or sticker selected)"); if (selectedStickerPath) deselectSticker(); if(!isTaggingMode && !selectedStickerPath && elements.fortuneButton) elements.fortuneButton.disabled = false; return;} runFortune(false); }
    function handleEjaculateButtonClick(){if(elements.ejaculateButton?.disabled||isTaggingMode||!currentDisplayedMemberName || selectedStickerPath)return;console.log(`Ejaculate for:${currentDisplayedMemberName}`);let ok=false;if(window.counterModule?.incrementCount){window.counterModule.incrementCount(currentDisplayedMemberName);ok=true;}else console.error("counterModule.incrementCount missing"); if (ok && typeof showEjaculationNotification === 'function') showEjaculationNotification(currentDisplayedMemberName); else if (ok) console.warn("showNotification missing"); }
    function handleWeakPointToggleClick(event) { if (selectedStickerPath) return; const button = event.currentTarget; const relativePath = button.dataset.relpath; if (relativePath) { const isNowWeak = toggleWeakPoint(relativePath); updateWeakPointButtonState(button, isNowWeak); findGalleryItemAndToggleButton(relativePath, isNowWeak); } else { console.warn("Weak toggle btn clicked, no relpath."); } }
    function handleGlobalKeyDown(event){ const activeEl=document.activeElement; const isInputFocused=(el)=>{if(!el)return false;const tag=el.tagName.toUpperCase(),type=el.type?.toLowerCase();return(tag==='INPUT'&&!['checkbox','radio','button','range','submit','reset','file','image'].includes(type))||tag==='TEXTAREA'||tag==='SELECT';}; const modalOpen=elements.imepureSettingsModal?.style.display==='block'; const filterFocus=activeEl?.closest('#tagFilterButtonsContainer'); const imepureFocus=activeEl===elements.imepureUserInput;
        if(modalOpen){if(event.key==='Escape'){closeImepureSettingsModal();event.preventDefault();}if(isInputFocused(activeEl))return;return;}
        if(isTaggingMode){if(event.key==='Escape'){exitTaggingMode();event.preventDefault();return;}if(activeEl===elements.tagInput&&event.key!=='Enter')return;if(event.key==='ArrowLeft'){prevTagImage();event.preventDefault();}else if(event.key==='ArrowRight'){nextTagImage();event.preventDefault();}else if(event.key==='Enter'){saveTagsAndProceed();event.preventDefault();}return;}
        if(selectedStickerPath && event.key === 'Escape') {
            deselectSticker();
            event.preventDefault();
            return;
        }
        if(filterFocus&&!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter',' ','Escape','Tab'].includes(event.key)){event.preventDefault();return;}
        if(event.key==='Escape'&&filterFocus){activeEl.blur();event.preventDefault();return;}
        if(imepureFocus && !(event.key==='Enter')) { return;}
        if(isInputFocused(activeEl) && !imepureFocus) return;
        const activeTabContent=document.querySelector('.tab-content.active');
        if(!activeTabContent)return;
        const activeTabId=`#${activeTabContent.id}`;
        try{
            switch(event.key){
                 case' ':
                    if(activeTabId==='#fortuneSection' && !selectedStickerPath){
                         event.preventDefault();
                         let hit=false;
                         if(window.spacebarModule?.handleHit)hit=window.spacebarModule.handleHit();
                         if(!hit&&canRunFortune&&elements.fortuneButton&&!elements.fortuneButton.disabled){
                             if(DEBUG_MODE)console.log("Space:Run fortune");runFortune(false);
                         }
                    }
                    break;
                 case'Enter':
                     if(activeTabId==='#fortuneSection' && !selectedStickerPath){
                        let skip=false;
                        if(window.spacebarModule?.handleSkip)skip=window.spacebarModule.handleSkip();
                        if(skip){event.preventDefault();if(DEBUG_MODE)console.log("Enter:Skipped challenge");}
                     }
                     break;
             }
        } catch(e){ console.error("Keydown error:",e); }
    }
    let notificationTimeout = null; function showEjaculationNotification(name){const el=elements.ejaculationNotification;if(!el)return;try{if(notificationTimeout){clearTimeout(notificationTimeout);el.classList.remove('show');void el.offsetWidth;} const msgs=[`んっ…♡ ${name}に…ありがとぉ…♡`,`あっ… ${name}のおまんこビクンッ…！`,`あぁんっ…♡ ${name}イっちゃったぁ…♡`,`はぁ…♡ ${name}スッキリした…？ あったかい…♡`,`くちゅ… ${name}の中いっぱいだぁ…♡ 責任とってね…？♡`];el.textContent=getRandomElement(msgs)||`${name}に発射！`;el.classList.add('show');console.log(`Notify:${name}`);notificationTimeout=setTimeout(()=>{if(el)el.classList.remove('show');notificationTimeout=null;},3500);}catch(e){console.error("Notify error:",e);if(el)el.classList.remove('show');if(notificationTimeout)clearTimeout(notificationTimeout);notificationTimeout=null;}}

    // --- タグフィルター (変更なし) ---
    function initializeTagFilter(){const cont=elements.tagFilterButtonsContainer,andR=elements.tagSearchAnd,orR=elements.tagSearchOr,clearB=elements.clearTagFilterButton, stat=elements.tagFilterStatus; if(cont&&andR&&orR&&clearB&&stat){populateTagFilterButtons();andR.addEventListener('change',()=>{if(andR.checked){tagSearchMode='AND';updateTagFilterStatus();}});orR.addEventListener('change',()=>{if(orR.checked){tagSearchMode='OR';updateTagFilterStatus();}});clearB.addEventListener('click',()=>{clearTagFilterSelection();selectedFilterTags=[];updateTagFilterStatus();if(DEBUG_MODE)console.log("Filter cleared.");});updateTagFilterStatus();}else{console.warn("Tag filter UI elements incomplete.");const fg=document.querySelector('.tag-filter-group');if(fg)fg.style.display='none';}}
    function populateTagFilterButtons(){const cont=elements.tagFilterButtonsContainer;if(!cont)return;cont.innerHTML='';const tags=Array.from(allAvailableTags).sort();if(tags.length===0){if(elements.noTagsMessage)elements.noTagsMessage.style.display='block';return;}if(elements.noTagsMessage)elements.noTagsMessage.style.display='none';tags.forEach(t=>{const btn=createTagButton(t,handleTagFilterButtonClick);if(selectedFilterTags.includes(t))btn.classList.add('selected');cont.appendChild(btn);});if(DEBUG_MODE)console.log(`Populated ${tags.length} filter buttons.`);}
    function handleTagFilterButtonClick(event){const btn=event.target,tag=btn.dataset.tag;if(!tag)return;btn.classList.toggle('selected');const isSel=btn.classList.contains('selected');if(isSel&&!selectedFilterTags.includes(tag))selectedFilterTags.push(tag);else if(!isSel)selectedFilterTags=selectedFilterTags.filter(t=>t!==tag);if(DEBUG_MODE)console.log("Selected filter tags:",selectedFilterTags);updateTagFilterStatus();}
    function updateTagFilterStatus(){if(!elements.tagFilterStatus)return;if(selectedFilterTags.length===0)elements.tagFilterStatus.textContent="フィルター未適用";else{const disp=selectedFilterTags.length>5?selectedFilterTags.slice(0,5).join(',')+'...':selectedFilterTags.join(',');elements.tagFilterStatus.textContent=`適用中:[${disp}](${tagSearchMode}検索)`;}}
    function clearTagFilterSelection(){const cont=elements.tagFilterButtonsContainer;if(cont)cont.querySelectorAll('.suggested-tag-button.selected').forEach(b=>b.classList.remove('selected'));}

    // --- タグ設定モード (変更なし) ---
    function initializeTaggingModeUI(){if(elements.startTaggingButton)elements.startTaggingButton.addEventListener('click',startTaggingMode);else console.warn("Start tagging btn missing");if(elements.exitTaggingButton)elements.exitTaggingButton.addEventListener('click',exitTaggingMode);if(elements.prevTagImageButton)elements.prevTagImageButton.addEventListener('click',prevTagImage);if(elements.saveTagsButton)elements.saveTagsButton.addEventListener('click',saveTagsAndProceed);if(elements.skipTagImageButton)elements.skipTagImageButton.addEventListener('click',skipTagImage);if(elements.nextTagImageButton)elements.nextTagImageButton.addEventListener('click',nextTagImage);if(elements.exportTagsButton)elements.exportTagsButton.addEventListener('click',exportTags);if(elements.tagInput)elements.tagInput.addEventListener('keydown',(e)=>{if(e.key==='Enter'){e.preventDefault();saveTagsAndProceed();}});}
    function startTaggingMode(){if(isTaggingMode||!canRunFortune || selectedStickerPath){alert(isTaggingMode?"タグ設定中":selectedStickerPath?"ステッカー選択中":"他処理完了待ち");if(selectedStickerPath) deselectSticker(); return;}console.log("Start Tagging...");isTaggingMode=true;canRunFortune=false;document.querySelector('#fortuneSection .display-area')?.style.setProperty('display','none','important');document.querySelector('#fortuneSection .button-area')?.style.setProperty('display','none','important');document.querySelector('#fortuneSection .member-selection-accordion')?.style.setProperty('display','none','important');if (elements.stickerSection) elements.stickerSection.style.display = 'none'; if(elements.taggingModeSection){elements.taggingModeSection.style.display='block';}else{console.error("Tagging section missing!");exitTaggingMode();return;}elements.tabButtons?.forEach(b=>b.disabled=true);taggingImages=[];if(Array.isArray(members)){members.forEach(m=>{if(!m?.name||!m.imageFolders)return;Object.entries(m.imageFolders).forEach(([type,fInfo])=>{if(fInfo?.imageCount>0&&fInfo.path){for(let i=1;i<=fInfo.imageCount;i++){const file=`${i}.jpg`,rel=`${m.name}/${type}/${file}`;if(!imageTags[rel]?.length)taggingImages.push({m:m.name,t:type,i:i,p:`${fInfo.path}${file}`,r:rel});}}});});}else{console.error("`members` missing");exitTaggingMode();return;}console.log(`Found ${taggingImages.length} images to tag.`);if(taggingImages.length===0){alert("タグ付け対象画像なし");exitTaggingMode();return;}taggingImages.sort(()=>Math.random()-0.5);currentTaggingIndex=0;setupSuggestedTagButtons();displayTaggingImage();}
    function exitTaggingMode(){if(!isTaggingMode)return;console.log("Exit Tagging.");isTaggingMode=false;canRunFortune=true;if(elements.taggingModeSection)elements.taggingModeSection.style.display='none';document.querySelector('#fortuneSection .display-area')?.style.removeProperty('display');document.querySelector('#fortuneSection .button-area')?.style.removeProperty('display');document.querySelector('#fortuneSection .member-selection-accordion')?.style.removeProperty('display'); if (elements.stickerSection) elements.stickerSection.style.display = 'block'; elements.tabButtons?.forEach(b=>b.disabled=false);populateTagFilterButtons();}
    function displayTaggingImage(){if(!isTaggingMode||taggingImages.length===0||currentTaggingIndex<0){exitTaggingMode();return;}if(currentTaggingIndex>=taggingImages.length){alert("全画像タグ付け完了！");exitTaggingMode();return;}const imgData=taggingImages[currentTaggingIndex];if(DEBUG_MODE)console.log(`Display tag img:${imgData.r}(${currentTaggingIndex+1}/${taggingImages.length})`);const imgEl=elements.taggingImage;if(imgEl){imgEl.onload=()=>{};imgEl.onerror=()=>{imgEl.alt=`読込失敗`;imgEl.src='placeholder.png';console.error(`Tag img load fail:${imgData.p}`);};imgEl.src='';imgEl.src=imgData.p;imgEl.alt=`${imgData.m}(${imgData.t})#${imgData.i}`;}if(elements.taggingImageInfo)elements.taggingImageInfo.textContent=`File:${imgData.r}|M:${imgData.m}|T:${imgData.t}`;if(elements.taggingProgress)elements.taggingProgress.textContent=`進捗:${currentTaggingIndex+1}/${taggingImages.length}`;const savedTags=getTagsForImage(imgData.r);if(elements.tagInput)elements.tagInput.value=savedTags.join(', '); displayCurrentTagsInternal(savedTags); syncSuggestedTagButtonsSelection(savedTags);if(elements.prevTagImageButton)elements.prevTagImageButton.disabled=(currentTaggingIndex===0);if(elements.nextTagImageButton)elements.nextTagImageButton.disabled=(currentTaggingIndex>=taggingImages.length-1);if(elements.skipTagImageButton)elements.skipTagImageButton.disabled=(currentTaggingIndex>=taggingImages.length-1);if(elements.saveTagsButton)elements.saveTagsButton.disabled=false;}
    function setupSuggestedTagButtons(){const cont=elements.suggestedTagsContainer;if(!cont){console.warn("Suggest container missing");return;}cont.innerHTML='';if(typeof suggestedTagsCategorized!=='object'){cont.innerHTML='<p class="error-message">タグ候補読込失敗</p>';return;}try{Object.entries(suggestedTagsCategorized).forEach(([cat,tags])=>{if(Array.isArray(tags)&&tags.length>0){const catDiv=document.createElement('div');catDiv.className='tag-category';const head=document.createElement('h4');head.className='tag-category-header';head.textContent=cat;catDiv.appendChild(head);const btnsCont=document.createElement('div');btnsCont.className='tag-buttons-container';tags.forEach(t=>{const btn=createTagButton(t,handleSuggestedTagClick);btnsCont.appendChild(btn);});catDiv.appendChild(btnsCont);cont.appendChild(catDiv);}});if(DEBUG_MODE)console.log("Suggest buttons setup.");}catch(e){console.error("Suggest setup error:",e);cont.innerHTML='<p class="error-message">タグ候補表示エラー</p>';}}
    function createTagButton(tag,handler){const btn=document.createElement('button');btn.type='button';btn.className='suggested-tag-button';btn.textContent=tag;btn.dataset.tag=tag;if(handler)btn.addEventListener('click',handler);return btn;}
    function handleSuggestedTagClick(event){const btn=event.target,tag=btn.dataset.tag,input=elements.tagInput;if(!tag||!input)return;btn.classList.toggle('selected');const isSel=btn.classList.contains('selected');let curTags=input.value.split(',').map(t=>t.trim()).filter(t=>t);if(isSel&&!curTags.includes(tag))curTags.push(tag);else if(!isSel)curTags=curTags.filter(t=>t!==tag);input.value=[...new Set(curTags)].sort().join(', '); displayCurrentTagsInternal(curTags); }
    function displayCurrentTagsInternal(tagsArray) {const displayArea = elements.currentTagsDisplay;if (!displayArea) return;displayArea.innerHTML = '';const sortedTags = [...new Set(tagsArray)].sort();if (sortedTags.length > 0) {sortedTags.forEach(tag => {const span = document.createElement('span');span.className = 'tag-item';span.textContent = tag;displayArea.appendChild(span);});} else {displayArea.textContent = 'なし';}}
    function syncSuggestedTagButtonsSelection(curTags=[]){const cont=elements.suggestedTagsContainer;if(!cont)return;const tagSet=new Set(curTags);cont.querySelectorAll('.suggested-tag-button').forEach(b=>{const t=b.dataset.tag;if(t)b.classList.toggle('selected',tagSet.has(t));});}
    function saveTagsAndProceed(){if(!isTaggingMode||!taggingImages[currentTaggingIndex]||!elements.tagInput)return;const imgData=taggingImages[currentTaggingIndex];const inputTags=elements.tagInput.value.split(',').map(t=>t.trim()).filter(t=>t);setTagsForImage(imgData.r,inputTags);currentTaggingIndex++;displayTaggingImage();}
    function skipTagImage(){if(!isTaggingMode||currentTaggingIndex>=taggingImages.length-1)return;if(DEBUG_MODE)console.log(`Skip tag:${taggingImages[currentTaggingIndex].r}`);currentTaggingIndex++;displayTaggingImage();}
    function prevTagImage(){if(!isTaggingMode||currentTaggingIndex<=0)return;currentTaggingIndex--;displayTaggingImage();}
    function nextTagImage(){if(!isTaggingMode||currentTaggingIndex>=taggingImages.length-1)return;currentTaggingIndex++;displayTaggingImage();}
    function exportTags(){if(Object.keys(imageTags).length===0){alert("エクスポート対象タグなし");return;}try{const json=JSON.stringify(imageTags,null,2);const blob=new Blob([json],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;const date=new Date(),dStr=`${date.getFullYear()}${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}`;a.download=`onsp_image_tags_${dStr}.json`;document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);console.log("Tags exported.");alert("タグ情報DL完了");}catch(e){console.error("Export error:",e);alert(`エクスポート失敗:${e.message}`);}}
    function handleFileSelect(event){const file=event.target.files?.[0];const btn=elements.importTagsButton,st=elements.importStatus;if(file&&file.type==="application/json"){selectedImportFile=file;if(btn)btn.disabled=false;if(st)st.textContent=`選択:${file.name}`;if(DEBUG_MODE)console.log("Import file selected:",file.name);}else{selectedImportFile=null;if(btn)btn.disabled=true;if(st)st.textContent="JSONファイル選択";if(file)alert("無効形式。JSON選択");}}
    function handleTagImport(){if(!selectedImportFile){alert("インポートJSON選択");return;}const reader=new FileReader();const st=elements.importStatus;reader.onload=(e)=>{try{const data=JSON.parse(e.target.result);if(typeof data!=='object'||data===null)throw new Error("JSON内容不正");const validFmtRegex = /^[^\/]+\/(hutuu|ero)\/\d+\.(jpg|jpeg|png|gif|webp)$/i; const allKeysValid = Object.keys(data).every(k=>validFmtRegex.test(k)); if(!allKeysValid){console.warn("Import JSON has unexpected key format.");if(!confirm("一部キー形式が予期しません。形式違い無視で続行?")){if(st)st.textContent="インポートキャンセル";resetImportUI();return;}}const origCnt=Object.keys(imageTags).length;let impCnt=0,overCnt=0;Object.entries(data).forEach(([k,v])=>{if(validFmtRegex.test(k)&&Array.isArray(v)){const cleanV=v.map(t=>String(t).trim()).filter(t=>t);if(imageTags.hasOwnProperty(k))overCnt++;else impCnt++;imageTags[k]=[...new Set(cleanV)];}else{console.warn(`Skip invalid import key/val:${k}`);}});const newCnt=Object.keys(imageTags).length;saveTagsToLocalStorage();updateAllAvailableTags();populateTagFilterButtons();if(isTaggingMode){displayTaggingImage();setupSuggestedTagButtons();}const msg=`インポート完了。\n(新規:${impCnt},上書:${overCnt}->合計:${newCnt})`;alert(msg);if(st)st.textContent=msg;console.log("Tags imported:",{new:impCnt,overwritten:overCnt,total:newCnt});}catch(err){console.error("Import error:",err);alert(`インポートエラー:${err.message}`);if(st)st.textContent=`インポートエラー:${err.message}`;}finally{resetImportUI();}};reader.onerror=()=>{alert("ファイル読込失敗");if(st)st.textContent="ファイル読込エラー";resetImportUI();};reader.readAsText(selectedImportFile);}
    function resetImportUI(){selectedImportFile=null;if(elements.importTagFile)elements.importTagFile.value='';if(elements.importTagsButton)elements.importTagsButton.disabled=true;}

    // --- モーダル (変更なし) ---
    function closeImepureSettingsModal(){if(elements.imepureSettingsModal)elements.imepureSettingsModal.style.display='none';}

    // --- ギャラリー機能 (変更なし) ---
    function populateGallery() { if (!elements.galleryGrid) { console.error("#galleryGrid not found."); return; } if (typeof members === 'undefined' || !Array.isArray(members)) { console.error("`members` data not available."); return; } const grid = elements.galleryGrid; grid.innerHTML = ''; if (elements.galleryLoading) elements.galleryLoading.style.display = 'block'; const selectedMember = elements.galleryMemberFilter?.value || 'all'; const selectedType = elements.galleryTypeFilter?.value || 'all'; const showOnlyWeakPoints = elements.galleryWeakPointFilter?.checked || false; console.log(`Populating gallery: Member=${selectedMember}, Type=${selectedType}, WeakOnly=${showOnlyWeakPoints}`); let allImages = []; members.forEach(member => { if (selectedMember !== 'all' && member.name !== selectedMember) return; Object.entries(member.imageFolders || {}).forEach(([type, folderInfo]) => { if (selectedType !== 'all' && type !== selectedType) return; if (folderInfo?.imageCount > 0 && folderInfo.path) { for (let i = 1; i <= folderInfo.imageCount; i++) { const fileName = `${i}.jpg`; const relativePath = `${member.name}/${type}/${fileName}`; const isWeak = isWeakPointImage(relativePath); if (showOnlyWeakPoints && !isWeak) continue; allImages.push({ member: member.name, type: type, number: i, path: `${folderInfo.path}${fileName}`, relativePath: relativePath, tags: getTagsForImage(relativePath), isWeak: isWeak }); } } }); }); allImages.sort((a, b) => { if (a.isWeak !== b.isWeak) return b.isWeak - a.isWeak; if (a.member !== b.member) return a.member.localeCompare(b.member); if (a.type !== b.type) return a.type === 'ero' ? -1 : (b.type === 'ero' ? 1 : 0); return a.number - b.number; }); if (elements.galleryLoading) elements.galleryLoading.style.display = 'none'; if (allImages.length === 0) { grid.innerHTML = '<p class="gallery-loading">条件に合う画像がありません。</p>'; return; } allImages.forEach(imgData => { const item = document.createElement('div'); item.className = 'gallery-item'; item.dataset.relpath = imgData.relativePath; const imgLink = document.createElement('a'); imgLink.href = imgData.path; imgLink.target = '_blank'; imgLink.title = `クリックで拡大: ${imgData.relativePath}`; const thumb = document.createElement('img'); thumb.className = 'gallery-thumbnail'; thumb.src = imgData.path; thumb.alt = `${imgData.member} ${imgData.type} ${imgData.number}`; thumb.loading = 'lazy'; thumb.onerror = (e) => { e.target.src = 'placeholder.png'; e.target.classList.add('image-error'); }; imgLink.appendChild(thumb); item.appendChild(imgLink); const infoDiv = document.createElement('div'); infoDiv.className = 'gallery-item-info'; const nameSpan = document.createElement('span'); nameSpan.className = 'gallery-item-name'; nameSpan.textContent = imgData.member; const pathSpan = document.createElement('span'); pathSpan.className = 'gallery-item-path'; pathSpan.textContent = `${imgData.type}/${imgData.number}.jpg`; infoDiv.appendChild(nameSpan); infoDiv.appendChild(pathSpan); item.appendChild(infoDiv); const weakButton = document.createElement('button'); weakButton.className = 'weak-point-toggle icon-button'; weakButton.dataset.relpath = imgData.relativePath; updateWeakPointButtonState(weakButton, imgData.isWeak); weakButton.addEventListener('click', handleWeakPointToggleClick); item.appendChild(weakButton); grid.appendChild(item); }); console.log(`Gallery populated with ${allImages.length} items.`); }
    function updateWeakPointButtonState(button, isWeak) { if (button) { button.textContent = isWeak ? '★' : '☆'; button.classList.toggle('is-weak', isWeak); button.title = isWeak ? '弱点解除' : '弱点登録'; } }
    function findGalleryItemAndToggleButton(relativePath, isWeak) { const galleryItem = elements.galleryGrid?.querySelector(`.gallery-item[data-relpath="${CSS.escape(relativePath)}"]`); if (galleryItem) { const button = galleryItem.querySelector('.weak-point-toggle'); updateWeakPointButtonState(button, isWeak); } }

    // --- ステッカー機能 ---
    function initializeStickerFeature() {
        populateStickerChoices();
        initializeStickerBaseHue();
    }

    function initializeStickerBaseHue() {
        const baseHex = typeof STICKER_BASE_COLOR_HEX !== 'undefined' ? STICKER_BASE_COLOR_HEX : '#ff0000';
        const [h, s, l] = hexToHsl(baseHex);
        if (!isNaN(h)) {
            stickerBaseHue = h;
            if (DEBUG_MODE) console.log(`Sticker base hue initialized to: ${stickerBaseHue.toFixed(1)} from ${baseHex}`);
        } else {
            stickerBaseHue = 0;
            console.warn(`Invalid STICKER_BASE_COLOR_HEX '${baseHex}', falling back to hue 0.`);
        }
    }

    function populateStickerChoices() {
        const container = elements.stickerChoiceContainer;
        const loadingEl = elements.stickerLoading;
        if (!container) {
            console.error("Sticker choice container not found.");
            return;
        }
        container.innerHTML = '';

        if (typeof stickerImagePaths === 'undefined' || !Array.isArray(stickerImagePaths) || stickerImagePaths.length === 0) {
            container.innerHTML = '<p class="sticker-loading">ステッカー設定なし</p>';
            console.warn("No sticker images defined in config.js");
            return;
        }

        stickerImagePaths.forEach(imgPath => {
            const button = document.createElement('button');
            button.className = 'sticker-choice-button';
            button.dataset.stickerPath = imgPath;
            button.title = `ステッカーを選択: ${imgPath.split('/').pop()}`;

            const img = document.createElement('img');
            img.className = 'sticker-choice-img';
            img.src = imgPath;
            img.alt = `ステッカー ${imgPath.split('/').pop()}`;
            img.loading = 'lazy';
            img.onerror = (e) => {
                console.warn(`Failed to load sticker choice: ${imgPath}`);
                e.target.alt = '読込失敗';
                button.style.display = 'none';
            };

            button.appendChild(img);
            button.addEventListener('click', handleStickerChoiceClick);
            container.appendChild(button);
        });

        if (DEBUG_MODE) console.log(`Populated ${stickerImagePaths.length} sticker choices.`);
    }

    function handleStickerChoiceClick(event) {
        const button = event.currentTarget;
        const path = button.dataset.stickerPath;

        if (path) {
            if (selectedStickerPath === path) {
                // 同じボタンが再度クリックされたら選択解除
                deselectSticker();
            } else {
                // 違うボタン、または未選択状態からのクリックなら選択
                selectSticker(path);
            }
        }
    }

    function selectSticker(stickerPath) {
        if (isTaggingMode) return;

        // 他のボタンの選択状態を解除
        deselectSticker();

        selectedStickerPath = stickerPath;

        // 選択されたボタンにクラスを付与
        const selectedButton = elements.stickerChoiceContainer?.querySelector(`.sticker-choice-button[data-sticker-path="${CSS.escape(stickerPath)}"]`);
        if (selectedButton) {
            selectedButton.classList.add('selected');
        }

        if (elements.fortuneDisplayArea) {
            elements.fortuneDisplayArea.classList.add('sticker-cursor-active');
        }
        if (elements.stickerCursorPreview) {
            elements.stickerCursorPreview.style.backgroundImage = `url('${stickerPath}')`;
            elements.stickerCursorPreview.style.display = 'block';
            elements.stickerCursorPreview.style.opacity = '0';
        }
        if (elements.fortuneButton) elements.fortuneButton.disabled = true;
        if (elements.ejaculateButton) elements.ejaculateButton.disabled = true;
        if (DEBUG_MODE) console.log(`Sticker selected: ${stickerPath}`);
    }

    function deselectSticker() {
        const currentlySelectedPath = selectedStickerPath;
        selectedStickerPath = null;

        // ボタンの選択状態を解除
        if (currentlySelectedPath && elements.stickerChoiceContainer) {
            const selectedButton = elements.stickerChoiceContainer.querySelector(`.sticker-choice-button[data-sticker-path="${CSS.escape(currentlySelectedPath)}"]`);
            if (selectedButton) {
                selectedButton.classList.remove('selected');
            }
        }
        // 全てのボタンから .selected を削除 (念のため)
        elements.stickerChoiceContainer?.querySelectorAll('.sticker-choice-button.selected').forEach(btn => btn.classList.remove('selected'));


        if (elements.fortuneDisplayArea) {
            elements.fortuneDisplayArea.classList.remove('sticker-cursor-active');
        }
        if (elements.stickerCursorPreview) {
            elements.stickerCursorPreview.style.display = 'none';
            elements.stickerCursorPreview.style.opacity = '0';
        }
        if (!isTaggingMode && canRunFortune && elements.fortuneButton) {
             elements.fortuneButton.disabled = false;
        }
        if (!isTaggingMode && currentDisplayedMemberName && elements.ejaculateButton) {
             elements.ejaculateButton.disabled = false;
        }
        if (DEBUG_MODE && currentlySelectedPath) console.log("Sticker deselected.");
    }

    function handleStickerMouseMove(event) {
        if (!selectedStickerPath || !elements.stickerCursorPreview) return;

        const preview = elements.stickerCursorPreview;
        preview.style.left = `${event.clientX}px`;
        preview.style.top = `${event.clientY}px`;
        preview.style.opacity = '0.8';
    }

     function handleStickerMouseLeave(event) {
         if (selectedStickerPath && elements.stickerCursorPreview) {
             elements.stickerCursorPreview.style.opacity = '0';
         }
     }

    function handleStickerClick(event) {
        if (!selectedStickerPath || !elements.fortuneDisplayArea) {
            return;
        }
        // 貼り付け可能なエリア（例: 画像要素の上など）かどうかのチェックを追加することも可能
        // if (!event.target || event.target.id !== 'memberImage') return; // 例: memberImage の上だけ

        event.preventDefault();
        event.stopPropagation();
        pasteSticker(event);
    }

    function pasteSticker(event) {
        if (!selectedStickerPath || !elements.fortuneDisplayArea) return;

        const displayArea = elements.fortuneDisplayArea;
        const rect = displayArea.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const percentX = (x / rect.width) * 100;
        const percentY = (y / rect.height) * 100;

        const sticker = document.createElement('img');
        sticker.className = 'pasted-sticker';
        sticker.src = selectedStickerPath;
        sticker.alt = '貼り付けられたステッカー';
        sticker.style.left = `${percentX}%`;
        sticker.style.top = `${percentY}%`;

        const rotation = calculateHueRotation(stickerBaseHue, currentDisplayedMemberColor);
        if (rotation !== 0) {
            sticker.style.filter = `hue-rotate(${rotation}deg)`;
        }

        const randomRotation = (Math.random() - 0.5) * 20;
        const randomScale = 1 + (Math.random() - 0.5) * 0.2; // 0.9 ~ 1.1 倍
        sticker.style.transform = `translate(-50%, -50%) rotate(${randomRotation.toFixed(1)}deg) scale(${randomScale.toFixed(2)})`;

        displayArea.appendChild(sticker);

        if (DEBUG_MODE) console.log(`Sticker pasted: ${selectedStickerPath} at (${percentX.toFixed(1)}%, ${percentY.toFixed(1)}%) with hue rotation ${rotation.toFixed(1)}deg`);

        // deselectSticker(); // 削除: 連続貼り付けのため
    }

    // ステッカー永続化のため、この関数は基本的に使わない。
    // 必要なら別途クリアボタンなどで呼び出す。
    function clearPastedStickers() {
        if (!elements.fortuneDisplayArea) return;
        const stickers = elements.fortuneDisplayArea.querySelectorAll('.pasted-sticker');
        stickers.forEach(sticker => sticker.remove());
        if (DEBUG_MODE && stickers.length > 0) console.log(`Cleared ${stickers.length} pasted stickers.`);
    }

    function calculateHueRotation(baseHue, targetColorHex) {
        if (!targetColorHex) return 0;

        const [targetHue, targetSat, targetLight] = hexToHsl(targetColorHex);

        if (isNaN(targetHue) || targetSat < 10 || targetLight < 5 || targetLight > 95) {
            return 0;
        }

        let diff = targetHue - baseHue;
        while (diff <= -180) diff += 360;
        while (diff > 180) diff -= 360;

        return Math.round(diff);
    }


    // --- アプリケーション開始 ---
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initializeApp); else initializeApp();

    // --- グローバル公開 ---
    window.onspApp = window.onspApp || {};
    window.onspApp.closeSettingsModal = closeImepureSettingsModal;

})(); // IIFE 即時実行