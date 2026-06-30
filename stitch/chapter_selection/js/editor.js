var state = {
    edit: false,
    title: 'Chronicles',
    subtitle: 'Select your next story beat',
    bgImg: null,
    chapters: [{ num: 'Chapter 1', title: 'Chapter Title', desc: 'Chapter description...' }]
};

var el = {};

function initElements() {
    el = {
        toggle: document.getElementById('edit-toggle'),
        panel: document.getElementById('edit-panel'),
        close: document.getElementById('close-edit'),
        title: document.getElementById('edit-title'),
        subtitle: document.getElementById('edit-subtitle'),
        pageTitle: document.getElementById('title'),
        pageSubtitle: document.getElementById('subtitle'),
        bg: document.getElementById('bg'),
        bgThumb: document.getElementById('bg-thumb'),
        bgUpload: document.getElementById('bg-upload'),
        clearBg: document.getElementById('clear-bg'),
        container: document.getElementById('chapters-container'),
        newNum: document.getElementById('new-chapter-num'),
        newTitle: document.getElementById('new-chapter-title'),
        newDesc: document.getElementById('new-chapter-desc'),
        addBtn: document.getElementById('add-chapter'),
        save: document.getElementById('save-config'),
        load: document.getElementById('load-config'),
        configUpload: document.getElementById('config-upload')
    };
}

function toggle() {
    if (!state.edit) {
        AuthModule.loadConfig();
        if (AuthModule.isAdmin) {
            enterEditMode();
        } else {
            AuthModule.showLoginModal(function(success) {
                if (success) enterEditMode();
            }, function(err) { console.log('Auth failed:', err); });
        }
    } else {
        state.edit = false;
        el.panel.classList.add('translate-x-full');
        el.toggle.innerHTML = '<span class="material-symbols-outlined">edit</span><span>EDIT MODE</span>';
    }
}

function enterEditMode() {
    state.edit = true;
    el.panel.classList.remove('translate-x-full');
    el.toggle.innerHTML = '<span class="material-symbols-outlined">visibility</span><span>VIEW MODE</span>';
}

function update() {
    el.pageTitle.textContent = state.title;
    el.pageSubtitle.textContent = state.subtitle;
    if (state.bgImg) el.bg.style.backgroundImage = "url('" + state.bgImg + "')";
    else el.bg.style.backgroundImage = 'none';
    renderChapters();
}

function renderChapters() {
    el.container.innerHTML = '';
    state.chapters.forEach(function(ch) {
        var card = document.createElement('div');
        card.className = 'chapter-card flex-shrink-0 w-[320px] h-[480px] rounded-md flex flex-col items-center p-6 text-center cursor-pointer snap-center relative';
        card.innerHTML = '<div class="absolute -top-8 w-16 h-16 diamond shadow-[0_0_15px_#D3BC8E] flex items-center justify-center">' +
            '<span class="material-symbols-outlined text-textDark text-2xl">star</span></div>' +
            '<div class="mt-8 flex-grow flex flex-col justify-between w-full"><div>' +
            '<p class="text-primary text-sm uppercase tracking-widest mb-2">' + ch.num + '</p>' +
            '<h3 class="text-xl font-display mb-4">' + ch.title + '</h3>' +
            '<div class="w-12 h-[1px] bg-primary mx-auto mb-4 opacity-50"></div>' +
            '<p class="text-muted text-sm italic">"' + ch.desc + '"</p></div>' +
            '<div class="mt-auto"><button class="w-full py-3 bg-primary text-textDark font-display rounded">Enter Story</button></div></div>';
        el.container.appendChild(card);
    });
}

function handleImageUpload(input, callback) {
    var file = input.files[0];
    if (file) {
        var reader = new FileReader();
        reader.onload = function(e) { callback(e.target.result); };
        reader.readAsDataURL(file);
    }
}

function setupEventListeners() {
    el.toggle.onclick = toggle;
    el.close.onclick = toggle;

    el.title.oninput = function(e) { state.title = e.target.value || 'Chronicles'; update(); };
    el.subtitle.oninput = function(e) { state.subtitle = e.target.value || 'Select story'; update(); };

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

    el.addBtn.onclick = function() {
        state.chapters.push({
            num: el.newNum.value || 'Chapter',
            title: el.newTitle.value || 'Title',
            desc: el.newDesc.value || 'Description...'
        });
        renderChapters();
        el.newNum.value = '';
        el.newTitle.value = '';
        el.newDesc.value = '';
    };

    el.save.onclick = function() {
        var config = { title: state.title, subtitle: state.subtitle, backgroundImage: state.bgImg, chapters: state.chapters };
        var blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'chapter-config.json';
        a.click();
    };

    el.load.onclick = function() { el.configUpload.click(); };

    el.configUpload.onchange = function(e) {
        var file = e.target.files[0];
        if (file) {
            var reader = new FileReader();
            reader.onload = function(e) {
                try {
                    var config = JSON.parse(e.target.result);
                    state.title = config.title || 'Chronicles';
                    state.subtitle = config.subtitle || 'Select story';
                    state.bgImg = config.backgroundImage || null;
                    state.chapters = config.chapters || [];
                    el.title.value = state.title;
                    el.subtitle.value = state.subtitle;
                    if (state.bgImg) { el.bgThumb.src = state.bgImg; el.bgThumb.classList.remove('hidden'); }
                    update();
                } catch (err) { alert('Invalid config'); }
            };
            reader.readAsText(file);
        }
    };
}

document.addEventListener('DOMContentLoaded', function() {
    initElements();
    setupEventListeners();
});
