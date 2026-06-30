"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Dialogue {
  id: string;
  character_name: string;
  dialogue_text: string;
  character_image: string | null;
  background_image: string | null;
}

export default function ActiveDialoguePage() {
  const router = useRouter();
  const [editMode, setEditMode] = useState(false);
  const [state, setState] = useState<Dialogue>({
    id: "",
    character_name: "Character Name",
    dialogue_text: "Enter dialogue...",
    character_image: null,
    background_image: null,
  });
  const [dialogues, setDialogues] = useState<Dialogue[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [clientId, setClientId] = useState("");
  const [require2FA, setRequire2FA] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  
  const charInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const configInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchDialogues();
    loadAdminConfig();
  }, []);

  const fetchDialogues = async () => {
    try {
      const res = await fetch("/api/dialogues");
      const data = await res.json();
      setDialogues(data);
      if (data.length > 0 && !state.id) {
        setState(data[0]);
      }
    } catch (error) {
      console.error("Failed to fetch dialogues:", error);
    }
  };

  const loadAdminConfig = async () => {
    const savedEmail = localStorage.getItem("dialogueAdminEmail");
    const savedClientId = localStorage.getItem("dialogueClientId");
    if (savedEmail) setAdminEmail(savedEmail);
    if (savedClientId) setClientId(savedClientId);
  };

  const toggleEditMode = () => {
    if (!editMode) {
      const savedEmail = localStorage.getItem("dialogueAdminEmail");
      const savedClientId = localStorage.getItem("dialogueClientId");
      if (savedEmail && savedClientId) {
        setShowAuthModal(true);
      } else {
        setShowSetupModal(true);
      }
    } else {
      setEditMode(false);
    }
  };

  const handleSetup = () => {
    if (adminEmail && clientId) {
      localStorage.setItem("dialogueAdminEmail", adminEmail);
      localStorage.setItem("dialogueClientId", clientId);
      setShowSetupModal(false);
      setIsLoggedIn(true);
      setEditMode(true);
    }
  };

  const handleLogin = () => {
    setIsLoggedIn(true);
    setShowAuthModal(false);
    setEditMode(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "character" | "background") => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      
      if (type === "character") {
        setState(prev => ({ ...prev, character_image: data.url }));
      } else {
        setState(prev => ({ ...prev, background_image: data.url }));
      }
    } catch (error) {
      console.error("Upload error:", error);
    }
    setLoading(false);
  };

  const clearImage = (type: "character" | "background") => {
    if (type === "character") {
      setState(prev => ({ ...prev, character_image: null }));
      if (charInputRef.current) charInputRef.current.value = "";
    } else {
      setState(prev => ({ ...prev, background_image: null }));
      if (bgInputRef.current) bgInputRef.current.value = "";
    }
  };

  const saveDialogue = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("characterName", state.character_name);
      formData.append("dialogueText", state.dialogue_text);
      if (state.character_image) formData.append("characterImageUrl", state.character_image);
      if (state.background_image) formData.append("backgroundImageUrl", state.background_image);
      
      if (state.id) {
        formData.append("id", state.id);
        await fetch("/api/dialogues", { method: "PUT", body: formData });
      } else {
        await fetch("/api/dialogues", { method: "POST", body: formData });
      }
      
      fetchDialogues();
    } catch (error) {
      console.error("Save error:", error);
    }
    setLoading(false);
  };

  const loadDialogueConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const config = JSON.parse(event.target?.result as string);
        setState({
          id: "",
          character_name: config.characterName || "Character Name",
          dialogue_text: config.dialogueText || "Enter dialogue...",
          character_image: config.characterImage || null,
          background_image: config.backgroundImage || null,
        });
      } catch {
        alert("Invalid configuration file");
      }
    };
    reader.readAsText(file);
  };

  const exportConfig = () => {
    const config = {
      characterName: state.character_name,
      dialogueText: state.dialogue_text,
      characterImage: state.character_image,
      backgroundImage: state.background_image,
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dialogue-config.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectDialogue = (d: Dialogue) => {
    setState(d);
    setShowLoadModal(false);
  };

  return (
    <div className="bg-black text-text-light font-body h-screen overflow-hidden relative">
      <button
        onClick={toggleEditMode}
        className="fixed top-4 right-4 z-50 edit-btn px-4 py-2 rounded-full font-display text-sm flex items-center gap-2"
      >
        <span className="material-symbols-outlined">{editMode ? "visibility" : "edit"}</span>
        <span>{editMode ? "VIEW MODE" : "EDIT MODE"}</span>
      </button>

      <div
        id="bg"
        className="absolute inset-0 bg-cover"
        style={{
          backgroundColor: "#1F252F",
          backgroundImage: state.background_image ? `url('${state.background_image}')` : "none",
        }}
      />

      <div
        id="char-container"
        className="absolute bottom-[200px] left-[5%] h-[400px] z-10 pointer-events-none"
      >
        {state.character_image && (
          <img
            id="char-preview"
            className="h-full object-contain drop-shadow-2xl"
            src={state.character_image}
            alt="Character"
          />
        )}
      </div>

      <div className="absolute inset-0 z-20 flex flex-col justify-between p-8 pointer-events-none">
        <div className="flex justify-between w-full pointer-events-auto">
          <button
            onClick={() => setShowLoadModal(true)}
            className="text-muted hover:text-primary flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-full px-4 py-2 border border-white/10"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            <span className="font-display text-sm uppercase">Log</span>
          </button>
          <div className="flex gap-4">
            <button className="text-muted hover:text-primary flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-full px-4 py-2 border border-white/10">
              <span className="material-symbols-outlined">play_circle</span>
              <span className="font-display text-sm uppercase">Auto</span>
            </button>
            <button className="text-muted hover:text-primary flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-full px-4 py-2 border border-white/10">
              <span className="material-symbols-outlined">fast_forward</span>
              <span className="font-display text-sm uppercase">Skip</span>
            </button>
          </div>
        </div>

        <div className="w-full max-w-[1200px] mx-auto relative pointer-events-auto mb-8">
          <div className="absolute -top-12 left-8 bg-primary z-30 px-6 py-3 shadow-lg">
            <h2 id="char-name" className="font-display font-bold text-text-dark text-xl">
              {state.character_name}
            </h2>
          </div>

          <div className="relative bg-surface backdrop-blur-md border-t-2 border-primary shadow-2xl h-[240px] w-full flex flex-col p-10">
            <div className="flex-grow overflow-y-auto">
              <p id="dialogue" className="text-xl text-text-light leading-relaxed font-body">
                {state.dialogue_text}
              </p>
            </div>
            <div className="absolute bottom-8 right-10 animate-bounce">
              <svg className="w-8 h-8 diamond" viewBox="0 0 24 24">
                <path d="M12 4L20 12L12 20L4 12L12 4Z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {editMode && (
        <div className="fixed top-0 right-0 h-full w-96 edit-panel z-50 overflow-y-auto">
          <div className="p-6 space-y-6">
            <div className="flex justify-between border-b border-primary/20 pb-4">
              <h3 className="font-display text-xl text-primary">Edit Mode</h3>
              <button onClick={toggleEditMode} className="text-muted hover:text-primary">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-2">
              <label className="font-display text-sm text-primary">Character Name</label>
              <input
                type="text"
                value={state.character_name}
                onChange={(e) => setState(prev => ({ ...prev, character_name: e.target.value || "Character Name" }))}
                className="edit-input w-full px-4 py-2 rounded"
                placeholder="Enter name"
              />
            </div>

            <div className="space-y-2">
              <label className="font-display text-sm text-primary">Dialogue Text</label>
              <textarea
                value={state.dialogue_text}
                onChange={(e) => setState(prev => ({ ...prev, dialogue_text: e.target.value || "Enter dialogue..." }))}
                className="edit-input w-full px-4 py-3 rounded h-32 resize-none"
                placeholder="Enter dialogue..."
              />
            </div>

            <div className="space-y-2">
              <label className="font-display text-sm text-primary">Character Portrait</label>
              <input ref={charInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, "character")} />
              <div className="flex gap-2">
                <button onClick={() => charInputRef.current?.click()} className="edit-btn px-4 py-2 rounded">
                  {loading ? "Uploading..." : "Upload"}
                </button>
                <button onClick={() => clearImage("character")} className="edit-btn px-4 py-2 rounded">
                  Clear
                </button>
              </div>
              {state.character_image && (
                <img src={state.character_image} className="image-preview mt-2" alt="Character preview" />
              )}
            </div>

            <div className="space-y-2">
              <label className="font-display text-sm text-primary">Background</label>
              <input ref={bgInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, "background")} />
              <div className="flex gap-2">
                <button onClick={() => bgInputRef.current?.click()} className="edit-btn px-4 py-2 rounded">
                  Upload
                </button>
                <button onClick={() => clearImage("background")} className="edit-btn px-4 py-2 rounded">
                  Clear
                </button>
              </div>
              {state.background_image && (
                <img src={state.background_image} className="image-preview mt-2" alt="Background preview" />
              )}
            </div>

            <div className="pt-4 border-t border-primary/20 space-y-3">
              <button onClick={saveDialogue} className="edit-btn w-full px-4 py-3 rounded font-display flex items-center justify-center gap-2">
                <span className="material-symbols-outlined">save</span>
                Save to Database
              </button>
              <button onClick={exportConfig} className="edit-btn w-full px-4 py-3 rounded font-display flex items-center justify-center gap-2">
                <span className="material-symbols-outlined">download</span>
                Export JSON
              </button>
              <input ref={configInputRef} type="file" accept=".json" className="hidden" onChange={loadDialogueConfig} />
              <button onClick={() => configInputRef.current?.click()} className="edit-btn w-full px-4 py-3 rounded font-display flex items-center justify-center gap-2">
                <span className="material-symbols-outlined">folder_open</span>
                Load JSON File
              </button>
              <button onClick={() => router.push("/chapters")} className="edit-btn w-full px-4 py-3 rounded font-display flex items-center justify-center gap-2">
                <span className="material-symbols-outlined">menu_book</span>
                Chapter Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {showLoadModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center">
          <div className="p-8 rounded-lg max-w-md w-full mx-4" style={{ background: "rgba(31,37,47,0.95)", border: "1px solid rgba(211,188,142,0.3)" }}>
            <h3 className="font-display text-xl text-primary mb-4">Saved Dialogues</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {dialogues.length === 0 ? (
                <p className="text-muted">No saved dialogues</p>
              ) : (
                dialogues.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => selectDialogue(d)}
                    className="edit-btn w-full px-4 py-2 rounded text-left"
                  >
                    {d.character_name}: {d.dialogue_text.substring(0, 30)}...
                  </button>
                ))
              )}
            </div>
            <button onClick={() => setShowLoadModal(false)} className="edit-btn w-full px-4 py-3 rounded font-display mt-4">
              Close
            </button>
          </div>
        </div>
      )}

      {showSetupModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center">
          <div className="p-8 rounded-lg max-w-md w-full mx-4" style={{ background: "rgba(31,37,47,0.95)", border: "1px solid rgba(211,188,142,0.3)" }}>
            <span className="material-symbols-outlined text-primary text-3xl mb-2">admin_panel_settings</span>
            <h3 className="font-display text-xl text-primary mb-4">Admin Configuration</h3>
            <div className="space-y-4">
              <div>
                <label className="font-display text-sm text-primary">Admin Email</label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="edit-input w-full px-4 py-2 rounded mt-1"
                  placeholder="admin@example.com"
                />
              </div>
              <div>
                <label className="font-display text-sm text-primary">Google Client ID</label>
                <input
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="edit-input w-full px-4 py-2 rounded mt-1"
                  placeholder="CLIENT_ID.apps.googleusercontent.com"
                />
              </div>
              <div>
                <label className="font-display text-sm text-primary flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={require2FA}
                    onChange={(e) => setRequire2FA(e.target.checked)}
                    className="accent-primary"
                  />
                  Enable 2FA
                </label>
              </div>
              <div className="flex gap-4 mt-6">
                <button onClick={handleSetup} className="edit-btn w-full px-4 py-3 rounded font-display">
                  Save
                </button>
                <button onClick={() => setShowSetupModal(false)} className="edit-btn w-full px-4 py-3 rounded font-display">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAuthModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center">
          <div className="p-8 rounded-lg max-w-md w-full mx-4 text-center" style={{ background: "rgba(31,37,47,0.95)", border: "1px solid rgba(211,188,142,0.3)" }}>
            <span className="material-symbols-outlined text-primary text-3xl mb-2">lock</span>
            <h3 className="font-display text-xl text-primary mb-2">Admin Login</h3>
            <p className="text-muted text-sm mb-4">Required email: <span className="text-primary">{adminEmail}</span></p>
            <button onClick={handleLogin} className="edit-btn w-full px-4 py-3 rounded font-display flex items-center justify-center gap-2">
              <span className="material-symbols-outlined">login</span>
              Enter Edit Mode
            </button>
            <button onClick={() => setShowAuthModal(false)} className="text-muted mt-4 text-sm hover:text-primary">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}