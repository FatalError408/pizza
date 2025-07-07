// ui.js

// === DOM Elements Cache ===
const dom = {
    customerImg: document.getElementById('customer-img'),
    loadingOverlay: document.getElementById('loading-overlay'),
    loadingText: document.getElementById('loading-text'),
    chatLog: document.getElementById('chat-log'),
    userInput: document.getElementById('user-input'),
    sendBtn: document.getElementById('send-btn'),
    reviewsList: document.getElementById('reviews-list'),
    kickBtn: document.getElementById('kick-btn'),
    // Wrappers for visibility toggle
    chatContainerWrapper: document.getElementById('chat-container-wrapper'),
    kickBtnWrapper: document.getElementById('kick-btn-wrapper'),
    reviewBoardWrapper: document.getElementById('review-board-wrapper'),
    menuToggleBtn: document.getElementById('menu-toggle-btn'),
    menuBoard: document.getElementById('menu-board'),
    menuContent: document.getElementById('menu-content'),
    menuEditorOverlay: document.getElementById('menu-editor-overlay'),
    menuEditorModal: document.getElementById('menu-editor-modal'),
    editMenuBtn: document.getElementById('edit-menu-btn'),
    closeMenuEditorBtn: document.getElementById('close-menu-editor'),
    menuForm: document.getElementById('menu-form'),
    editorCategoriesContainer: document.getElementById('editor-categories-container'),
    addCategoryBtn: document.getElementById('add-category-btn'),
    // Customer Maker addition
    customerMakerToggleBtn: document.getElementById('customer-maker-toggle-btn'),
    customerMakerOverlay: document.getElementById('customer-maker-overlay'),
    customerMakerModal: document.getElementById('customer-maker-modal'),
    customerMakerForm: document.getElementById('customer-maker-form'),
    customerMakerContent: document.getElementById('customer-maker-content'),
    customerTypesContainer: document.getElementById('customer-types-container'),
    addCustomerTypeBtn: document.getElementById('add-customer-type-btn'),
    closeCustomerMakerBtn: document.getElementById('close-customer-maker'),

    bgMusic: document.getElementById('bg-music'),
    sfxRegister: document.getElementById('sfx-register'),
    sfxKick: document.getElementById('sfx-kick'),
    sfxTalk: document.getElementById('sfx-talk'),
    sfxSplat: document.getElementById('sfx-splat'),
    sfxScream: document.getElementById('sfx-scream'),

    // Furniture UI
    furnitureBtn: document.getElementById('furniture-btn'),
    furniturePanel: document.getElementById('furniture-panel'),
    furnitureOptions: document.getElementById('furniture-options'),
    furnitureStatsPanel: document.getElementById('furniture-stats-panel'),
    furnitureStatsContent: document.getElementById('furniture-stats-content'),
    ambianceDescriptionText: document.getElementById('ambiance-description-text'),
    placedFurnitureContainer: document.getElementById('placed-furniture-container'),
    closeFurnitureModeBtn: document.getElementById('close-furniture-mode-btn'),
    resetFurnitureBtn: document.getElementById('reset-furniture-btn'),
    placedCount: document.getElementById('placed-count'),
    maxCount: document.getElementById('max-count'),
    gameContainer: document.getElementById('game-container'),
    body: document.body,
    // Furniture Creator
    furnitureCreatorOverlay: document.getElementById('furniture-creator-overlay'),
    furnitureCreatorForm: document.getElementById('furniture-creator-form'),
    closeFurnitureCreatorBtn: document.getElementById('close-furniture-creator'),
    // Settings
    settingCustomerLeaveCheckbox: document.getElementById('setting-customer-leave'),
    settingDebugLogCheckbox: document.getElementById('setting-debug-log'),
    aiDebugLogContainer: document.getElementById('ai-debug-log-container'),
};

// === Sound ===
export function playSound(audioElement) {
    audioElement.currentTime = 0;
    audioElement.play().catch(error => console.error("Error playing sound:", error));
}

// === UI Updates ===
export function showLoading(text) {
    dom.loadingText.textContent = text;
    dom.loadingOverlay.style.display = 'flex';
}

export function hideLoading() {
    dom.loadingOverlay.style.display = 'none';
}

export function setCustomerImage(url) {
    dom.customerImg.src = url;
}

export function getCustomerImage() {
    return dom.customerImg;
}

export function addMessage(text, sender) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', sender);
    messageElement.textContent = text;
    if (sender === 'ai') {
        playSound(dom.sfxTalk);
        dom.customerImg.classList.add('talking');
        dom.customerImg.addEventListener('animationend', () => {
            dom.customerImg.classList.remove('talking');
        }, { once: true });
    }
    if (sender === 'event') {
        // Sounds for events are handled by the functions that trigger them
    }
    dom.chatLog.appendChild(messageElement);
    dom.chatLog.scrollTop = dom.chatLog.scrollHeight;
}

export function addDebugLog(title, content) {
    if (!dom.settingDebugLogCheckbox.checked) return;

    const entry = document.createElement('div');
    entry.className = 'debug-log-entry';

    const titleEl = document.createElement('div');
    titleEl.className = 'log-title';
    titleEl.textContent = `[${new Date().toLocaleTimeString()}] ${title}`;

    const contentEl = document.createElement('pre');
    contentEl.className = 'log-content';
    contentEl.textContent = content;

    entry.append(titleEl, contentEl);
    dom.aiDebugLogContainer.prepend(entry);

    // Limit log size to prevent memory issues
    while (dom.aiDebugLogContainer.children.length > 20) {
        dom.aiDebugLogContainer.lastChild.remove();
    }
}

export function clearChat() {
    dom.chatLog.innerHTML = '<div class="message system">A new customer is approaching the counter...</div>';
}

export function addReviewToBoard(reviewText, customerName) {
    const reviewElement = document.createElement('div');
    reviewElement.classList.add('review');
    reviewElement.innerHTML = `<blockquote>"${reviewText}"</blockquote><cite>- ${customerName}</cite>`;
    dom.reviewsList.prepend(reviewElement);
}

export function updateInteractionControls(enabled, placeholder = '') {
    dom.userInput.disabled = !enabled;
    dom.sendBtn.disabled = !enabled;
    dom.kickBtn.disabled = !enabled;
    if (placeholder) {
        dom.userInput.placeholder = placeholder;
    }
}

// Allows updating the Settings UI checkbox from external logic
export function setCustomerLeaveCheckbox(val) {
    const cb = dom.settingCustomerLeaveCheckbox;
    if (cb) cb.checked = !!val;
}

// Allows updating the Settings UI checkbox from external logic
export function setDebugLogCheckbox(val) {
    if (dom.settingDebugLogCheckbox) {
        dom.settingDebugLogCheckbox.checked = !!val;
        dom.aiDebugLogContainer.style.display = val ? 'block' : 'none';
    }
}

// === Menu Rendering ===
function renderMenuHTML(menu) {
    let html = "";
    for (const cat of menu) {
        html += `<h3>${cat.title}</h3><ul>`;
        for (const item of cat.items) {
            html += `<li><strong>${item.name}:</strong> ${item.desc ? item.desc : ''}</li>`;
        }
        html += "</ul>";
    }
    return html;
}

export function repaintMenuBoard(menu) {
    dom.menuContent.innerHTML = renderMenuHTML(menu);
}

// === Menu Editor ===
function renderMenuEditor(menu, rerenderCallback) {
    dom.editorCategoriesContainer.innerHTML = '';
    menu.forEach((cat, catIdx) => {
        const block = document.createElement('div');
        block.className = 'editor-category-block';
        const catHeader = document.createElement('div');
        catHeader.className = "editor-category-header";
        const titleInput = document.createElement('input');
        titleInput.className = 'editor-category-title-input';
        titleInput.value = cat.title;
        titleInput.placeholder = 'Category, e.g. Pizzas';
        titleInput.autocomplete = 'off';
        titleInput.addEventListener('input', (e) => menu[catIdx].title = e.target.value);
        const removeBtn = document.createElement('button');
        removeBtn.className = 'editor-category-remove';
        removeBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
        removeBtn.title = 'Delete category';
        removeBtn.addEventListener('click', () => {
            if (confirm(`Delete category "${cat.title}" and all items?`)) {
                menu.splice(catIdx, 1);
                rerenderCallback();
            }
        });
        catHeader.append(document.createTextNode(''), titleInput, removeBtn);
        block.append(catHeader);

        const itemsDiv = document.createElement('div');
        itemsDiv.className = "editor-category-items";
        cat.items.forEach((item, itemIdx) => {
            const itemRow = document.createElement('div');
            itemRow.className = 'editor-item-row';
            const nameInput = document.createElement('input');
            nameInput.className = 'editor-item-name';
            nameInput.value = item.name;
            nameInput.placeholder = 'Name, e.g. Pepperoni Pizza';
            nameInput.addEventListener('input', (e) => menu[catIdx].items[itemIdx].name = e.target.value);
            const descInput = document.createElement('input');
            descInput.className = 'editor-item-desc';
            descInput.value = item.desc;
            descInput.placeholder = 'Description (optional)';
            descInput.addEventListener('input', (e) => menu[catIdx].items[itemIdx].desc = e.target.value);
            const removeItemBtn = document.createElement('button');
            removeItemBtn.className = 'editor-item-remove';
            removeItemBtn.innerHTML = '<i class="fas fa-minus-circle"></i>';
            removeItemBtn.title = 'Remove item';
            removeItemBtn.addEventListener('click', () => {
                menu[catIdx].items.splice(itemIdx, 1);
                rerenderCallback();
            });
            itemRow.append(nameInput, descInput, removeItemBtn);
            itemsDiv.append(itemRow);
        });

        const addItemBtn = document.createElement('button');
        addItemBtn.className = "add-item-btn";
        addItemBtn.type = "button";
        addItemBtn.innerHTML = '<i class="fas fa-plus"></i> Add Item';
        addItemBtn.addEventListener('click', () => {
            menu[catIdx].items.push({ name: "", desc: "" });
            rerenderCallback();
        });

        itemsDiv.append(addItemBtn);
        block.append(itemsDiv);
        dom.editorCategoriesContainer.append(block);
    });
}

function showMenuEditor(menu, rerenderCallback) {
    renderMenuEditor(menu, () => renderMenuEditor(menu, rerenderCallback));
    dom.menuEditorOverlay.style.display = 'flex';
}

function hideMenuEditor() {
    dom.menuEditorOverlay.style.display = 'none';
}

// === CUSTOMER MAKER UI ====

// Editable customers: [{name, system_prompt, image_prompt}]
function renderCustomerMakerEditor(customerTypes, onChangeCallback) {
    dom.customerTypesContainer.innerHTML = '';
    customerTypes.forEach((cust, idx) => {
        const block = document.createElement('div');
        block.className = 'customer-type-block';

        // Header row: name field + remove
        const header = document.createElement('div');
        header.className = 'customer-type-header';
        const nameInput = document.createElement('input');
        nameInput.value = cust.name || '';
        nameInput.placeholder = 'Customer Name';
        nameInput.autocomplete = 'off';
        nameInput.style.maxWidth = '240px';
        nameInput.addEventListener('input', e => {
            customerTypes[idx].name = e.target.value;
        });
        const removeBtn = document.createElement('button');
        removeBtn.className = 'customer-type-remove';
        removeBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
        removeBtn.title = 'Delete customer type';
        removeBtn.addEventListener('click', () => {
            if (confirm(`Delete customer type "${cust.name}"?`)) {
                customerTypes.splice(idx, 1);
                onChangeCallback();
            }
        });
        header.append(nameInput, removeBtn);

        // Fields
        const fieldsDiv = document.createElement('div');
        fieldsDiv.className = "customer-type-fields";
        
        // SYSTEM PROMPT
        const promptLabel = document.createElement('label');
        promptLabel.textContent = 'AI Prompt';
        promptLabel.style.fontSize = '0.89em';
        promptLabel.title = 'What the AI should do! Use {MENU} for where the menu gets inserted.';

        const promptArea = document.createElement('textarea');
        promptArea.value = cust.system_prompt || '';
        promptArea.placeholder = "System prompt for this customer. E.g. 'You are {name}, a rude customer... The menu is: {MENU}'";
        promptArea.rows = 2;
        promptArea.addEventListener('input', e => (customerTypes[idx].system_prompt = e.target.value));
 
         // IMAGE PROMPT
         const imageLabel = document.createElement('label');
         imageLabel.textContent = 'Image Prompt';
         imageLabel.style.fontSize = '0.89em';
         imageLabel.title = 'Prompt for AI image generator describing this customer type. {MENU} can be used, too.';

         const imageArea = document.createElement('textarea');
         imageArea.value = cust.image_prompt || '';
         imageArea.placeholder = "Prompt describing appearance for image generation...";
         imageArea.rows = 1;
         imageArea.addEventListener('input', e => (customerTypes[idx].image_prompt = e.target.value));
 
        // --- NEW: Custom Image Upload ---
        const uploadContainer = document.createElement('div');
        uploadContainer.className = 'customer-image-upload-container';

        const uploadLabel = document.createElement('label');
        uploadLabel.textContent = 'Or Upload Image (Overrides AI Prompt):';
        
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        
        const previewImg = document.createElement('img');
        previewImg.className = 'customer-image-preview';
        previewImg.src = cust.imageUrl || '';

        fileInput.addEventListener('change', () => {
            const file = fileInput.files[0];
            if (file) {
                // Convert to dataURL to make it stable across renders/saves
                const reader = new FileReader();
                reader.onload = (e) => {
                    const dataUrl = e.target.result;
                    customerTypes[idx].imageUrl = dataUrl;
                    previewImg.src = dataUrl;
                };
                reader.readAsDataURL(file);
            } else {
                customerTypes[idx].imageUrl = null;
                previewImg.src = '';
            }
        });

        uploadContainer.append(uploadLabel, fileInput, previewImg);

        fieldsDiv.append(promptLabel, promptArea, imageLabel, imageArea, uploadContainer);
 
         block.append(header, fieldsDiv);
         dom.customerTypesContainer.append(block);
    });
}

export function showCustomerMaker(customerTypesArr, opts = {}) {
    let draftTypes = JSON.parse(JSON.stringify(customerTypesArr));
    function rerender() {
        renderCustomerMakerEditor(draftTypes, rerender);
    }
    renderCustomerMakerEditor(draftTypes, rerender);
    dom.customerMakerOverlay.style.display = 'flex';

    // Save workflow
    dom.customerMakerForm.onsubmit = (e) => {
        e.preventDefault();
        opts.onSave && opts.onSave(draftTypes);
    };
    dom.addCustomerTypeBtn.onclick = () => {
        draftTypes.push({
            name: "",
            system_prompt: "",
            image_prompt: ""
        });
        rerender();
    };
    dom.closeCustomerMakerBtn.onclick = () => {
        opts.onClose && opts.onClose();
    };
    dom.customerMakerOverlay.onclick = (e) => {
        if (e.target === dom.customerMakerOverlay) {
             opts.onClose && opts.onClose();
        }
    };

    // UI toggle button state
    dom.customerMakerToggleBtn.classList.add('active');
}

export function hideCustomerMaker() {
    dom.customerMakerOverlay.style.display = 'none';
    dom.customerMakerToggleBtn.classList.remove('active');
}

export function showMeatballAnimation(startRect, endRect) {
    const meatball = document.createElement('img');
    meatball.src = '/meatball.png';
    meatball.className = 'meatball-animation';

    const startX = startRect.left + startRect.width / 2;
    const startY = startRect.top + startRect.height / 2;
    
    // End position is the customer's face-ish area
    const endX = endRect.left + endRect.width * 0.5;
    const endY = endRect.top + endRect.height * 0.3;

    // Set initial position
    meatball.style.left = `${startX}px`;
    meatball.style.top = `${startY}px`;

    // Calculate translation for the animation
    const deltaX = endX - startX;
    const deltaY = endY - startY;

    document.body.appendChild(meatball);

    // We use a separate, immediate style update to trigger the CSS transition/animation
    requestAnimationFrame(() => {
        meatball.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(0.3) rotate(360deg)`;
        meatball.style.opacity = '0';
    });

    meatball.addEventListener('transitionend', () => {
        meatball.remove();
    });
}

// === Furniture UI ===

export function showFurnitureCreator(onSave) {
    dom.furnitureCreatorOverlay.style.display = 'flex';
    // Use a one-time event listener for the form submission
    const formSubmitHandler = async (e) => {
        e.preventDefault();
        await onSave(dom.furnitureCreatorForm);
    };
    dom.furnitureCreatorForm.addEventListener('submit', formSubmitHandler, { once: true });
    
    // Event listener for closing
    const closeHandler = () => {
        hideFurnitureCreator();
        dom.furnitureCreatorForm.removeEventListener('submit', formSubmitHandler); // Clean up submit listener
    };
    dom.closeFurnitureCreatorBtn.addEventListener('click', closeHandler, { once: true });

    dom.furnitureCreatorOverlay.onclick = (e) => {
        if (e.target === dom.furnitureCreatorOverlay) {
             closeHandler();
        }
    };
}

export function hideFurnitureCreator() {
    const previewImg = document.getElementById('furniture-image-preview');
    if (previewImg && previewImg.src && previewImg.src.startsWith('blob:')) {
        URL.revokeObjectURL(previewImg.src); // Clean up blob URL
    }
    if (dom.furnitureCreatorOverlay) {
        dom.furnitureCreatorOverlay.style.display = 'none';
    }
    // Also reset form state for next opening
    if(dom.furnitureCreatorForm) dom.furnitureCreatorForm.reset();
    if(previewImg) {
        previewImg.src = '';
        previewImg.style.display = 'none';
    }
}

export function toggleFurnitureMode(active, furnitureState) {
    dom.body.classList.toggle('furniture-mode', active);
    dom.furnitureBtn.classList.toggle('active', active);
    
    // Toggle visibility of other UI elements
    const shouldHideUI = active;
    dom.chatContainerWrapper.classList.toggle('hidden', shouldHideUI);
    dom.kickBtnWrapper.classList.toggle('hidden', shouldHideUI);
    dom.reviewBoardWrapper.classList.toggle('hidden', shouldHideUI);

    const displayFlex = active ? 'flex' : 'none';
    dom.furniturePanel.style.display = displayFlex;
    dom.furnitureStatsPanel.style.display = displayFlex;

    if (active) {
        updateFurnitureCounts(furnitureState.placed.length, furnitureState.max);
    }
}

export function updateFurnitureCounts(placed, max) {
    dom.placedCount.textContent = placed;
    dom.maxCount.textContent = max;
}

export function renderFurnitureChoices(catalog, onAddCallback, isDisabled, onAddNewCallback) {
    dom.furnitureOptions.innerHTML = '';
    catalog.forEach(item => {
        const div = document.createElement('div');
        div.className = 'furniture-option-item';
        div.title = item.description;
        if (isDisabled) {
            div.classList.add('disabled');
        } else {
            div.onclick = () => onAddCallback(item);
        }

        const img = document.createElement('img');
        img.src = item.imageUrl;
        img.alt = item.name;
        img.onerror = () => { img.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"; }; // Fallback for broken image

        const span = document.createElement('span');
        span.textContent = item.name;
        
        div.append(img, span); // FIX: Append the image and span to the item container
        dom.furnitureOptions.append(div);
    });

    // Add "Add New" button
    const addNewBtn = document.createElement('div');
    addNewBtn.className = 'add-new-furniture-btn';
    addNewBtn.innerHTML = '<i class="fas fa-plus"></i><span>New Furniture</span>';
    addNewBtn.onclick = onAddNewCallback;
    dom.furnitureOptions.append(addNewBtn);
}

export function renderFurnitureStats(stats, ambianceDescription) {
    dom.furnitureStatsContent.innerHTML = '';
    const statColors = {
        positive: '#4ade80',
        negative: '#f87171',
        neutral: '#9ca3af'
    };
    for (const [key, value] of Object.entries(stats)) {
        const div = document.createElement('div');
        const nameSpan = document.createElement('span');
        nameSpan.className = 'stat-name';
        nameSpan.textContent = key.charAt(0).toUpperCase() + key.slice(1);
        
        const valueSpan = document.createElement('span');
        valueSpan.className = 'stat-value';
        valueSpan.textContent = value;
        
        let color = statColors.neutral;
        if (value > 0) color = statColors.positive;
        if (value < 0) color = statColors.negative;
        div.style.backgroundColor = `${color}20`; // Add alpha for background

        div.append(nameSpan, valueSpan);
        dom.furnitureStatsContent.append(div);
    }
    dom.ambianceDescriptionText.textContent = ambianceDescription;
}

export function addFurnitureToScene(item, pos, onDragStart) {
    const wrapper = document.createElement('div');
    wrapper.className = 'placed-furniture-item';
    wrapper.dataset.id = item.id;
    wrapper.style.left = `${pos.x}px`;
    wrapper.style.top = `${pos.y}px`;
    wrapper.style.height = `${item.size.height}px`;

    const img = document.createElement('img');
    img.src = item.item.imageUrl;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'contain';
    img.draggable = false;

    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'resize-handle';
    
    wrapper.append(img, resizeHandle);

    wrapper.addEventListener('mousedown', (e) => {
        // Only trigger drag on the main element, not the resize handle, for move action.
        if (e.target.classList.contains('resize-handle')) return;
        e.preventDefault();
        onDragStart(e, wrapper, item, false); // isResizing = false
    });

    resizeHandle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation(); // prevent wrapper's listener
        onDragStart(e, wrapper, item, true); // isResizing = true
    });

    dom.placedFurnitureContainer.append(wrapper);
    return wrapper;
}

export function clearPlacedFurniture() {
    dom.placedFurnitureContainer.innerHTML = '';
}

// === Event Listener Setup ===
export function initEventListeners(handlers) {
    dom.sendBtn.addEventListener('click', handlers.handleUserMessage);
    dom.userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handlers.handleUserMessage();
    });
    dom.kickBtn.addEventListener('click', handlers.kickCustomer);

    // --- Toggle buttons mutual exclusivity ---
    dom.menuToggleBtn.addEventListener('click', () => {
        // If customer maker open, close it!
        hideCustomerMaker();
        // Toggle menu board
        const isVisible = dom.menuBoard.classList.toggle('visible');
        dom.menuToggleBtn.classList.toggle('active', isVisible);
        
        // If menu is being closed and furniture mode is active, close furniture mode too.
        if (!isVisible && dom.body.classList.contains('furniture-mode')) {
             handlers.toggleFurnitureMode();
        }
    });

    dom.customerMakerToggleBtn.addEventListener('click', async () => {
        // If menu board open, close it!
        dom.menuBoard.classList.remove('visible');
        dom.menuToggleBtn.classList.remove('active');
        // Show customer maker
        if (dom.customerMakerOverlay.style.display !== 'flex') {
            handlers.openCustomerMaker && handlers.openCustomerMaker();
        } else {
            hideCustomerMaker();
        }
    });

    // Menu Editor
    dom.editMenuBtn.addEventListener('click', () => showMenuEditor(handlers.getMenu(), () => renderMenuEditor(handlers.getMenu(), () => {})));
    dom.closeMenuEditorBtn.addEventListener('click', hideMenuEditor);
    dom.menuEditorOverlay.addEventListener('click', (e) => {
        if (e.target === dom.menuEditorOverlay) hideMenuEditor();
    });
    dom.menuForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handlers.saveMenu();
        hideMenuEditor();
    });
    dom.addCategoryBtn.addEventListener('click', () => {
        handlers.getMenu().push({ title: '', items: [] });
        renderMenuEditor(handlers.getMenu(), () => renderMenuEditor(handlers.getMenu(), () => {}));
    });

    // --- Furniture Mode ---
    dom.furnitureBtn.addEventListener('click', handlers.toggleFurnitureMode);
    dom.closeFurnitureModeBtn.addEventListener('click', handlers.toggleFurnitureMode);
    dom.resetFurnitureBtn.addEventListener('click', handlers.resetFurniture);

    // --- Furniture Creator ---
    // This is managed from main.js as it needs access to state logic

    // Start music on first interaction
    function startMusic() {
        dom.bgMusic.volume = 0.2;
        dom.bgMusic.play().catch(e => console.log("User needs to interact with the document first."));
        document.body.removeEventListener('click', startMusic);
        document.body.removeEventListener('keypress', startMusic);
    }
    document.body.addEventListener('click', startMusic);
    document.body.addEventListener('keypress', startMusic);
}