"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  useDroppable,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface ChapterItem {
  id: string;
  chapter_id: string;
  chapter_num: string | null;
  chapter_title: string;
  chapter_desc: string | null;
  order_index: number;
  position_x: number;
  position_y: number;
  card_width: number;
  card_height: number;
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

function SortableChapterCard({
  item,
  index,
  editMode,
  sequences,
  onClick,
  onDelete,
  onEdit,
}: {
  item: ChapterItem;
  index: number;
  editMode: boolean;
  sequences: Sequence[];
  onClick: () => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${isDragging ? "z-10" : ""}`}
    >
      <div
        className={`relative bg-surface/80 backdrop-blur-md border border-primary/30 rounded-lg p-6 h-full flex flex-col hover:border-primary transition-all ${
          editMode ? "border-dashed border-2" : ""
        }`}
      >
        {editMode && (
          <>
            <div
              {...attributes}
              {...listeners}
              className="absolute top-2 left-2 text-muted hover:text-primary cursor-grab active:cursor-grabbing z-20"
            >
              <span className="material-symbols-outlined text-lg">drag_indicator</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="absolute top-2 right-2 text-muted hover:text-red-400 z-20"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="absolute bottom-2 right-2 text-muted hover:text-primary z-20"
            >
              <span className="material-symbols-outlined text-lg">edit</span>
            </button>
          </>
        )}
        <div onClick={editMode ? undefined : onClick} className="cursor-pointer">
          <span className="text-primary text-5xl font-display mb-2">
            {item.chapter_num || index + 1}
          </span>
          <h3 className="text-primary font-display text-xl mb-2">
            {item.chapter_title}
          </h3>
          {item.chapter_desc && (
            <p className="text-muted text-sm flex-grow">{item.chapter_desc}</p>
          )}
          <div className="mt-4 flex justify-between items-center">
            {!editMode && sequences && sequences.length > 0 && (
              <span className="text-xs text-muted">
                有 {sequences.length} 個對話序列
              </span>
            )}
            {!editMode && (!sequences || sequences.length === 0) && (
              <span className="text-xs text-muted/50">尚未建立對話序列</span>
            )}
            {!editMode && (
              <span className="material-symbols-outlined text-primary group-hover:translate-x-2 transition-transform">
                arrow_forward
              </span>
            )}
            {editMode && sequences && sequences.length > 0 && (
              <span className="text-xs text-muted">
                有 {sequences.length} 個對話序列
              </span>
            )}
            {editMode && (!sequences || sequences.length === 0) && (
              <span className="text-xs text-muted/50">尚未建立對話序列</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChapterSelectionPage() {
  const router = useRouter();
  const [editMode, setEditMode] = useState(false);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const [loading, setLoading] = useState(false);
  const [sequences, setSequences] = useState<Record<string, Sequence[]>>({});
  
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [show2FAVerify, setShow2FAVerify] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [authError, setAuthError] = useState("");
  const [adminConfig, setAdminConfig] = useState<{ adminEmail: string; googleClientId: string; twoFactorEnabled: boolean } | null>(null);
  const [googleUserEmail, setGoogleUserEmail] = useState<string | null>(null);
  
  const [newItem, setNewItem] = useState({ num: "", title: "", desc: "" });
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchChapters();
    fetchAdminConfig();
    checkSession();
    checkOAuthCallback();
  }, []);

  const checkSession = () => {
    const session = sessionStorage.getItem("admin_session");
    if (session) {
      const sessionData = JSON.parse(session);
      if (sessionData.authenticated && sessionData.email) {
        setGoogleUserEmail(sessionData.email);
        setEditMode(true);
      }
    }
  };

  const checkOAuthCallback = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const authSuccess = urlParams.get("auth_success");
    const authError = urlParams.get("auth_error");
    const authEmail = urlParams.get("email");
    const require2FA = urlParams.get("require_2fa");

    console.log("OAuth callback check:", { authSuccess, authError, authEmail, require2FA });

    if (authError) {
      setAuthError(`登入失敗: ${authError}`);
      setShowLoginModal(true);
      window.history.replaceState({}, "", "/chapters");
      return;
    }

    if (authSuccess === "true" && authEmail) {
      window.history.replaceState({}, "", "/chapters");
      setGoogleUserEmail(authEmail);

      if (require2FA === "true") {
        setShow2FAVerify(true);
      } else {
        try {
          const res = await fetch("/api/auth/setup-2fa", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: authEmail }),
          });
          const data = await res.json();
          console.log("2FA setup response:", data);
          
          if (res.ok) {
            setQrCodeUrl(data.qrCodeUrl);
            setShow2FASetup(true);
          } else if (data.error === "2FA 已設定，請使用驗證碼登入") {
            setShow2FAVerify(true);
          } else {
            setAuthError(data.error || "設定 2FA 失敗");
            setShowLoginModal(true);
          }
        } catch (err) {
          console.error("2FA setup error:", err);
          setAuthError("設定 2FA 時發生錯誤");
          setShowLoginModal(true);
        }
      }
    }
  };

  const fetchAdminConfig = async () => {
    try {
      const res = await fetch("/api/admin-config");
      const data = await res.json();
      setAdminConfig(data);
    } catch (error) {
      console.error("Failed to fetch admin config:", error);
    }
  };

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
          page_title: "故事章節",
          page_subtitle: "選擇您的故事進度",
          background_image: null,
          items: [],
        });
      }
    } catch (error) {
      console.error("Failed to fetch chapters:", error);
    }
  };

  const toggleEditMode = () => {
    if (!editMode) {
      const session = sessionStorage.getItem("admin_session");
      if (session) {
        const sessionData = JSON.parse(session);
        if (sessionData.authenticated) {
          setEditMode(true);
          return;
        }
      }
      setShowLoginModal(true);
    } else {
      setEditMode(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("admin_session");
    setEditMode(false);
    setGoogleUserEmail(null);
  };

  const handleGoogleLogin = () => {
    const clientId = adminConfig?.googleClientId || "807013160344-ircr1f9gmb9gv7617ilc7asfecv737d5.apps.googleusercontent.com";
    
    const redirectUri = `${window.location.origin}/api/auth/callback`;
    const scope = "email profile";
    
    const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    googleAuthUrl.searchParams.set("client_id", clientId);
    googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
    googleAuthUrl.searchParams.set("response_type", "code");
    googleAuthUrl.searchParams.set("scope", scope);
    
    sessionStorage.setItem("pendingLogin", "true");
    
    window.location.href = googleAuthUrl.toString();
  };

  const handle2FAVerify = async () => {
    if (!verifyCode || verifyCode.length !== 6) {
      setAuthError("請輸入 6 位數驗證碼");
      return;
    }

    setAuthError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: googleUserEmail || adminConfig?.adminEmail, code: verifyCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAuthError(data.error || "驗證失敗");
      } else {
        sessionStorage.setItem("admin_session", JSON.stringify({
          authenticated: true,
          email: googleUserEmail || adminConfig?.adminEmail,
          timestamp: Date.now()
        }));
        setShow2FAVerify(false);
        setShow2FASetup(false);
        setEditMode(true);
        setVerifyCode("");
      }
    } catch (error) {
      console.error("Error verifying 2FA:", error);
      setAuthError("驗證時發生錯誤");
    }

    setLoading(false);
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
        // Update existing
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
      setShowAddModal(false);
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

  const handleEditChapterItem = async (item: ChapterItem) => {
    if (!sequences[item.id]) {
      await fetchSequencesForItem(item.id);
    }
    
    const itemSequences = sequences[item.id];
    if (itemSequences && itemSequences.length > 0) {
      router.push(`/editor/${itemSequences[0].id}`);
    } else {
      createSequenceForItem(item.id, `${item.chapter_title} - 對話序列`);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveDragId(active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);

    if (!over || !currentChapter) return;

    if (active.id !== over.id) {
      const oldIndex = currentChapter.items.findIndex(
        (item) => item.id === active.id
      );
      const newIndex = currentChapter.items.findIndex(
        (item) => item.id === over.id
      );

      const newItems = arrayMove(currentChapter.items, oldIndex, newIndex);

      newItems.forEach((item, idx) => {
        item.order_index = idx;
      });

      setCurrentChapter((prev) => prev ? { ...prev, items: newItems } : null);

      try {
        for (const item of newItems) {
          await fetch("/api/chapter-items", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: item.id,
              orderIndex: item.order_index,
            }),
          });
        }
      } catch (error) {
        console.error("Error reordering:", error);
        fetchChapters();
      }
    }
  };

  return (
    <div className="bg-black text-text-light font-body min-h-screen relative">
      <button
        onClick={toggleEditMode}
        className="fixed top-4 right-4 z-50 edit-btn px-4 py-2 rounded-full font-display text-sm flex items-center gap-2"
      >
        <span className="material-symbols-outlined">{editMode ? "visibility" : "edit"}</span>
        <span>{editMode ? "預覽模式" : "編輯模式"}</span>
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
            <h1 className="text-xl font-display text-primary tracking-wider">章節選擇</h1>
          </div>
        </header>

        <div className="px-10 py-4 backdrop-blur-md bg-surface/40 rounded-md mx-auto w-full max-w-[960px] mb-6">
          <h2 id="title" className="text-primary text-3xl font-display tracking-wide">{currentChapter?.page_title || "故事章節"}</h2>
          <p id="subtitle" className="text-text-light text-sm font-body">{currentChapter?.page_subtitle || "選擇您的故事進度"}</p>
        </div>

        <main className="relative z-10 flex-grow flex items-center justify-center px-12 py-12">
          <div className="w-full max-w-7xl">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={currentChapter?.items.map((item) => item.id) || []}
                strategy={rectSortingStrategy}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-4">
                  {currentChapter?.items.map((item, index) => (
                    <SortableChapterCard
                      key={item.id}
                      item={item}
                      index={index}
                      editMode={editMode}
                      sequences={sequences[item.id] || []}
                      onClick={() => handleChapterClick(item)}
                      onDelete={() => deleteChapterItem(item.id)}
                      onEdit={() => handleEditChapterItem(item)}
                    />
                  ))}
                </div>
              </SortableContext>
              <DragOverlay>
                {activeDragId && currentChapter?.items.find((item) => item.id === activeDragId) ? (
                  <div className="bg-surface/80 backdrop-blur-md border border-primary rounded-lg p-6 shadow-2xl">
                    <span className="text-primary text-5xl font-display">
                      {currentChapter?.items.find((item) => item.id === activeDragId)?.chapter_num || 
                       (currentChapter?.items.findIndex((item) => item.id === activeDragId)! + 1)}
                    </span>
                    <h3 className="text-primary font-display text-xl mt-2">
                      {currentChapter?.items.find((item) => item.id === activeDragId)?.chapter_title}
                    </h3>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        </main>
      </div>

      {editMode && (
        <>
          <button
            onClick={() => setShowAddModal(true)}
            className="fixed bottom-24 right-4 z-50 bg-primary text-black px-4 py-3 rounded-full font-display text-sm flex items-center gap-2 shadow-lg hover:bg-primary/90 transition-colors"
          >
            <span className="material-symbols-outlined">add</span>
            新增章節
          </button>

          <button
            onClick={() => setShowSettingsModal(true)}
            className="fixed bottom-40 right-4 z-50 bg-surface/90 text-primary px-4 py-3 rounded-full font-display text-sm flex items-center gap-2 shadow-lg hover:bg-surface transition-colors border border-primary/30"
          >
            <span className="material-symbols-outlined">settings</span>
            頁面設定
          </button>
        </>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center">
          <div className="p-8 rounded-lg max-w-md w-full mx-4" style={{ background: "rgba(31,37,47,0.95)", border: "1px solid rgba(211,188,142,0.3)" }}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-display text-xl text-primary">新增章節</h3>
              <button onClick={() => setShowAddModal(false)} className="text-muted hover:text-primary">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="font-display text-sm text-primary">章節編號</label>
                <input
                  type="text"
                  value={newItem.num}
                  onChange={(e) => setNewItem(prev => ({ ...prev, num: e.target.value }))}
                  className="edit-input w-full px-4 py-2 rounded"
                  placeholder="如 I, II, III"
                />
              </div>

              <div className="space-y-2">
                <label className="font-display text-sm text-primary">章節標題</label>
                <input
                  type="text"
                  value={newItem.title}
                  onChange={(e) => setNewItem(prev => ({ ...prev, title: e.target.value }))}
                  className="edit-input w-full px-4 py-2 rounded"
                  placeholder="章節標題"
                />
              </div>

              <div className="space-y-2">
                <label className="font-display text-sm text-primary">章節描述</label>
                <textarea
                  value={newItem.desc}
                  onChange={(e) => setNewItem(prev => ({ ...prev, desc: e.target.value }))}
                  className="edit-input w-full px-4 py-2 rounded min-h-[80px]"
                  placeholder="章節描述"
                />
              </div>

              <button onClick={addChapterItem} className="edit-btn w-full px-4 py-3 rounded font-display flex items-center justify-center gap-2">
                <span className="material-symbols-outlined">add</span>新增章節
              </button>
            </div>
          </div>
        </div>
      )}

      {showSettingsModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center">
          <div className="p-8 rounded-lg max-w-md w-full mx-4" style={{ background: "rgba(31,37,47,0.95)", border: "1px solid rgba(211,188,142,0.3)" }}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-display text-xl text-primary">頁面設定</h3>
              <button onClick={() => setShowSettingsModal(false)} className="text-muted hover:text-primary">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="font-display text-sm text-primary">頁面標題</label>
                <input
                  type="text"
                  value={currentChapter?.page_title || ""}
                  onChange={(e) => setCurrentChapter(prev => prev ? { ...prev, page_title: e.target.value } : null)}
                  className="edit-input w-full px-4 py-2 rounded"
                  placeholder="輸入標題"
                />
              </div>

              <div className="space-y-2">
                <label className="font-display text-sm text-primary">副標題</label>
                <input
                  type="text"
                  value={currentChapter?.page_subtitle || ""}
                  onChange={(e) => setCurrentChapter(prev => prev ? { ...prev, page_subtitle: e.target.value } : null)}
                  className="edit-input w-full px-4 py-2 rounded"
                  placeholder="輸入副標題"
                />
              </div>

              <div className="space-y-2">
                <label className="font-display text-sm text-primary">背景圖片</label>
                <input ref={bgInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                <div className="flex gap-2">
                  <button onClick={() => bgInputRef.current?.click()} className="edit-btn px-4 py-2 rounded">
                    {loading ? "上傳中..." : "上傳"}
                  </button>
                  <button onClick={() => setCurrentChapter(prev => prev ? { ...prev, background_image: null } : null)} className="edit-btn px-4 py-2 rounded">
                    清除
                  </button>
                </div>
                {currentChapter?.background_image && (
                  <img src={currentChapter.background_image} className="max-w-[100px] max-h-[100px] rounded mt-2" alt="背景預覽" />
                )}
              </div>

              <button onClick={updateChapter} className="edit-btn w-full px-4 py-3 rounded font-display flex items-center justify-center gap-2">
                <span className="material-symbols-outlined">save</span>儲存設定
              </button>
            </div>
          </div>
        </div>
      )}

      {showLoginModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center">
          <div className="p-8 rounded-lg max-w-md w-full mx-4" style={{ background: "rgba(31,37,47,0.95)", border: "1px solid rgba(211,188,142,0.3)" }}>
            <span className="material-symbols-outlined text-primary text-3xl mb-2">admin_panel_settings</span>
            <h3 className="font-display text-xl text-primary mb-4">管理員登入</h3>
            
            <p className="text-muted text-sm mb-6">請使用 Google 帳號登入，系統會自動驗證管理員身份</p>

            {authError && (
              <div className="bg-red-900/30 border border-red-500/50 rounded p-3 mb-4">
                <p className="text-red-400 text-sm">{authError}</p>
              </div>
            )}

            <button 
              onClick={handleGoogleLogin}
              className="w-full px-4 py-3 rounded font-display flex items-center justify-center gap-2 bg-white text-black hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              使用 Google 登入
            </button>

            <button onClick={() => { setShowLoginModal(false); setAuthError(""); }} className="text-muted mt-4 text-sm hover:text-primary w-full text-center">
              取消
            </button>
          </div>
        </div>
      )}

      {show2FASetup && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center">
          <div className="p-8 rounded-lg max-w-md w-full mx-4 text-center" style={{ background: "rgba(31,37,47,0.95)", border: "1px solid rgba(211,188,142,0.3)" }}>
            <span className="material-symbols-outlined text-primary text-3xl mb-2">qr_code_2</span>
            <h3 className="font-display text-xl text-primary mb-2">設定兩步驟驗證</h3>
            <p className="text-muted text-sm mb-4">請使用 Google Authenticator 或其他 TOTP App 掃描下方 QR Code</p>
            
            {qrCodeUrl && (
              <div className="bg-white p-4 rounded-lg inline-block mb-4">
                <img src={qrCodeUrl} alt="2FA QR Code" className="w-48 h-48" />
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="font-display text-sm text-primary">輸入 6 位數驗證碼</label>
                <input
                  type="text"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="edit-input w-full px-4 py-2 rounded mt-1 text-center text-2xl tracking-widest"
                  placeholder="000000"
                  maxLength={6}
                />
              </div>

              {authError && (
                <p className="text-red-400 text-sm">{authError}</p>
              )}

              <button 
                onClick={handle2FAVerify} 
                disabled={loading || verifyCode.length !== 6}
                className="edit-btn w-full px-4 py-3 rounded font-display flex items-center justify-center gap-2"
              >
                {loading ? "驗證中..." : "驗證並啟用"}
              </button>
            </div>

            <button onClick={() => { setShow2FASetup(false); setAuthError(""); setVerifyCode(""); }} className="text-muted mt-4 text-sm hover:text-primary">
              取消
            </button>
          </div>
        </div>
      )}

      {show2FAVerify && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center">
          <div className="p-8 rounded-lg max-w-md w-full mx-4 text-center" style={{ background: "rgba(31,37,47,0.95)", border: "1px solid rgba(211,188,142,0.3)" }}>
            <span className="material-symbols-outlined text-primary text-3xl mb-2">lock</span>
            <h3 className="font-display text-xl text-primary mb-2">兩步驟驗證</h3>
            <p className="text-muted text-sm mb-4">請輸入 Google Authenticator 產生的 6 位數驗證碼</p>
            
            <div className="space-y-4">
              <input
                type="text"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="edit-input w-full px-4 py-2 rounded text-center text-2xl tracking-widest"
                placeholder="000000"
                maxLength={6}
              />

              {authError && (
                <p className="text-red-400 text-sm">{authError}</p>
              )}

              <button 
                onClick={handle2FAVerify} 
                disabled={loading || verifyCode.length !== 6}
                className="edit-btn w-full px-4 py-3 rounded font-display flex items-center justify-center gap-2"
              >
                {loading ? "驗證中..." : "驗證登入"}
              </button>
            </div>

            <button onClick={() => { setShow2FAVerify(false); setAuthError(""); setVerifyCode(""); }} className="text-muted mt-4 text-sm hover:text-primary">
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
