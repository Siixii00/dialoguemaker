/* Google Cloud Authentication Module */
var AuthModule = {
    isAdmin: false,
    adminEmail: null,
    require2FA: true,
    twoFAVerified: false,
    currentEmail: null,
    
    loadConfig: function() {
        var saved = localStorage.getItem('dialogueAdminConfig');
        if (saved) {
            var c = JSON.parse(saved);
            this.adminEmail = c.adminEmail;
            this.require2FA = c.require2FA !== false;
        }
    },
    
    saveConfig: function(email, enable2FA) {
        var config = { adminEmail: email, require2FA: enable2FA, setupDate: new Date().toISOString() };
        localStorage.setItem('dialogueAdminConfig', JSON.stringify(config));
        this.adminEmail = email;
        this.require2FA = enable2FA;
    },
    
    signIn: function(clientId, onSuccess, onError) {
        gapi.load('auth2', function() {
            gapi.auth2.init({ client_id: clientId, scope: 'email' }).then(function(auth2) {
                auth2.signIn().then(function(user) {
                    var email = user.getBasicProfile().getEmail();
                    AuthModule.currentEmail = email;
                    AuthModule.verifyAdminEmail(email, onSuccess, onError);
                }, onError);
            }, onError);
        });
    },
    
    verifyAdminEmail: function(email, onSuccess, onError) {
        if (!this.adminEmail) {
            onError('No admin configured');
            return;
        }
        if (email !== this.adminEmail) {
            onError('Email not authorized: ' + email);
            return;
        }
        if (this.require2FA) {
            AuthModule.show2FAModal(onSuccess, onError);
        } else {
            this.isAdmin = true;
            this.twoFAVerified = true;
            onSuccess(true);
        }
    },
    
    generate2FACode: function() {
        var code = Math.floor(100000 + Math.random() * 900000).toString();
        localStorage.setItem('dialogue2FA', JSON.stringify({ code: code, expiry: Date.now() + 300000 }));
        return code;
    },
    
    verify2FA: function(inputCode) {
        var saved = localStorage.getItem('dialogue2FA');
        if (saved) {
            var data = JSON.parse(saved);
            if (data.code === inputCode && Date.now() < data.expiry) {
                localStorage.removeItem('dialogue2FA');
                this.twoFAVerified = true;
                return true;
            }
        }
        return false;
    }
};
AuthModule.show2FAModal = function(onSuccess, onError) {
    var code = this.generate2FACode();
    var modal = document.createElement('div');
    modal.id = '2fa-modal';
    modal.className = 'fixed inset-0 z-[100] bg-black/80 flex items-center justify-center';
    modal.innerHTML = '<div class="p-8 rounded-lg max-w-md w-full mx-4 text-center" style="background:rgba(31,37,47,0.95);border:1px solid rgba(211,188,142,0.3)">' +
        '<span class="material-symbols-outlined text-primary text-3xl mb-2">verified_user</span>' +
        '<h3 class="font-display text-xl text-primary mb-2">Step 2: Two-Factor Authentication</h3>' +
        '<p class="text-textLight mb-4">Email verified: <span class="text-primary font-bold">' + this.currentEmail + '</span></p>' +
        '<div class="border-t border-primary/20 pt-4 mb-4">' +
        '<p class="text-textLight mb-2">Enter the 6-digit code:</p>' +
        '<p class="text-primary text-3xl font-bold tracking-widest" id="2fa-code">' + code + '</p>' +
        '<p class="text-muted text-xs">(Demo: code shown above)</p></div>' +
        '<input type="text" id="2fa-input" class="edit-input w-full px-4 py-3 rounded text-center text-2xl tracking-widest" maxlength="6" placeholder="000000"/>' +
        '<p id="2fa-error" class="text-red-400 text-sm mt-2 hidden">Invalid code</p>' +
        '<div class="flex gap-4 mt-6"><button id="2fa-verify" class="edit-btn w-full px-4 py-3 rounded font-display">Verify</button>' +
        '<button id="2fa-cancel" class="edit-btn w-full px-4 py-3 rounded font-display">Cancel</button></div></div>';
    document.body.appendChild(modal);
    
    document.getElementById('2fa-verify').onclick = function() {
        if (AuthModule.verify2FA(document.getElementById('2fa-input').value)) {
            document.body.removeChild(modal);
            AuthModule.isAdmin = true;
            onSuccess(true);
        } else {
            document.getElementById('2fa-error').classList.remove('hidden');
            document.getElementById('2fa-input').value = '';
        }
    };
    document.getElementById('2fa-cancel').onclick = function() {
        document.body.removeChild(modal);
        localStorage.removeItem('dialogue2FA');
        onError('cancelled');
    };
    document.getElementById('2fa-input').focus();
};
AuthModule.showSetupModal = function() {
    var savedClientId = localStorage.getItem('dialogueClientId') || '';
    var modal = document.createElement('div');
    modal.id = 'setup-modal';
    modal.className = 'fixed inset-0 z-[100] bg-black/80 flex items-center justify-center';
    modal.innerHTML = '<div class="p-8 rounded-lg max-w-md w-full mx-4" style="background:rgba(31,37,47,0.95);border:1px solid rgba(211,188,142,0.3)">' +
        '<span class="material-symbols-outlined text-primary text-3xl mb-2">admin_panel_settings</span>' +
        '<h3 class="font-display text-xl text-primary mb-4">Admin Configuration</h3>' +
        '<div class="space-y-4">' +
        '<div><label class="font-display text-sm text-primary">Admin Email</label>' +
        '<input type="email" id="admin-email" class="edit-input w-full px-4 py-2 rounded mt-1" placeholder="admin@example.com" value="' + (AuthModule.adminEmail || '') + '"/></div>' +
        '<div><label class="font-display text-sm text-primary">Google Client ID</label>' +
        '<input type="text" id="client-id" class="edit-input w-full px-4 py-2 rounded mt-1" placeholder="CLIENT_ID.apps.googleusercontent.com" value="' + savedClientId + '"/></div>' +
        '<div><label class="font-display text-sm text-primary flex items-center gap-2">' +
        '<input type="checkbox" id="enable-2fa" checked class="accent-primary"/> Enable 2FA</label></div>' +
        '<div class="flex gap-4 mt-6"><button id="save-setup" class="edit-btn w-full px-4 py-3 rounded font-display">Save</button>' +
        '<button id="cancel-setup" class="edit-btn w-full px-4 py-3 rounded font-display">Cancel</button></div></div></div>';
    document.body.appendChild(modal);
    
    document.getElementById('save-setup').onclick = function() {
        var email = document.getElementById('admin-email').value;
        var clientId = document.getElementById('client-id').value;
        var enable2FA = document.getElementById('enable-2fa').checked;
        if (email && clientId) {
            AuthModule.saveConfig(email, enable2FA);
            localStorage.setItem('dialogueClientId', clientId);
            document.body.removeChild(modal);
            alert('Admin configured successfully!');
        } else { alert('Please fill all fields'); }
    };
    document.getElementById('cancel-setup').onclick = function() { document.body.removeChild(modal); };
};
AuthModule.showLoginModal = function(onSuccess, onError) {
    AuthModule.loadConfig();
    var clientId = localStorage.getItem('dialogueClientId');
    if (!clientId || !AuthModule.adminEmail) {
        AuthModule.showSetupModal();
        return;
    }
    
    var modal = document.createElement('div');
    modal.id = 'login-modal';
    modal.className = 'fixed inset-0 z-[100] bg-black/80 flex items-center justify-center';
    modal.innerHTML = '<div class="p-8 rounded-lg max-w-md w-full mx-4 text-center" style="background:rgba(31,37,47,0.95);border:1px solid rgba(211,188,142,0.3)">' +
        '<span class="material-symbols-outlined text-primary text-3xl mb-2">lock</span>' +
        '<h3 class="font-display text-xl text-primary mb-2">Step 1: Admin Login</h3>' +
        '<p class="text-muted text-sm mb-4">Required email: <span class="text-primary">' + AuthModule.adminEmail + '</span></p>' +
        '<p class="text-textLight mb-6">Sign in with Google to verify your email</p>' +
        '<button id="google-btn" class="edit-btn w-full px-4 py-3 rounded font-display flex items-center justify-center gap-2">' +
        '<span class="material-symbols-outlined">login</span>Sign in with Google</button>' +
        '<button id="setup-btn" class="edit-btn w-full px-4 py-3 rounded font-display mt-4">Configure Admin</button>' +
        '<button id="cancel-btn" class="text-muted mt-4 text-sm hover:text-primary">Cancel</button></div>';
    document.body.appendChild(modal);
    
    document.getElementById('google-btn').onclick = function() {
        this.disabled = true;
        this.innerHTML = '<span class="material-symbols-outlined animate-spin">progress_activity</span> Verifying...';
        AuthModule.signIn(clientId, onSuccess, function(err) {
            AuthModule.showError(err);
            document.body.removeChild(modal);
        });
    };
    document.getElementById('setup-btn').onclick = function() { document.body.removeChild(modal); AuthModule.showSetupModal(); };
    document.getElementById('cancel-btn').onclick = function() { document.body.removeChild(modal); };
};

AuthModule.showError = function(msg) {
    var modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-[110] bg-black/80 flex items-center justify-center';
    modal.innerHTML = '<div class="p-8 rounded-lg max-w-md w-full mx-4 text-center" style="background:rgba(31,37,47,0.95);border:1px solid rgba(255,100,100,0.5)">' +
        '<span class="material-symbols-outlined text-red-400 text-3xl mb-2">error</span>' +
        '<h3 class="font-display text-xl text-red-400 mb-4">Access Denied</h3>' +
        '<p class="text-textLight mb-6">' + msg + '</p>' +
        '<button id="close-err" class="edit-btn px-6 py-2 rounded font-display">Close</button></div>';
    document.body.appendChild(modal);
    document.getElementById('close-err').onclick = function() { document.body.removeChild(modal); };
};
