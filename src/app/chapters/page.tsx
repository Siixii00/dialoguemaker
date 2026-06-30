"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface ChapterItem {
  id: string;
  chapter_id: string;
  chapter_num: string | null;
  chapter_title: string;
  chapter_desc: string | null;
  order_index: number;
}

interface Chapter {
  id: string;
  page_title: string;
  page_subtitle: string | null;
  background_image: string | null;
  items: ChapterItem[];
}

interface Sequence {
  id: string;
  chapter_item_id: string;
  title: string;
  description: string | null;
}

export default function ChapterSelectionPage() {
  const router = useRouter();
  const [editMode, setEditMode] = useState(false);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [clientId, setClientId] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [sequences, setSequences] = useState<Record<string, Sequence[]>>({});
  
  const [newItem, setNewItem] = useState({ num: "", title: "", desc: "" });
  const bgInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchChapters();
    loadAdminConfig();
  }, []);

  const fetchSequencesForItem = async (itemId: string) => {
    try {
      const res = await fetch(`/api/sequences?chapterItemId=${itemId}`);
      const data = await res.json();
      setSequences(prev => ({ ...prev, [itemId]: data }));
    } catch (error) {
      console.error("Failed to fetch sequences:", error);
    }
  };

  const createSequenceForItem = async (itemId: string, title: string) => {
    try {
      const formData = new FormData();
      formData.append("chapterItemId", itemId);
      formData.append("title", title);
      
      const res = await fetch("/api/sequences", { method: "POST", body: formData });
      const newSequence = await res.json();
      
      setSequences(prev => ({
        ...prev,
        [itemId]: [...(prev[itemId] || []), newSequence]
      }));
      
      router.push(`/editor/${newSequence.id}`);
    } catch (error) {
      console.error("Failed to create sequence:", error);
    }
  };

  const fetchChapters = async () => {
    try {
      const res = await fetch("/api/chapters");
      const data = await res.json();
      setChapters(data);
      if (data.length > 0) {
        setCurrentChapter(data[0]);
      } else {
        setCurrentChapter({
          id: "",
          page_title: "Chronicles",
          page_subtitle: "Select your next story beat",
          background_image: null,
          items: [],
        });
      }
    } catch (error) {
      console.error("Failed to fetch chapters:", error);
    }
  };

  const loadAdminConfig = () => {
    localStorage.setItem("dialogueAdminEmail", "yaninlin@gmail.com");
    setAdminEmail("yaninlin@gmail.com");
    const savedClientId = localStorage.getItem("dialogueClientId");
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      
      setCurrentChapter(prev => prev ? { ...prev, background_image: data.url } : null);
    } catch (error) {
      console.error("Upload error:", error);
    }
    setLoading(false);
  };

  const updateChapter = async () => {
    if (!currentChapter) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("pageTitle", currentChapter.page_title);
      formData.append("pageSubtitle", currentChapter.page_subtitle || "");
      if (currentChapter.background_image) {
        formData.append("backgroundImageUrl", currentChapter.background_image);
      }
      
      if (currentChapter.id) {
        // Update existing - need to implement PUT in API
      } else {
        const res = await fetch("/api/chapters", { method: "POST", body: formData });
        const data = await res.json();
        setCurrentChapter({ ...currentChapter, id: data.id });
      }
      
      fetchChapters();
    } catch (error) {
      console.error("Save error:", error);
    }
    setLoading(false);
  };

  const addChapterItem = async () => {
    if (!currentChapter || !newItem.title) return;
    
    try {
      await fetch("/api/chapter-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapterId: currentChapter.id,
          chapterNum: newItem.num,
          chapterTitle: newItem.title,
          chapterDesc: newItem.desc,
          orderIndex: currentChapter.items.length,
        }),
      });
      
      setNewItem({ num: "", title: "", desc: "" });
      fetchChapters();
    } catch (error) {
      console.error("Add item error:", error);
    }
  };

  const deleteChapterItem = async (itemId: string) => {
    try {
      await fetch(`/api/chapter-items?id=${itemId}`, { method: "DELETE" });
      fetchChapters();
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const handleChapterClick = async (item: ChapterItem) => {
    if (editMode) {
      if (!sequences[item.id]) {
        await fetchSequencesForItem(item.id);
      }
      return;
    }
    
    if (!sequences[item.id]) {
      await fetchSequencesForItem(item.id);
    }
    
    const itemSequences = sequences[item.id];
    if (itemSequences && itemSequences.length > 0) {
      router.push(`/play/${itemSequences[0].id}`);
    }
  };

  return (
    <div className="bg-black text-text-light font-body min-h-screen relative">
      <button
        onClick={toggleEditMode}
        className="fixed top-4 right-4 z-50 edit-btn px-4 py-2 rounded-full font-display text-sm flex items-center gap-2"
      >
        <span className="material-symbols-outlined">{editMode ? "visibility" : "edit"}</span>
        <span>{editMode ? "VIEW MODE" : "EDIT MODE"}</span>
      </button>

      <div
        className="absolute inset-0 bg-cover"
        style={{
          backgroundColor: "#1F252F",
          backgroundImage: currentChapter?.background_image ? `url('${currentChapter.background_image}')` : "none",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

      <div className="relative z-10 min-h-screen flex flex-col">
        <header className="px-10 pt-6 pb-4 backdrop-blur-md bg-surface/60 rounded-md mx-auto w-full max-w-[960px]">
          <div className="flex items-center gap-4">
            <Link href="/" className="w-4 text-primary">
              <svg viewBox="0 0 48 48">
                <path d="M42.4379 44C42.4379 44 36.0744 33.9038 41.1692 24C46.8624 12.9336 42.2078 4 42.2078 4L7.01134 4C7.01134 4 11.6577 12.932 5.96912 23.9969C0.876273 33.9029 7.27094 44 7.27094 44L42.4379 44Z" fill="currentColor"/>
              </svg>
            </Link>
            <h1 className="text-xl font-display text-primary tracking-wider">Chapter Selection</h1>
          </div>
        </header>

        <div className="px-10 py-4 backdrop-blur-md bg-surface/40 rounded-md mx-auto w-full max-w-[960px] mb-6">
          <h2 id="title" className="text-primary text-3xl font-display tracking-wide">{currentChapter?.page_title || "Chronicles"}</h2>
          <p id="subtitle" className="text-text-light text-sm font-body">{currentChapter?.page_subtitle || "Select your next story beat"}</p>
        </div>

        <main className="relative z-10 flex-grow flex items-center justify-center px-12 py-12">
          <div className="w-full max-w-7xl">
            <div className="hidden lg:block absolute top-[90%] left-[5%] right-[5%] h-[2px] bg-muted overflow-hidden">
              <div className="h-full bg-primary w-2/3 shadow-[0_0_10px_#D3BC8E]"></div>
            </div>
            <div className="flex flex-row gap-12 overflow-x-auto pb-12 pt-8 px-4 snap-x snap-mandatory scroll-smooth items-stretch">
              {currentChapter?.items.map((item, index) => (
                <div
                  key={item.id}
                  className="min-w-[280px] snap-center group"
                >
                  <div 
                    className="relative bg-surface/80 backdrop-blur-md border border-primary/30 rounded-lg p-6 h-full flex flex-col hover:border-primary transition-all cursor-pointer"
                    onClick={() => handleChapterClick(item)}
                  >
                    {editMode && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteChapterItem(item.id);
                        }}
                        className="absolute top-2 right-2 text-muted hover:text-red-400"
                      >
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    )}
                    <span className="text-primary text-5xl font-display mb-2">{item.chapter_num || index + 1}</span>
                    <h3 className="text-primary font-display text-xl mb-2">{item.chapter_title}</h3>
                    {item.chapter_desc && (
                      <p className="text-muted text-sm flex-grow">{item.chapter_desc}</p>
                    )}
                    <div className="mt-4 flex justify-between items-center">
                      {!editMode && sequences[item.id] && sequences[item.id].length > 0 && (
                        <span className="text-xs text-muted">有 {sequences[item.id].length} 個對話序列</span>
                      )}
                      {!editMode && (!sequences[item.id] || sequences[item.id].length === 0) && (
                        <span className="text-xs text-muted/50">尚未建立對話序列</span>
                      )}
                      <span className="material-symbols-outlined text-primary group-hover:translate-x-2 transition-transform">arrow_forward</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
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
              <label className="font-display text-sm text-primary">Page Title</label>
              <input
                type="text"
                value={currentChapter?.page_title || ""}
                onChange={(e) => setCurrentChapter(prev => prev ? { ...prev, page_title: e.target.value } : null)}
                className="edit-input w-full px-4 py-2 rounded"
                placeholder="Enter title"
              />
            </div>

            <div className="space-y-2">
              <label className="font-display text-sm text-primary">Subtitle</label>
              <input
                type="text"
                value={currentChapter?.page_subtitle || ""}
                onChange={(e) => setCurrentChapter(prev => prev ? { ...prev, page_subtitle: e.target.value } : null)}
                className="edit-input w-full px-4 py-2 rounded"
                placeholder="Enter subtitle"
              />
            </div>

            <div className="space-y-2">
              <label className="font-display text-sm text-primary">Background Image</label>
              <input ref={bgInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              <div className="flex gap-2">
                <button onClick={() => bgInputRef.current?.click()} className="edit-btn px-4 py-2 rounded">
                  {loading ? "Uploading..." : "Upload"}
                </button>
                <button onClick={() => setCurrentChapter(prev => prev ? { ...prev, background_image: null } : null)} className="edit-btn px-4 py-2 rounded">
                  Clear
                </button>
              </div>
              {currentChapter?.background_image && (
                <img src={currentChapter.background_image} className="max-w-[100px] max-h-[100px] rounded mt-2" alt="Background preview" />
              )}
            </div>

            <div className="pt-4 border-t border-primary/20">
              <h4 className="font-display text-sm text-primary mb-4">新增章節項目</h4>
              <div className="space-y-3">
                <input
                  type="text"
                  value={newItem.num}
                  onChange={(e) => setNewItem(prev => ({ ...prev, num: e.target.value }))}
                  className="edit-input w-full px-4 py-2 rounded"
                  placeholder="章節編號（如 I, II, III）"
                />
                <input
                  type="text"
                  value={newItem.title}
                  onChange={(e) => setNewItem(prev => ({ ...prev, title: e.target.value }))}
                  className="edit-input w-full px-4 py-2 rounded"
                  placeholder="章節標題"
                />
                <input
                  type="text"
                  value={newItem.desc}
                  onChange={(e) => setNewItem(prev => ({ ...prev, desc: e.target.value }))}
                  className="edit-input w-full px-4 py-2 rounded"
                  placeholder="章節描述"
                />
                <button onClick={addChapterItem} className="edit-btn w-full px-4 py-2 rounded font-display flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined">add</span>新增章節
                </button>
              </div>
            </div>
                    {sequences[item.id] && sequences[item.id].length > 0 && (
                      <div className="space-y-1">
                        {sequences[item.id].map((seq) => (
                          <div 
                            key={seq.id}
                            className="flex justify-between items-center bg-black/20 rounded px-2 py-1"
                          >
                            <span className="text-muted text-xs truncate">{seq.title}</span>
                            <div className="flex gap-1">
                              <button
                                onClick={() => router.push(`/editor/${seq.id}`)}
                                className="text-primary hover:text-white text-xs"
                              >
                                編輯
                              </button>
                              <button
                                onClick={() => router.push(`/play/${seq.id}`)}
                                className="text-primary hover:text-white text-xs"
                              >
                                播放
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-primary/20 space-y-3">
              <button onClick={updateChapter} className="edit-btn w-full px-4 py-3 rounded font-display flex items-center justify-center gap-2">
                <span className="material-symbols-outlined">save</span>儲存設定
              </button>
            </div>
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
              <div className="flex gap-4 mt-6">
                <button onClick={handleSetup} className="edit-btn w-full px-4 py-3 rounded font-display">Save</button>
                <button onClick={() => setShowSetupModal(false)} className="edit-btn w-full px-4 py-3 rounded font-display">Cancel</button>
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
              <span className="material-symbols-outlined">login</span>Enter Edit Mode
            </button>
            <button onClick={() => setShowAuthModal(false)} className="text-muted mt-4 text-sm hover:text-primary">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}