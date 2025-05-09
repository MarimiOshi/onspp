// ==================================================================
// feature_mojicollage.js - 文字コラ生成機能 (パラメータ反映修正版 v6)
// ==================================================================

window.mojiCollageModule = (function() {
    'use strict';

    // --- DOM要素キャッシュ ---
    const elements = {};
    let ctx = null;
    let uploadedImage = null;
    const DEBUG_MODE = true; // デバッグログ有効

    // --- 初期化 ---
    function initialize(getElementFunc) {
        console.log("Initializing Moji Collage Module...");
        // ★★★ IDリストを再確認 ★★★
        const elementIds = [
            'collageImageInput', 'previewCanvas', 'collageTextInput',
            'fontSizeSlider', 'fontSizeValue', 'fontFamilySelect', 'textColorPicker',
            'strokeColorPicker', 'strokeWidthSlider', 'strokeWidthValue',
            'textPosX', 'textPosY', 'textRotationSlider', 'rotationValue',
            'generateCollageButton', 'resultArea', 'resultImage', 'downloadLink'
            // 'generateAITextButton', 'imageDescriptionInput' // AI機能が必要なら追加
        ];
        try {
            elementIds.forEach(id => {
                elements[id] = getElementFunc(id);
                 // resultArea関連以外は必須チェック強化
                if (!elements[id] && !['resultArea', 'resultImage', 'downloadLink', 'generateAITextButton', 'imageDescriptionInput'].includes(id)) {
                     throw new Error(`Required element #${id} not found.`);
                } else if (!elements[id]) {
                     console.warn(`Optional/Result element #${id} not found.`);
                }
            });

            if (elements.previewCanvas && elements.previewCanvas.getContext) {
                ctx = elements.previewCanvas.getContext('2d');
                if(!ctx) throw new Error("Failed to get 2D context.");
                const canvas = elements.previewCanvas;
                canvas.width = 400; canvas.height = 300; // 初期サイズ
                ctx.fillStyle = '#eee'; ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#999'; ctx.textAlign = 'center'; ctx.font = '16px sans-serif';
                ctx.fillText('ここに画像をアップロード', canvas.width / 2, canvas.height / 2);
                elements.previewCanvas.classList.add('placeholder');
                if(DEBUG_MODE) console.log("Canvas context obtained and initialized.");
            } else {
                 throw new Error("Canvas not supported or context could not be created.");
            }

            attachEventListeners();
            // 初期値表示更新
            updateSliderValueText('fontSizeSlider', 'fontSizeValue');
            updateSliderValueText('strokeWidthSlider', 'strokeWidthValue');
            updateSliderValueText('textRotationSlider', 'rotationValue');
            console.log("--- Moji Collage Module Initialized ---");
            return true;
        } catch (error) {
            console.error("Moji Collage initialization failed:", error);
            disableCollageFeature();
            return false;
        }
    }

    // --- イベントリスナー設定 ---
    function attachEventListeners() {
        if (DEBUG_MODE) console.log("Attaching event listeners...");
        let listenerAttached = false; // リスナーが1つでも設定されたか

        // 画像入力
        if (elements.collageImageInput) {
            elements.collageImageInput.addEventListener('change', handleImageUpload);
            listenerAttached = true;
        } else console.warn("Listener not attached: #collageImageInput not found.");

        // テキスト入力
        if (elements.collageTextInput) {
            elements.collageTextInput.addEventListener('input', () => {
                if(DEBUG_MODE) console.log("[Event] Text input changed");
                updatePreview();
            });
            listenerAttached = true;
        } else console.warn("Listener not attached: #collageTextInput not found.");

        // フォントサイズ
        if (elements.fontSizeSlider) {
            elements.fontSizeSlider.addEventListener('input', () => {
                if(DEBUG_MODE) console.log("[Event] Font size slider changed");
                updateSliderValueText('fontSizeSlider', 'fontSizeValue');
                updatePreview();
            });
            listenerAttached = true;
        } else console.warn("Listener not attached: #fontSizeSlider not found.");

        // フォントファミリー
        if (elements.fontFamilySelect) {
             elements.fontFamilySelect.addEventListener('change', () => {
                 if(DEBUG_MODE) console.log("[Event] Font family changed");
                 updatePreview();
             });
             listenerAttached = true;
        } else console.warn("Listener not attached: #fontFamilySelect not found.");

        // 文字色
        if (elements.textColorPicker) {
            elements.textColorPicker.addEventListener('input', () => {
                if(DEBUG_MODE) console.log("[Event] Text color changed");
                updatePreview();
            });
            listenerAttached = true;
        } else console.warn("Listener not attached: #textColorPicker not found.");

        // 縁取り色
        if (elements.strokeColorPicker) {
             elements.strokeColorPicker.addEventListener('input', () => {
                 if(DEBUG_MODE) console.log("[Event] Stroke color changed");
                 updatePreview();
             });
             listenerAttached = true;
        } else console.warn("Listener not attached: #strokeColorPicker not found.");

        // 縁取り太さ
        if (elements.strokeWidthSlider) {
             elements.strokeWidthSlider.addEventListener('input', () => {
                 if(DEBUG_MODE) console.log("[Event] Stroke width changed");
                 updateSliderValueText('strokeWidthSlider', 'strokeWidthValue');
                 updatePreview();
             });
             listenerAttached = true;
        } else console.warn("Listener not attached: #strokeWidthSlider not found.");

        // 位置X
        if (elements.textPosX) {
             elements.textPosX.addEventListener('input', () => {
                 if(DEBUG_MODE) console.log("[Event] Position X changed");
                 updatePreview();
             });
             listenerAttached = true;
        } else console.warn("Listener not attached: #textPosX not found.");

        // 位置Y
        if (elements.textPosY) {
            elements.textPosY.addEventListener('input', () => {
                if(DEBUG_MODE) console.log("[Event] Position Y changed");
                updatePreview();
            });
            listenerAttached = true;
        } else console.warn("Listener not attached: #textPosY not found.");

        // 回転
        if (elements.textRotationSlider) {
            elements.textRotationSlider.addEventListener('input', () => {
                if(DEBUG_MODE) console.log("[Event] Rotation changed");
                updateSliderValueText('textRotationSlider', 'rotationValue');
                updatePreview();
            });
            listenerAttached = true;
        } else console.warn("Listener not attached: #textRotationSlider not found.");

        // 生成ボタン
        if (elements.generateCollageButton) {
            elements.generateCollageButton.addEventListener('click', handleGenerateButtonClick);
            listenerAttached = true;
        } else console.warn("Listener not attached: #generateCollageButton not found.");

        if (listenerAttached && DEBUG_MODE) console.log("Event listeners attached successfully (or attempted).");
        else if (!listenerAttached) console.error("FATAL: No parameter event listeners could be attached!");
    }

    // スライダーの値表示更新用ヘルパー
    function updateSliderValueText(sliderId, valueId) {
        const slider = elements[sliderId];
        const valueSpan = elements[valueId];
        if (slider && valueSpan) {
            valueSpan.textContent = slider.value;
        }
    }

    // --- 画像アップロード処理 ---
    function handleImageUpload(event) {
        const file = event.target.files?.[0];
        if (DEBUG_MODE) console.log("[handleImageUpload] File selected:", file);
        if (!file || !file.type.startsWith('image/')) {
             if(file) alert("画像ファイルを選択してください。"); uploadedImage = null;
             if (ctx) { const canvas = elements.previewCanvas; canvas.width = 400; canvas.height = 300; ctx.fillStyle = '#eee'; ctx.fillRect(0, 0, 400, 300); ctx.fillStyle = '#999'; ctx.textAlign = 'center'; ctx.font = '16px sans-serif'; ctx.fillText('画像を再選択', 200, 150); canvas.classList.add('placeholder'); } return;
        }
        const reader = new FileReader();
        reader.onload = function(e) {
            if (DEBUG_MODE) console.log("[FileReader] onload triggered.");
            uploadedImage = new Image();
            uploadedImage.onload = () => {
                if (!uploadedImage.complete || typeof uploadedImage.naturalWidth === "undefined" || uploadedImage.naturalWidth === 0) { console.error("[Image onload] Image seems invalid."); alert("画像読込失敗(InvImg)"); uploadedImage = null; if(ctx){/* Canvas初期化 */} return; }
                if (DEBUG_MODE) console.log(`[Image onload] Success: ${uploadedImage.naturalWidth}x${uploadedImage.naturalHeight}`);
                const canvas = elements.previewCanvas;
                // ★★★ CSSでサイズ指定しているなら、Canvasのwidth/height属性も合わせる ★★★
                canvas.width = elements.previewCanvas.clientWidth; // 表示上の幅に合わせる
                canvas.height = elements.previewCanvas.clientHeight; // 表示上の高さに合わせる
                console.log(`[Image onload] Canvas resized to: ${canvas.width}x${canvas.height}`);

                if (elements.textPosX && elements.textPosY) { elements.textPosX.value = elements.textPosX.value || Math.round(canvas.width / 2); elements.textPosY.value = elements.textPosY.value || Math.round(canvas.height * 0.9); }
                elements.previewCanvas.classList.remove('placeholder');
                console.log("[Image onload] Calling updatePreview...");
                updatePreview();
            }
            uploadedImage.onerror = () => { console.error("Image loading failed (onerror event)."); alert("画像読み込み失敗"); uploadedImage = null; if (ctx) { /* Canvas初期化 */ } }
            uploadedImage.src = e.target.result; if (DEBUG_MODE) console.log("[FileReader] Image src set.");
        }
         reader.onerror = () => { console.error("File reading failed."); alert("ファイル読み込み失敗"); uploadedImage = null; if(ctx){ /* Canvas初期化 */ } };
        reader.readAsDataURL(file);
    }

    // --- プレビュー更新処理 ---
    function updatePreview() {
        if (DEBUG_MODE) console.log("--- updatePreview START ---");
        if (!ctx) { console.warn("Preview update skipped: No Canvas context."); return; }
        if (!uploadedImage || !uploadedImage.complete || uploadedImage.naturalWidth === 0) { if (DEBUG_MODE) console.log("Preview update skipped: Image not ready."); return; }
        const canvas = elements.previewCanvas; if (!canvas) { console.error("Preview canvas element not found."); return; }
        if (DEBUG_MODE) console.log(`Canvas size for update: ${canvas.width}x${canvas.height}`);

        // パラメータ取得と数値変換
        const text = elements.textInput?.value ?? '';
        const fontSize = parseInt(elements.fontSizeSlider?.value ?? 30, 10);
        const fontFamily = elements.fontFamilySelect?.value ?? 'Arial';
        const textColor = elements.textColorPicker?.value ?? '#ffffff';
        const strokeColor = elements.strokeColorPicker?.value ?? '#000000';
        const strokeWidth = parseFloat(elements.strokeWidthSlider?.value ?? 2);
        let posX = parseInt(elements.textPosX?.value ?? Math.round(canvas.width / 2), 10);
        let posY = parseInt(elements.textPosY?.value ?? Math.round(canvas.height * 0.9), 10);
        const rotation = parseInt(elements.textRotationSlider?.value ?? 0, 10);

        // NaNチェック
        if ([fontSize, strokeWidth, posX, posY, rotation].some(isNaN)) {
             console.error("Invalid parameter value (NaN) detected. Aborting draw.", {fontSize, strokeWidth, posX, posY, rotation});
             // エラー表示
             ctx.fillStyle = '#fcc'; ctx.fillRect(0,0,canvas.width, canvas.height);
             ctx.fillStyle = '#c00'; ctx.textAlign = 'center'; ctx.font = '16px sans-serif';
             ctx.fillText('パラメータエラー', canvas.width / 2, canvas.height / 2);
             return;
        }

        if (DEBUG_MODE) console.log("[updatePreview] Params:", {text, fontSize, fontFamily, textColor, strokeColor, strokeWidth, posX, posY, rotation});

        // Canvasクリア
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (DEBUG_MODE) console.log("[updatePreview] Canvas cleared.");

        // 画像描画
        try {
            if (DEBUG_MODE) console.log("[updatePreview] Drawing image...");
            // Canvasサイズに合わせて画像を描画
            ctx.drawImage(uploadedImage, 0, 0, canvas.width, canvas.height);
            if (DEBUG_MODE) {
                 const pixelData = ctx.getImageData(0, 0, 1, 1).data;
                 console.log(`[updatePreview] drawImage executed. Top-left pixel alpha: ${pixelData[3]}`);
                 if (pixelData[3] === 0) console.warn("[updatePreview] drawImage might have failed (top-left pixel is transparent).");
            }
        } catch (e) {
            console.error("[updatePreview] Error during drawImage:", e);
            ctx.fillStyle = '#fdd'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#f00'; ctx.textAlign = 'center'; ctx.font = '16px sans-serif';
            ctx.fillText('画像描画エラー', canvas.width / 2, canvas.height / 2);
            return;
        }

        // テキスト描画
        if (text.trim() !== '') {
            ctx.save();
            try {
                if (DEBUG_MODE) console.log("[updatePreview] Drawing text...");
                ctx.font = `${fontSize}px "${fontFamily}"`; // フォント名を引用符で囲む
                ctx.fillStyle = textColor;
                ctx.strokeStyle = strokeColor;
                ctx.lineWidth = strokeWidth;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                ctx.translate(posX, posY);
                if (rotation !== 0) { const rad = rotation * Math.PI / 180; ctx.rotate(rad); }
                if (strokeWidth > 0) { if(DEBUG_MODE) console.log(`StrokeText: '${text}' at (0, 0 relative to ${posX},${posY})`); ctx.strokeText(text, 0, 0); }
                if(DEBUG_MODE) console.log(`FillText: '${text}' at (0, 0 relative to ${posX},${posY})`);
                ctx.fillText(text, 0, 0);

            } catch (e) { console.error("[updatePreview] Error drawing text:", e); }
            finally { ctx.restore(); if (DEBUG_MODE) console.log("[updatePreview] Context restored."); }
        } else { if (DEBUG_MODE) console.log("[updatePreview] No text to draw."); }

        console.log("--- updatePreview END ---");
    }

     // --- 生成ボタンクリック処理 ---
     function handleGenerateButtonClick() {
         if (DEBUG_MODE) console.log("Generate button clicked.");
         // プレビューを最新状態にする（現在のパラメータで描画）
         updatePreview();
         // ダウンロードリンク生成処理を呼び出す
         generateCollageDownload();
     }

    // --- 文字コラ生成処理 (ダウンロードリンク生成) ---
    function generateCollageDownload() {
        if (!uploadedImage) { alert("まず画像をアップロードしてください。"); return; }
        if (!ctx) { alert("Canvas準備エラー。"); return; }
        if (!elements.resultArea || !elements.resultImage || !elements.downloadLink) { alert("結果表示要素エラー。"); return; }
        if (DEBUG_MODE) console.log("Generating final collage for download...");
        try {
            const dataUrl = elements.previewCanvas.toDataURL('image/png');
            if (!dataUrl || dataUrl === 'data:,') { throw new Error("CanvasからデータURL生成失敗。"); }
            elements.resultImage.src = dataUrl;
            elements.downloadLink.href = dataUrl;
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const textPart = (elements.textInput?.value || 'collage').substring(0, 15).replace(/[^a-zA-Z0-9_\-]/g, '_');
            elements.downloadLink.download = `moji_${textPart}_${timestamp}.png`;
            elements.resultArea.style.display = 'block';
            console.log("Collage finalized and ready for download.");
        } catch (e) {
            console.error("Error generating collage data URL or setting results:", e);
            alert(`文字コラ生成失敗: ${e.message}`);
            elements.resultArea.style.display = 'none';
        }
    }

    // --- 機能無効化 ---
    function disableCollageFeature() {
        const section = document.getElementById('mojiCollageSection');
        if (section) { section.innerHTML = `<p class="error-message">文字コラ機能エラー</p>`; }
        console.error("Moji Collage feature disabled.");
    }

    // --- 公開インターフェース ---
    return { initialize: initialize };
})();