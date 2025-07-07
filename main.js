// main.js
import { DEFAULT_MENU, makePersonaTemplates, serializeMenuForAI, FURNITURE_CATALOG, FURNITURE_STATS } from './config.js';
import * as ui from './ui.js';

// === State Management ===
let menu = JSON.parse(JSON.stringify(DEFAULT_MENU));
let conversationHistory = [];
let currentPersona = {};
let menuStringForAI = serializeMenuForAI(menu);
let customerPersonas = makePersonaTemplates(menuStringForAI);

let settings = {
    allowCustomerLeave: true,
    showDebugLog: true,
};

// --- Furniture State ---
let isFurnitureMode = false;
let placedFurniture = []; // Array of { item: furnitureObject, pos: {x,y}, size: {h}, id: string }
let customFurnitureCatalog = [];
const MAX_FURNITURE = 3;
let furnitureIdCounter = 0;
let activeFurnitureAbilities = {}; // { furnId: { timer?: number, type: string, onCooldown?: boolean } }

// Restore UI settings from last session or default (session only)
function loadSettings() {
    // Not persistent, reset each session; could add localStorage if desired
    // For now, just keep in memory (matches request)
    ui.setCustomerLeaveCheckbox(settings.allowCustomerLeave);
    ui.setDebugLogCheckbox(settings.showDebugLog);
}
function saveSettings() {
    // No-op unless you want to persist
}

// --- CUSTOMER MAKER EXTENSION ---
let customCustomerTypes = null; // If user edited customers; otherwise null

// Use this helper for transforming UI-edited types into generator functions
function makeCustomPersonaTemplates(customTypesArray, menuStringForAI) {
    // Each customType: { name, system_prompt, image_prompt }
    return customTypesArray.map(type => ({
        type: type.name,
        persona_generator: async () => ({
            name: type.name || "Anonymous",
            system_prompt: (type.system_prompt || '').replaceAll('{MENU}', menuStringForAI),
            image_prompt: (type.image_prompt || ''),
            imageUrl: type.imageUrl || null, // Pass along the uploaded image URL
        })
    }));
}

// === Menu Logic ===
function saveMenu() {
    // Clean up menu: remove empty categories/items
    menu = menu
        .filter(cat => cat.title.trim() && cat.items.length > 0)
        .map(cat => ({
            title: cat.title.trim(),
            items: cat.items
                .filter(item => item.name.trim())
                .map(item => ({
                    name: item.name.trim(),
                    desc: (item.desc || "").trim()
                }))
        }));
    
    ui.repaintMenuBoard(menu);
    menuStringForAI = serializeMenuForAI(menu);
    // Update customer personas with new menu string!
    if (customCustomerTypes) {
        customerPersonas = makeCustomPersonaTemplates(customCustomerTypes, menuStringForAI);
    } else {
        customerPersonas = makePersonaTemplates(menuStringForAI);
    }
}

// CUSTOMER MAKER LOGIC

// Translating "customerPersonas" (factory functions w/ persona_generator) to simple editable types & back
function personaTemplatesToEditableArray(personas) {
    // Only do this for built-in "factory" ones (so: on first open, not after custom)
    // We'll call .persona_generator() and cache the basic config for user editing, so we don't lose anything.
    // But this is async because the built-in templates generate random details.
    return Promise.all(
        personas.map(async t => {
            // Try to obtain sample details from the persona_generator function
            const tempPersona = await t.persona_generator();
            return {
                name: tempPersona.name || t.type,
                system_prompt: tempPersona.system_prompt.replaceAll(menuStringForAI, '{MENU}'),
                image_prompt: tempPersona.image_prompt,
                imageUrl: null // Default templates don't have pre-set images
            }
        })
    );
}

// Show Customer Maker UI, optionally prefill with current custom/built-in customers
async function showCustomerMaker() {
    // If already loaded, use custom
    let editableTypes;
    if (customCustomerTypes) {
        editableTypes = JSON.parse(JSON.stringify(customCustomerTypes));
    } else {
        // Convert built-ins to editable array (async, since persona_generator is often async)
        editableTypes = await personaTemplatesToEditableArray(makePersonaTemplates(menuStringForAI));
        // Don't overwrite customCustomerTypes just yet
    }
    ui.showCustomerMaker(editableTypes, {
        onSave: handleCustomerMakerSave,
        onClose: hideCustomerMaker,
    });
}

function hideCustomerMaker() {
    ui.hideCustomerMaker();
}

// On save, update customPersonas (used for customer generation)
function handleCustomerMakerSave(editedArray) {
    // No need to revoke URLs anymore since we are using dataURLs which are self-contained strings.

    // Remove those with no name or empty prompt
    const cleaned = editedArray
        .filter(
            t => (t.name || '').trim() && (t.system_prompt || '').trim() && ((t.image_prompt || '').trim() || t.imageUrl)
        )
        .map(t => ({
            name: t.name.trim(),
            system_prompt: t.system_prompt.trim(),
            image_prompt: t.image_prompt.trim(),
            imageUrl: t.imageUrl, // Keep the new URL
        }));
    customCustomerTypes = cleaned.length > 0 ? cleaned : null;
    // New menu may have changed since editing, so replace {MENU}
    if (customCustomerTypes) {
        customerPersonas = makeCustomPersonaTemplates(customCustomerTypes, menuStringForAI);
    } else {
        customerPersonas = makePersonaTemplates(menuStringForAI);
    }
    hideCustomerMaker();
}

// === Core AI & Customer Logic ===
async function getAIResponse(messages) {
    try {
        return await websim.chat.completions.create({ messages });
    } catch (error) {
        console.error("Error getting AI response:", error);
        return { role: 'assistant', content: "Sorry, my brain-link is fuzzy. Could you say that again?" };
    }
}

async function generateCustomer() {
    try {
        ui.showLoading('A new customer is on their way...');
        ui.updateInteractionControls(false);

        // customerPersonas will be either built-in or custom
        const personasArr = customerPersonas;
        if (!personasArr.length) throw new Error("No customer types defined!");

        const personaTemplate = personasArr[Math.floor(Math.random() * personasArr.length)];
        currentPersona = await personaTemplate.persona_generator();

        let imageUrl = currentPersona.imageUrl;

        if (!imageUrl) {
            // The image_prompt may have {MENU}
            const resolvedImagePrompt = (currentPersona.image_prompt || '').replaceAll('{MENU}', menuStringForAI);

            const result = await websim.imageGen({
                prompt: resolvedImagePrompt,
                transparent: true,
                aspect_ratio: "1:1"
            });
            imageUrl = result.url;
        }
        
        ui.setCustomerImage(imageUrl);
        ui.getCustomerImage().onload = startCustomerInteraction;

    } catch (error) {
        console.error("Failed to generate customer:", error);
        ui.showLoading("Error generating customer. Please refresh.");
    }
}

function startCustomerInteraction() {
    ui.hideLoading();
    ui.clearChat();
    
    const customerImg = ui.getCustomerImage();
    customerImg.className = ''; // Reset classes
    setTimeout(() => {
        customerImg.className = 'enter';
    }, 100);

    setTimeout(setupAI, 1600); // Wait for animation to progress
}

async function setupAI() {
    // Inject furniture description into the system prompt
    const furnitureContext = serializeFurnitureForAI();
    
    // Combine the persona prompt with the furniture context
    let finalSystemPrompt = currentPersona.system_prompt;
    finalSystemPrompt += `\n\nCONTEXT: You are inside the pizza place. You notice the decor: ${furnitureContext}. You can make a brief, in-character comment about the decor when you first speak if you want, but your main goal is to order pizza. Don't get distracted. Do not act like an AI assistant.`;

    // The system_prompt may have {MENU}
    const resolvedPrompt = finalSystemPrompt.replaceAll('{MENU}', menuStringForAI);

    conversationHistory = [{ role: 'system', content: resolvedPrompt }];
    const firstAIMessage = await getAIResponse(conversationHistory);
    conversationHistory.push(firstAIMessage);
    ui.addMessage(firstAIMessage.content, 'ai');
    ui.updateInteractionControls(true, `Respond to ${currentPersona.name}...`);
    startAllFurnitureTimers();
}

async function handleUserMessage() {
    const userInput = document.getElementById('user-input');
    const messageText = userInput.value.trim();
    if (messageText === '') return;

    ui.addMessage(messageText, 'user');
    userInput.value = '';
    ui.updateInteractionControls(false);

    conversationHistory.push({ role: 'user', content: messageText });
    // Make sure we only send the last few messages to keep tokens down
    const aiResponse = await getAIResponse(conversationHistory.slice(-10));
    conversationHistory.push(aiResponse);

    ui.addMessage(aiResponse.content, 'ai');
    
    // Check for furniture abilities before checking conversation state
    const wasAbilityTriggered = await checkAndTriggerFurnitureAbilities(aiResponse.content);

    // Only check for game state if an ability didn't interrupt and take over
    if (!wasAbilityTriggered) {
        await checkConversationState();
    }
}

async function checkAndTriggerFurnitureAbilities(aiMessageContent) {
    const boringDetectorEntry = Object.entries(activeFurnitureAbilities).find(([id, ability]) => ability.type === 'boring_detector' && !ability.onCooldown);
    
    if (boringDetectorEntry) {
        try {
            const boringCheckResponse = await websim.chat.completions.create({
                messages: [
                    {
                        role: 'system',
                        content: `Analyze the following customer response from a roleplay scenario. Is the response generic, boring, off-topic, or uninspired for their given persona? The user's goal is to order pizza. Simple hellos or acknowledgements are fine. Focus on detecting responses that show a lack of creativity or engagement compared to their persona. Respond ONLY with a JSON object: { "is_boring": boolean }`
                    },
                    { role: 'user', content: `Persona: "${currentPersona.system_prompt}"\n\nResponse: "${aiMessageContent}"` }
                ],
                json: true
            });
            const result = JSON.parse(boringCheckResponse.content);
            ui.addDebugLog('Skeleton Boring Check', `Response: "${aiMessageContent}"\nResult: ${JSON.stringify(result, null, 2)}`);

            if (result.is_boring) {
                const [id] = boringDetectorEntry;
                await triggerSkeletonAbility(id);
                return true; // Ability was triggered
            }
        } catch (e) {
            console.error("Failed to check for boringness:", e);
        }
    }
    return false; // No ability triggered
}

async function triggerSkeletonAbility(id) {
    ui.updateInteractionControls(false);
    ui.addMessage("YOU'RE TOO BORING!!!", 'event');
    ui.playSound(document.getElementById('sfx-scream'));
    
    // Put on cooldown
    if (activeFurnitureAbilities[id]) {
        activeFurnitureAbilities[id].onCooldown = true;
        setTimeout(() => {
            if(activeFurnitureAbilities[id]) {
                activeFurnitureAbilities[id].onCooldown = false;
            }
        }, 30000); // 30 second cooldown
    }

    await new Promise(resolve => setTimeout(resolve, 1000)); // Dramatic pause

    conversationHistory.push({ role: 'user', content: "(A nearby skeleton decoration just screamed at you for being boring. React with shock or fear, then try to awkwardly continue your pizza order.)" });
    const aiResponse = await getAIResponse(conversationHistory.slice(-10));
    conversationHistory.push(aiResponse);
    
    ui.addMessage(aiResponse.content, 'ai');
    ui.updateInteractionControls(true, `Respond to ${currentPersona.name}...`);
}

async function triggerMeatballAbility(furnId) {
    // Check if customer and the cannon are still there
    if (!currentPersona.name || !activeFurnitureAbilities[furnId]) return;

    ui.updateInteractionControls(false, "Here it comes!");

    // Animate meatball
    const cannonElem = document.querySelector(`.placed-furniture-item[data-id="${furnId}"]`);
    if (cannonElem) {
        const cannonRect = cannonElem.getBoundingClientRect();
        const customerRect = ui.getCustomerImage().getBoundingClientRect();
        ui.showMeatballAnimation(cannonRect, customerRect);
    }
    ui.playSound(document.getElementById('sfx-splat'));
    
    await new Promise(resolve => setTimeout(resolve, 500)); // wait for splat

    conversationHistory.push({ role: 'user', content: "(A meatball shot from a cannon just hit you in the face. React briefly and in-character to this sudden, absurd event, then try to get back to ordering your pizza.)" });
    const aiResponse = await getAIResponse(conversationHistory.slice(-10));
    conversationHistory.push(aiResponse);
    
    ui.addMessage(aiResponse.content, 'ai');
    ui.updateInteractionControls(true, `Respond to ${currentPersona.name}...`);
}

async function checkConversationState() {
    try {
        // If leave is DISABLED, just never analyze for ending/angry states
        if (!settings.allowCustomerLeave) {
            ui.updateInteractionControls(true);
            document.getElementById('user-input').focus();
            return; // No leaving!
        }

        const stateResponse = await websim.chat.completions.create({
            messages: [
                {
                    role: 'system',
                    content: `You are an AI assistant analyzing a conversation between a pizza cashier and a customer. Based on the provided conversation history and menu, decide if the customer's interaction is over. The customer's persona is: "${currentPersona.system_prompt}".
            The restaurant menu is:\n${menuStringForAI}
            The possible states are:
            1. 'order_complete': The customer has successfully placed their order from the menu and is satisfied.
            2. 'leave_angry': The customer is frustrated, received bad service, or has decided to leave without ordering.
            3. 'continue': The conversation is ongoing.
            Analyze the last few messages and the overall tone. Respond ONLY with a JSON object with a single key "action" and one of the three string values.`
                },
                { role: 'user', content: `Conversation History:\n${JSON.stringify(conversationHistory.slice(-6))}` }
            ],
            json: true
        });

        const state = JSON.parse(stateResponse.content);
        ui.addDebugLog('Conversation State Check', JSON.stringify(state, null, 2));

        switch (state.action) {
            case 'order_complete':
                leaveHappy();
                break;
            case 'leave_angry':
                leaveAngry();
                break;
            default:
                ui.updateInteractionControls(true);
                document.getElementById('user-input').focus();
                break;
        }
    } catch (error) {
        console.error("Error checking conversation state:", error);
        ui.updateInteractionControls(true);
        document.getElementById('user-input').focus();
    }
}

async function generateReview() {
    try {
        const reviewResponse = await getAIResponse([
            {
                role: 'system',
                content: `You are an AI assistant writing a customer review for a pizza place. The customer's persona is: "${currentPersona.system_prompt}". Based on the following conversation, write a short, one-sentence review in the customer's voice that reflects their experience. The review should be 1-2 sentences max.`
            },
            { role: 'user', content: `Conversation History:\n${JSON.stringify(conversationHistory)}` }
        ]);
        ui.addReviewToBoard(reviewResponse.content, currentPersona.name);
    } catch (error) {
        console.error("Failed to generate review", error);
    }
}

function resetForNewCustomer() {
    ui.showLoading('Getting the next customer ready...');
    stopAllFurnitureTimers();
    currentPersona = {}; // Clear current persona immediately
    const customerImg = ui.getCustomerImage();
    customerImg.className = '';
    customerImg.src = '';
    ui.updateInteractionControls(false, "Say 'Hello' to the customer...");
    setTimeout(generateCustomer, 2500);
}

// === Customer Actions ===
async function leaveHappy() {
    // If setting disables customer leave, just do nothing (should never be called, but safety check)
    if (!settings.allowCustomerLeave) {
        ui.updateInteractionControls(true);
        document.getElementById('user-input').focus();
        return;
    }
    ui.updateInteractionControls(false);
    ui.addMessage("Thanks! I'll be back!", 'ai');
    ui.playSound(document.getElementById('sfx-register'));
    await generateReview();
    ui.getCustomerImage().classList.add('leave-happy');
    setTimeout(resetForNewCustomer, 2000);
}

function leaveAngry() {
    if (!settings.allowCustomerLeave) {
        ui.updateInteractionControls(true);
        document.getElementById('user-input').focus();
        return;
    }
    ui.updateInteractionControls(false);
    ui.addMessage("This is ridiculous, I'm leaving!", 'ai');
    ui.getCustomerImage().classList.add('leave-angry');
    setTimeout(resetForNewCustomer, 2000);
}

function kickCustomer() {
    if (document.getElementById('kick-btn').disabled) return;
    ui.updateInteractionControls(false);
    ui.playSound(document.getElementById('sfx-kick'));
    ui.addMessage("GET OUT!", 'system');
    ui.getCustomerImage().classList.add('kick-out');
    setTimeout(resetForNewCustomer, 1500);
}

// === Furniture Logic ===

function calculateTotalStats() {
    const totalStats = { ...FURNITURE_STATS };
    placedFurniture.forEach(placed => {
        for(const [stat, value] of Object.entries(placed.item.stats)) {
            if (totalStats.hasOwnProperty(stat)) {
                totalStats[stat] += value;
            }
        }
    });
    return totalStats;
}

function updateFurnitureUI() {
    const stats = calculateTotalStats();
    // Get only the description part of the prompt for the UI
    const description = serializeFurnitureForAI(true);
    ui.renderFurnitureStats(stats, description);
    ui.updateFurnitureCounts(placedFurniture.length, MAX_FURNITURE);
    const canAddMore = placedFurniture.length < MAX_FURNITURE;
    const fullCatalog = [...FURNITURE_CATALOG, ...customFurnitureCatalog];
    ui.renderFurnitureChoices(fullCatalog, addFurniture, !canAddMore, showFurnitureCreator);
}

function addFurniture(item) {
    if (placedFurniture.length >= MAX_FURNITURE) return;
    
    const newItem = {
        item: item,
        pos: { x: window.innerWidth * 0.4, y: window.innerHeight * 0.5 },
        size: { height: 200 }, // Default size
        id: `furn-${furnitureIdCounter++}`
    };
    placedFurniture.push(newItem);
    ui.addFurnitureToScene(newItem, newItem.pos, handleDragStart);

    // --- ABILITY ACTIVATION ---
    if (item.ability) {
        switch (item.ability) {
            case 'meatball_shot':
                activeFurnitureAbilities[newItem.id] = { type: 'meatball_shot', timer: null };
                // If a customer is already present, start its timer immediately.
                if (currentPersona.name) {
                    startSingleFurnitureAbility(newItem.id);
                }
                break;
            case 'boring_detector':
                activeFurnitureAbilities[newItem.id] = { type: 'boring_detector', onCooldown: false };
                break;
        }
    }

    updateFurnitureUI();
}

function stopAllFurnitureTimers() {
    for (const id in activeFurnitureAbilities) {
        const ability = activeFurnitureAbilities[id];
        if (ability.timer) {
            clearInterval(ability.timer);
            ability.timer = null;
        }
    }
}

function startAllFurnitureTimers() {
    for (const id in activeFurnitureAbilities) {
        startSingleFurnitureAbility(id);
    }
}

function startSingleFurnitureAbility(id) {
    const ability = activeFurnitureAbilities[id];
    // Start timer only if it's the right type and not already running
    if (ability && ability.type === 'meatball_shot' && !ability.timer) {
        ability.timer = setInterval(() => triggerMeatballAbility(id), 10000 + Math.random() * 15000);
    }
}

function resetFurniture() {
    // --- ABILITY DEACTIVATION ---
    stopAllFurnitureTimers();
    activeFurnitureAbilities = {};

    placedFurniture = [];
    ui.clearPlacedFurniture();
    updateFurnitureUI();
}

function handleDragStart(event, element, item, isResizing = false) {
    element.classList.add('dragging');
    document.body.classList.add('is-dragging-furniture');

    let startX = event.clientX;
    let startY = event.clientY;
    const startHeight = element.offsetHeight;
    const startWidth = element.offsetWidth;
    let offsetX = startX - element.getBoundingClientRect().left;
    let offsetY = startY - element.getBoundingClientRect().top;

    function onMouseMove(e) {
        e.preventDefault();
        if (isResizing) {
            const dy = e.clientY - startY;
            let newHeight = startHeight + dy;
            newHeight = Math.max(50, newHeight); // min height
            newHeight = Math.min(window.innerHeight * 0.8, newHeight); // max height
            element.style.height = `${newHeight}px`;
            // Maintain aspect ratio
            const aspectRatio = startWidth / startHeight;
            element.style.width = `${newHeight * aspectRatio}px`;
        } else {
            let newX = e.clientX - offsetX;
            let newY = e.clientY - offsetY;
            element.style.left = `${newX}px`;
            element.style.top = `${newY}px`;
        }
    }

    function onMouseUp(e) {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        element.classList.remove('dragging');
        document.body.classList.remove('is-dragging-furniture');

        const placedItem = placedFurniture.find(pf => pf.id === item.id);
        if (placedItem) {
             if (isResizing) {
                placedItem.size.height = element.offsetHeight;
             } else {
                placedItem.pos.x = element.offsetLeft;
                placedItem.pos.y = element.offsetTop;
             }
        }
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
}

function toggleFurnitureMode() {
    isFurnitureMode = !isFurnitureMode;
    ui.toggleFurnitureMode(isFurnitureMode, { placed: placedFurniture, max: MAX_FURNITURE });
    if (isFurnitureMode) {
        updateFurnitureUI();
        // Make existing furniture draggable by re-rendering them with drag handlers active
        ui.clearPlacedFurniture();
        placedFurniture.forEach(pf => ui.addFurnitureToScene(pf, pf.pos, handleDragStart));
    }
}

function serializeFurnitureForAI(forDisplayOnly = false) {
    if (placedFurniture.length === 0) {
        return forDisplayOnly ? "The restaurant is plain and has no special decorations." : "The decor is plain and unremarkable.";
    }

    const stats = calculateTotalStats();
    let description = "The restaurant is decorated with: ";
    description += placedFurniture.map(pf => `${pf.item.name} (${pf.item.description})`).join(', ');
    description += ". ";

    let ambiance = [];
    for (const [stat, value] of Object.entries(stats)) {
        if (value > 3) ambiance.push(`very ${stat}`);
        else if (value > 0) ambiance.push(`a bit ${stat}`);
        else if (value < -2) ambiance.push(`noticeably lacking in ${stat}`);
    }

    if (ambiance.length > 0) {
        description += `The overall ambiance is ${ambiance.join(', ')}.`;
    } else {
        description += "The decor doesn't create any strong impression.";
    }

    // For both display and AI, we'll now return the same concise description.
    // The specific instruction to the AI is handled in the setupAI function.
    return description;
}

// --- Furniture Creator Logic ---
async function handleSaveCustomFurniture(form) {
    const saveBtn = document.getElementById('save-furniture-btn');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';

    const name = form.elements['furniture-name'].value;
    const description = form.elements['furniture-desc'].value;
    const imageSource = form.elements['image-source'].value;

    let imageUrl = '';
    if (imageSource === 'upload') {
        const file = form.elements['furniture-upload'].files[0];
        if (!file) {
            alert('Please select an image to upload.');
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Create';
            return;
        }
        // This creates a blob URL. It's temporary but works for the session.
        // NOTE: If we needed persistence (localStorage), we'd need to convert this to base64.
        const reader = new FileReader();
        imageUrl = await new Promise((resolve, reject) => {
            reader.onload = e => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    } else {
        const prompt = form.elements['furniture-prompt'].value;
        if (!prompt) {
             alert('Please enter an AI image prompt.');
             saveBtn.disabled = false;
             saveBtn.innerHTML = '<i class="fas fa-save"></i> Create';
             return;
        }
        try {
            const result = await websim.imageGen({ prompt: `${prompt}, photorealistic, studio lighting, transparent background`, transparent: true });
            imageUrl = result.url;
        } catch(e) {
            alert('Failed to generate image from prompt.');
            console.error(e);
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Create';
            return;
        }
    }

    const stats = {};
    Object.keys(FURNITURE_STATS).forEach(stat => {
        stats[stat] = parseInt(form.elements[stat].value, 10) || 0;
    });

    const newFurniture = { name, description, imageUrl, stats };
    customFurnitureCatalog.push(newFurniture);
    
    updateFurnitureUI(); // Refresh the choices list
    ui.hideFurnitureCreator();
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<i class="fas fa-save"></i> Create';
}

function setupFurnitureCreator() {
    const form = document.getElementById('furniture-creator-form');
    const statsEditor = document.getElementById('furniture-stats-editor');
    
    // Radio buttons for image source
    const promptRadio = form.elements['image-source'][0];
    const uploadRadio = form.elements['image-source'][1];
    const promptGroup = document.getElementById('image-prompt-group');
    const uploadGroup = document.getElementById('image-upload-group');
    const fileInput = document.getElementById('furniture-upload');
    const previewImg = document.getElementById('furniture-image-preview');

    // Populate stats inputs only once
    statsEditor.innerHTML = '';
    Object.keys(FURNITURE_STATS).forEach(stat => {
        const group = document.createElement('div');
        group.className = 'stat-input-group';
        const label = document.createElement('label');
        label.textContent = stat;
        label.htmlFor = `stat-input-${stat}`;
        const input = document.createElement('input');
        input.type = 'number';
        input.id = `stat-input-${stat}`;
        input.name = stat;
        input.value = 0;
        group.append(label, input);
        statsEditor.append(group);
    });

    function handleSourceChange() {
        if (promptRadio.checked) {
            promptGroup.style.display = 'flex';
            uploadGroup.style.display = 'none';
        } else {
            promptGroup.style.display = 'none';
            uploadGroup.style.display = 'flex';
        }
    }
    promptRadio.onchange = handleSourceChange;
    uploadRadio.onchange = handleSourceChange;

    fileInput.onchange = () => {
        if(previewImg.src && previewImg.src.startsWith('blob:')){
             URL.revokeObjectURL(previewImg.src);
        }
        if(fileInput.files && fileInput.files[0]){
            previewImg.src = URL.createObjectURL(fileInput.files[0]);
            previewImg.style.display = 'block';
        }
    };
    
    // Initial state
    handleSourceChange();
}

function showFurnitureCreator() {
    ui.showFurnitureCreator(handleSaveCustomFurniture);
}

function hideFurnitureCreator() {
    const overlay = document.getElementById('furniture-creator-overlay');
    const previewImg = document.getElementById('furniture-image-preview');
    if (previewImg.src) {
        URL.revokeObjectURL(previewImg.src); // Clean up blob URL
    }
    overlay.style.display = 'none';
}

// === Settings UI Logic ===
function setupSettingsUI() {
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeBtn = document.getElementById('settings-close-btn');
    const leaveCheckbox = document.getElementById('setting-customer-leave');
    const debugLogCheckbox = document.getElementById('setting-debug-log');
    const debugLogContainer = document.getElementById('ai-debug-log-container');

    // Show/hide logic
    function showModal() {
        settingsModal.style.display = 'block';
        settingsBtn.classList.add('active');
    }
    function hideModal() {
        settingsModal.style.display = 'none';
        settingsBtn.classList.remove('active');
    }

    settingsBtn.addEventListener('click', () => {
        if (settingsModal.style.display === 'block') {
            hideModal();
        } else {
            showModal();
        }
    });
    closeBtn.addEventListener('click', hideModal);
    // Clicking outside the modal closes
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) hideModal();
    });

    leaveCheckbox.addEventListener('change', (e) => {
        settings.allowCustomerLeave = !!e.target.checked;
        saveSettings();
    });

    debugLogCheckbox.addEventListener('change', (e) => {
        settings.showDebugLog = !!e.target.checked;
        debugLogContainer.style.display = settings.showDebugLog ? 'block' : 'none';
        saveSettings();
    });
}

// === Initialization ===
document.addEventListener('DOMContentLoaded', () => {
    const eventHandlers = {
        handleUserMessage,
        kickCustomer,
        saveMenu,
        getMenu: () => menu,
        openCustomerMaker: showCustomerMaker,
        toggleFurnitureMode,
        resetFurniture,
        // No need to add furniture creator handlers here, they are self-contained
    };
    
    ui.initEventListeners(eventHandlers);
    ui.repaintMenuBoard(menu);
    setupSettingsUI();
    setupFurnitureCreator();
    loadSettings();
    generateCustomer();
});