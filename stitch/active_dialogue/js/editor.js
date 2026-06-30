var state = {
    edit: false,
    name: 'Character Name',
    dialogue: 'Enter dialogue...',
    charImg: null,
    bgImg: null
};

var el = {};

function initElements() {
    el = {
        toggle: document.getElementById('edit-toggle'),
        panel: document.getElementById('edit-panel'),
        close: document.getElementById('close-edit'),
        name: document.getElementById('edit-name'),
        dialogue: document.getElementById('edit-dialogue'),
        charName: document.getElementById('char-name'),
        dialogueText: document.getElementById('dialogue'),
        charPreview: document.getElementById('char-preview'),
        charThumb: document.getElementById('char-thumb'),
        charUpload: document.getElementById('char-upload'),
        clearChar: document.getElementById('clear-char'),
        bg: document.getElementById('bg'),
        bgThumb: document.getElementById('bg-thumb'),
        bgUpload: document.getElementById('bg-upload'),
        clearBg: document.getElementById('clear-bg'),
        save: document.getElementById('save-config'),
        load: document.getElementById('load-config'),
        configUpload: document.getElementById('config-upload')
    };
}

function toggle() {
    if (!state.edit) {
        // Try to enter edit mode - check auth first
        AuthModule.loadConfig();
        if (AuthModule.isAdmin) {
            state.edit = true;
            el.panel.classList.remove('translate-x-full');
            el.toggle.innerHTML = '<span class="material-symbols-outlined">visibility</span><span>VIEW MODE</span>';
        } else {
            // Show login modal
            AuthModule.showLoginModal(function(success) {
                if (success) {
                    state.edit = true;
                    el.panel.classList.remove('translate-x-full');
                    el.toggle.innerHTML = '<span class="material-symbols-outlined">visibility</span><span>VIEW MODE</span>';
                }
            }, function(err) {
                console.log('Auth failed:', err);
            });
        }
    } else {
        state.edit = false;
        el.panel.classList.add('translate-x-full');
        el.toggle.innerHTML = '<span class="material-symbols-outlined">edit</span><span>EDIT MODE</span>';
    }
}

function update() {
    el.charName.textContent = state.name;
    el.dialogueText.textContent = state.dialogue;
    if (state.charImg) {
        el.charPreview.src = state.charImg;
        el.charPreview.classList.remove('hidden');
    } else {
        el.charPreview.classList.add('hidden');
    }
    if (state.bgImg) {
        el.bg.style.backgroundImage = "url('" + state.bgImg + "')";
    } else {
        el.bg.style.backgroundImage = 'none';
    }
}

function handleImageUpload(input, callback) {
    var file = input.files[0];
    if (file) {
        var reader = new FileReader();
        reader.onload = function(e) {
            callback(e.target.result);
        };
        reader.readAsDataURL(file);
    }
}

function setupEventListeners() {
    el.toggle.onclick = toggle;
    el.close.onclick = toggle;

    el.name.oninput = function(e) {
        state.name = e.target.value || 'Character Name';
        update();
    };

    el.dialogue.oninput = function(e) {
        state.dialogue = e.target.value || 'Enter dialogue...';
        update();
    };

    el.charUpload.onchange = function(e) {
        handleImageUpload(e.target, function(result) {
            state.charImg = result;
            el.charThumb.src = result;
            el.charThumb.classList.remove('hidden');
            update();
        });
    };

    el.clearChar.onclick = function() {
        state.charImg = null;
        el.charThumb.classList.add('hidden');
        el.charUpload.value = '';
        update();
    };

    el.bgUpload.onchange = function(e) {
        handleImageUpload(e.target, function(result) {
            state.bgImg = result;
            el.bgThumb.src = result;
            el.bgThumb.classList.remove('hidden');
            update();
        });
    };

    el.clearBg.onclick = function() {
        state.bgImg = null;
        el.bgThumb.classList.add('hidden');
        el.bgUpload.value = '';
        update();
    };

    el.save.onclick = function() {
        var config = {
            characterName: state.name,
            dialogueText: state.dialogue,
            characterImage: state.charImg,
            backgroundImage: state.bgImg
        };
        var blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'dialogue-config.json';
        a.click();
        URL.revokeObjectURL(url);
    };

    el.load.onclick = function() {
        el.configUpload.click();
    };

    el.configUpload.onchange = function(e) {
        var file = e.target.files[0];
        if (file) {
            var reader = new FileReader();
            reader.onload = function(e) {
                try {
                    var config = JSON.parse(e.target.result);
                    state.name = config.characterName || 'Character Name';
                    state.dialogue = config.dialogueText || 'Enter dialogue...';
                    state.charImg = config.characterImage || null;
                    state.bgImg = config.backgroundImage || null;
                    el.name.value = state.name;
                    el.dialogue.value = state.dialogue;
                    if (state.charImg) {
                        el.charThumb.src = state.charImg;
                        el.charThumb.classList.remove('hidden');
                    }
                    if (state.bgImg) {
                        el.bgThumb.src = state.bgImg;
                        el.bgThumb.classList.remove('hidden');
                    }
                    update();
                } catch (err) {
                    alert('Invalid configuration file');
                }
            };
            reader.readAsText(file);
        }
    };
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    initElements();
    setupEventListeners();
});
