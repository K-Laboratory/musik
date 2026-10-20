"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

/**
 * UI disguise ("work mode").
 *
 * Music mode is the normal violet music app. Work mode reskins the whole app
 * as an innocuous, classic-Windows-looking desktop tool: grey chiselled
 * controls, square corners, a minimal player, and renamed labels.
 *
 * The choice is remembered in localStorage. A blocking inline script in the
 * root layout applies the `data-ui="work"` attribute before first paint so the
 * page never flashes the music theme on a reload.
 */

export type UiMode = "music" | "work";
export type Language = "en" | "vi";

const STORAGE_KEY = "favorite-songs:ui-mode";
const LANGUAGE_KEY = "favorite-songs:language";
const LANGUAGE_COOKIE = "musik_lang";
const MUSIC_ICON = "/music-icon.svg?theme=music";
const WORK_ICON = "/workspace-icon.svg?theme=work";

interface DisguiseContextValue {
  mode: UiMode;
  isWork: boolean;
  setMode: (mode: UiMode) => void;
  toggle: () => void;
  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
}

const DisguiseContext = createContext<DisguiseContextValue | null>(null);

function readStoredMode(): UiMode {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "work" || stored === "music") return stored;
  } catch {
    // localStorage can be unavailable (private mode); fall back to music.
  }
  return "music";
}

function writeLanguageCookie(language: Language) {
  try {
    document.cookie = `${LANGUAGE_COOKIE}=${language}; path=/; max-age=31536000; samesite=lax`;
  } catch {
    // Ignore cookie failures.
  }
}

function applyFavicon(mode: UiMode) {
  if (typeof document === "undefined") return;
  const href = mode === "work" ? WORK_ICON : MUSIC_ICON;
  const links = document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]');
  if (
    links.length === 1 &&
    links[0]?.getAttribute("href") === href &&
    links[0]?.dataset.musikFavicon === "true"
  ) {
    return;
  }

  links.forEach((link) => {
    link.remove();
  });

  const link = document.createElement("link");
  link.rel = "icon";
  link.type = "image/svg+xml";
  link.href = href;
  link.dataset.musikFavicon = "true";
  document.head.appendChild(link);
}

/** Human-facing copy that changes with the disguise. */
export interface AppLabels {
  brand: string;
  navDashboard: string;
  navAlbumDesign: string;
  albumCreationTitle: string;
  albumCreationHint: string;
  albumCreationAction: string;
  defaultUser: string;
  findHeading: string;
  findSubtitle: string;
  documentsHeading: string;
  emptyLibraryTitle: string;
  emptyLibraryHint: string;
  removeConfirm: (title: string) => string;
  removedFromLibrary: string;
  removeError: string;
  searchAria: string;
  searchPlaceholder: string;
  noResults: string;
  savedBadge: string;
  alreadyInLibrary: (title: string) => string;
  addedToLibrary: (title: string) => string;
  saveError: string;
  projectsHeading: string;
  newProjectPlaceholder: string;
  dragTip: string;
  noProjects: string;
  itemCount: (count: number) => string;
  createError: string;
  createToast: string;
  renamedToast: string;
  renameError: string;
  deleteConfirm: (name: string) => string;
  deletedToast: string;
  deleteError: string;
  backToWorkspace: string;
  playAll: string;
  emptyProjectTitle: string;
  emptyProjectHint: string;
  addFromWorkspace: string;
  allInProject: string;
  notFoundTitle: string;
  notFoundHint: string;
  addedToProject: string;
  alreadyInProject: string;
  addToProjectError: string;
  loadError: string;
  loginTagline: string;
  loginFooter: string;
  navAdmin: string;
  signOut: string;
  viewMode: string;
  appearance: string;
  language: string;
  signInWith: (provider: string) => string;
  connectingTo: (provider: string) => string;
  emailPasswordHeading: string;
  emailLabel: string;
  passwordLabel: string;
  signInAction: string;
  signingInAction: string;
  normalView: string;
  compactView: string;
  workMode: string;
  breakMode: string;
  addAction: string;
  unknownChannel: string;
}

const MUSIC_LABELS: AppLabels = {
  brand: "Favorite Songs",
  navDashboard: "Dashboard",
  navAlbumDesign: "Album creation",
  albumCreationTitle: "Create an album from the full catalog",
  albumCreationHint:
    "Choose generations, emotions, era, energy, and the hit-to-discovery balance. Every album is filled and sequenced for you.",
  albumCreationAction: "Open album creation",
  defaultUser: "Music lover",
  findHeading: "Find a song",
  findSubtitle: "Search YouTube and save songs to your library.",
  documentsHeading: "My Songs",
  emptyLibraryTitle: "Your library is empty.",
  emptyLibraryHint: "Use the search box above to add your first song.",
  removeConfirm: (title) => `Remove "${title}" from your library?`,
  removedFromLibrary: "Removed from your library.",
  removeError: "Could not remove the song.",
  searchAria: "Search for a song",
  searchPlaceholder: "Search YouTube for a song...",
  noResults: "No songs found. Try a different search.",
  savedBadge: "Saved",
  alreadyInLibrary: (title) => `"${title}" is already in your library.`,
  addedToLibrary: (title) => `Added "${title}" to your library.`,
  saveError: "Could not save that song.",
  projectsHeading: "Playlists",
  newProjectPlaceholder: "New playlist name",
  dragTip: "Tip: drag a song card onto a playlist to add it.",
  noProjects: "No playlists yet. Create one above.",
  itemCount: (count) => `${count} ${count === 1 ? "song" : "songs"}`,
  createError: "Could not create the playlist.",
  createToast: "Playlist created.",
  renamedToast: "Playlist renamed.",
  renameError: "Could not rename the playlist.",
  deleteConfirm: (name) => `Delete the playlist "${name}"?`,
  deletedToast: "Playlist deleted.",
  deleteError: "Could not delete the playlist.",
  backToWorkspace: "Back to dashboard",
  playAll: "Play all",
  emptyProjectTitle: "This playlist is empty.",
  emptyProjectHint: "Drag songs onto it from the dashboard, or add them below.",
  addFromWorkspace: "Add from your library",
  allInProject: "Every song in your library is already in this playlist.",
  notFoundTitle: "Playlist not found",
  notFoundHint: "It may have been deleted, or the link is incorrect.",
  addedToProject: "Added to playlist.",
  alreadyInProject: "That song is already in this playlist.",
  addToProjectError: "Could not add the song.",
  loadError: "Could not load your library.",
  loginTagline: "Save the music you love, build playlists, and listen anytime.",
  loginFooter:
    "By signing in you agree to let us store your saved songs and playlists. We never post anything on your behalf.",
  navAdmin: "Admin",
  signOut: "Sign out",
  viewMode: "View mode",
  appearance: "Appearance",
  language: "Language",
  signInWith: (provider) => `Sign in with ${provider}`,
  connectingTo: (provider) => `Connecting to ${provider}...`,
  emailPasswordHeading: "Email and password",
  emailLabel: "Email",
  passwordLabel: "Password",
  signInAction: "Sign in",
  signingInAction: "Signing in...",
  normalView: "Normal",
  compactView: "Compact",
  workMode: "Work",
  breakMode: "Break",
  addAction: "Add",
  unknownChannel: "Unknown channel",
};

const WORK_LABELS: AppLabels = {
  brand: "Workspace",
  navDashboard: "Files",
  navAlbumDesign: "Collection builder",
  albumCreationTitle: "Build a curated collection from the catalog",
  albumCreationHint:
    "Choose the cohorts, tone, period, intensity, and balance between familiar and lesser-known items. Every collection is filled and ordered for you.",
  albumCreationAction: "Open collection builder",
  defaultUser: "User",
  findHeading: "Search files",
  findSubtitle: "Search the document index and add files to your workspace.",
  documentsHeading: "Documents",
  emptyLibraryTitle: "No documents yet.",
  emptyLibraryHint: "Use the search box above to add your first file.",
  removeConfirm: (title) => `Remove "${title}" from your files?`,
  removedFromLibrary: "Removed from your workspace.",
  removeError: "Could not remove the file.",
  searchAria: "Search for a file",
  searchPlaceholder: "Search documents...",
  noResults: "No results found. Try a different search.",
  savedBadge: "Indexed",
  alreadyInLibrary: (title) => `"${title}" is already in your workspace.`,
  addedToLibrary: (title) => `Added "${title}" to your workspace.`,
  saveError: "Could not save that file.",
  projectsHeading: "Projects",
  newProjectPlaceholder: "New project name",
  dragTip: "Tip: drag a file onto a project to add it.",
  noProjects: "No projects yet. Create one above.",
  itemCount: (count) => `${count} ${count === 1 ? "item" : "items"}`,
  createError: "Could not create the project.",
  createToast: "Project created.",
  renamedToast: "Project renamed.",
  renameError: "Could not rename the project.",
  deleteConfirm: (name) => `Delete the project "${name}"?`,
  deletedToast: "Project deleted.",
  deleteError: "Could not delete the project.",
  backToWorkspace: "Back to workspace",
  playAll: "Open all",
  emptyProjectTitle: "This project is empty.",
  emptyProjectHint:
    "Drag files onto it from the workspace, or add them below.",
  addFromWorkspace: "Add from workspace",
  allInProject: "Every file in your workspace is already in this project.",
  notFoundTitle: "Project not found",
  notFoundHint: "It may have been deleted, or the link is incorrect.",
  addedToProject: "Added to project.",
  alreadyInProject: "That file is already in this project.",
  addToProjectError: "Could not add the file.",
  loadError: "Could not load your workspace.",
  loginTagline: "Sign in to access your workspace and files.",
  loginFooter:
    "By signing in you agree to let us store your files and projects. We never post anything on your behalf.",
  navAdmin: "Admin",
  signOut: "Sign out",
  viewMode: "View mode",
  appearance: "Appearance",
  language: "Language",
  signInWith: (provider) => `Sign in with ${provider}`,
  connectingTo: (provider) => `Connecting to ${provider}...`,
  emailPasswordHeading: "Email and password",
  emailLabel: "Email",
  passwordLabel: "Password",
  signInAction: "Sign in",
  signingInAction: "Signing in...",
  normalView: "Normal",
  compactView: "Compact",
  workMode: "Work",
  breakMode: "Break",
  addAction: "Add",
  unknownChannel: "Unknown channel",
};

const VI_LABELS: AppLabels = {
  brand: "Bài Hát Yêu Thích",
  navDashboard: "Bảng điều khiển",
  navAlbumDesign: "Tạo album",
  albumCreationTitle: "Tạo album từ toàn bộ kho nhạc",
  albumCreationHint:
    "Chọn thế hệ, cảm xúc, giai đoạn, năng lượng và tỷ lệ hit/khám phá. Mọi album đều được tuyển đủ bài và sắp xếp thành trình tự hoàn chỉnh.",
  albumCreationAction: "Mở trang tạo album",
  defaultUser: "Người yêu nhạc",
  findHeading: "Tìm bài hát",
  findSubtitle: "Tìm trên YouTube và lưu bài hát vào thư viện.",
  documentsHeading: "Bài hát của tôi",
  emptyLibraryTitle: "Thư viện của bạn đang trống.",
  emptyLibraryHint: "Dùng ô tìm kiếm phía trên để thêm bài hát đầu tiên.",
  removeConfirm: (title) => `Xóa "${title}" khỏi thư viện?`,
  removedFromLibrary: "Đã xóa khỏi thư viện.",
  removeError: "Không thể xóa bài hát.",
  searchAria: "Tìm bài hát",
  searchPlaceholder: "Tìm bài hát trên YouTube...",
  noResults: "Không tìm thấy bài hát. Hãy thử từ khóa khác.",
  savedBadge: "Đã lưu",
  alreadyInLibrary: (title) => `"${title}" đã có trong thư viện.`,
  addedToLibrary: (title) => `Đã thêm "${title}" vào thư viện.`,
  saveError: "Không thể lưu bài hát.",
  projectsHeading: "Danh sách phát",
  newProjectPlaceholder: "Tên danh sách phát mới",
  dragTip: "Mẹo: kéo bài hát vào danh sách phát để thêm.",
  noProjects: "Chưa có danh sách phát. Tạo một danh sách ở trên.",
  itemCount: (count) => `${count} bài hát`,
  createError: "Không thể tạo danh sách phát.",
  createToast: "Đã tạo danh sách phát.",
  renamedToast: "Đã đổi tên danh sách phát.",
  renameError: "Không thể đổi tên danh sách phát.",
  deleteConfirm: (name) => `Xóa danh sách phát "${name}"?`,
  deletedToast: "Đã xóa danh sách phát.",
  deleteError: "Không thể xóa danh sách phát.",
  backToWorkspace: "Về bảng điều khiển",
  playAll: "Phát tất cả",
  emptyProjectTitle: "Danh sách phát này đang trống.",
  emptyProjectHint:
    "Kéo bài hát vào đây từ bảng điều khiển, hoặc thêm ở bên dưới.",
  addFromWorkspace: "Thêm từ thư viện",
  allInProject: "Mọi bài hát trong thư viện đã có trong danh sách này.",
  notFoundTitle: "Không tìm thấy danh sách phát",
  notFoundHint: "Có thể danh sách đã bị xóa hoặc liên kết không đúng.",
  addedToProject: "Đã thêm vào danh sách phát.",
  alreadyInProject: "Bài hát này đã có trong danh sách phát.",
  addToProjectError: "Không thể thêm bài hát.",
  loadError: "Không thể tải thư viện.",
  loginTagline:
    "Lưu những bài hát bạn yêu thích, tạo danh sách phát và nghe bất cứ lúc nào.",
  loginFooter:
    "Khi đăng nhập, bạn đồng ý để chúng tôi lưu bài hát và danh sách phát. Chúng tôi không đăng gì thay bạn.",
  navAdmin: "Quản trị",
  signOut: "Đăng xuất",
  viewMode: "Chế độ xem",
  appearance: "Giao diện",
  language: "Ngôn ngữ",
  signInWith: (provider) => `Đăng nhập bằng ${provider}`,
  connectingTo: (provider) => `Đang kết nối ${provider}...`,
  emailPasswordHeading: "Email và mật khẩu",
  emailLabel: "Email",
  passwordLabel: "Mật khẩu",
  signInAction: "Đăng nhập",
  signingInAction: "Đang đăng nhập...",
  normalView: "Thường",
  compactView: "Gọn",
  workMode: "Công việc",
  breakMode: "Nghỉ",
  addAction: "Thêm",
  unknownChannel: "Kênh không rõ",
};

function musicTitle(pathname: string): string {
  if (pathname.startsWith("/playlists/")) return "Playlist - Favorite Songs";
  if (pathname.startsWith("/dashboard")) return "Dashboard - Favorite Songs";
  return "Favorite Songs";
}

function workTitle(pathname: string): string {
  if (pathname.startsWith("/playlists/")) return "Project - Workspace";
  if (pathname.startsWith("/dashboard")) return "Files - Workspace";
  return "Workspace";
}

export function DisguiseProvider({
  children,
  initialLanguage = "en",
}: {
  children: React.ReactNode;
  initialLanguage?: Language;
}) {
  // Start in music mode so the first client render matches the server render,
  // then adopt the saved choice once mounted.
  const [mode, setModeState] = useState<UiMode>("music");
  const [language, setLanguageState] = useState<Language>(initialLanguage);
  const pathname = usePathname();

  useEffect(() => {
    setModeState(readStoredMode());
  }, []);

  // Reflect the mode on <html> so the theme CSS applies everywhere.
  useEffect(() => {
    const root = document.documentElement;
    if (mode === "work") root.dataset.ui = "work";
    else delete root.dataset.ui;
    applyFavicon(mode);

    const observer = new MutationObserver(() => applyFavicon(mode));
    observer.observe(document.head, {
      childList: true,
      attributes: true,
      attributeFilter: ["href", "rel"],
    });
    return () => observer.disconnect();
  }, [mode]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setMode = useCallback((next: UiMode) => {
    setModeState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore storage failures.
    }
  }, []);

  const toggle = useCallback(() => {
    setModeState((current) => {
      const next: UiMode = current === "music" ? "work" : "music";
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Ignore storage failures.
      }
      return next;
    });
  }, []);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    writeLanguageCookie(next);
    try {
      window.localStorage.setItem(LANGUAGE_KEY, next);
    } catch {
      // Ignore storage failures.
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState((current) => {
      const next: Language = current === "en" ? "vi" : "en";
      writeLanguageCookie(next);
      try {
        window.localStorage.setItem(LANGUAGE_KEY, next);
      } catch {
        // Ignore storage failures.
      }
      return next;
    });
  }, []);

  // Keyboard shortcut. Ctrl/Cmd+Shift+W is reserved by browsers for closing
  // the window, so we use Ctrl/Cmd+Shift+X instead.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        (event.key === "X" || event.key === "x")
      ) {
        event.preventDefault();
        toggle();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggle]);

  // Keep the browser tab title from giving the game away. Next.js rewrites the
  // <title> on navigation, so watch it while in work mode.
  useEffect(() => {
    if (mode !== "work") {
      document.title = musicTitle(pathname);
      return;
    }

    const desired = workTitle(pathname);
    const apply = () => {
      if (document.title !== desired) document.title = desired;
    };
    apply();

    const titleEl = document.querySelector("title");
    const observers: MutationObserver[] = [];
    if (titleEl) {
      const observer = new MutationObserver(apply);
      observer.observe(titleEl, {
        childList: true,
        characterData: true,
        subtree: true,
      });
      observers.push(observer);
    }
    const headObserver = new MutationObserver(apply);
    headObserver.observe(document.head, { childList: true });
    observers.push(headObserver);

    return () => observers.forEach((observer) => observer.disconnect());
  }, [mode, pathname]);

  const value = useMemo<DisguiseContextValue>(
    () => ({
      mode,
      isWork: mode === "work",
      setMode,
      toggle,
      language,
      setLanguage,
      toggleLanguage,
    }),
    [mode, setMode, toggle, language, setLanguage, toggleLanguage],
  );

  return (
    <DisguiseContext.Provider value={value}>
      {children}
    </DisguiseContext.Provider>
  );
}

export function useDisguise(): DisguiseContextValue {
  const context = useContext(DisguiseContext);
  if (!context) {
    throw new Error("useDisguise must be used inside a <DisguiseProvider>.");
  }
  return context;
}

/** Returns the copy for the active mode. */
export function useLabels(): AppLabels {
  const { isWork, language } = useDisguise();
  if (isWork) return WORK_LABELS;
  return language === "vi" ? VI_LABELS : MUSIC_LABELS;
}

export function useLanguage(): {
  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
} {
  const { language, setLanguage, toggleLanguage } = useDisguise();
  return { language, setLanguage, toggleLanguage };
}
