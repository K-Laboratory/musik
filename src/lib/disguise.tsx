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

const STORAGE_KEY = "favorite-songs:ui-mode";

interface DisguiseContextValue {
  mode: UiMode;
  isWork: boolean;
  setMode: (mode: UiMode) => void;
  toggle: () => void;
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

/** Human-facing copy that changes with the disguise. */
export interface AppLabels {
  brand: string;
  navDashboard: string;
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
}

const MUSIC_LABELS: AppLabels = {
  brand: "Favorite Songs",
  navDashboard: "Dashboard",
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
};

const WORK_LABELS: AppLabels = {
  brand: "Workspace",
  navDashboard: "Files",
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
}: {
  children: React.ReactNode;
}) {
  // Start in music mode so the first client render matches the server render,
  // then adopt the saved choice once mounted.
  const [mode, setModeState] = useState<UiMode>("music");
  const pathname = usePathname();

  useEffect(() => {
    setModeState(readStoredMode());
  }, []);

  // Reflect the mode on <html> so the theme CSS applies everywhere.
  useEffect(() => {
    const root = document.documentElement;
    if (mode === "work") root.dataset.ui = "work";
    else delete root.dataset.ui;
  }, [mode]);

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
    () => ({ mode, isWork: mode === "work", setMode, toggle }),
    [mode, setMode, toggle],
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
  const { isWork } = useDisguise();
  return isWork ? WORK_LABELS : MUSIC_LABELS;
}
