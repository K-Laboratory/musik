"use client";

import { useLanguage } from "@/lib/disguise";

export interface AdminLabels {
  navOverview: string;
  navSongs: string;
  navTaxonomy: string;
  navGenerations: string;
  exitAdmin: string;
  adminsOnly: string;
  adminsOnlyHint: string;
  backToApp: string;

  songsTitle: string;
  songCount: string;
  searchPlaceholder: string;
  allGenerations: string;
  filter: string;
  previous: string;
  next: string;
  pageOf: string;
  selectSongs: string;
  selected: string;
  clear: string;
  stop: string;
  stopping: string;
  autoFillSelected: string;
  reclassifySelected: string;
  autoFilling: string;
  reclassifying: string;

  colNumber: string;
  colTitle: string;
  colArtist: string;
  colYear: string;
  colEmotions: string;
  colVA: string;
  colYouTube: string;
  colLyrics: string;
  colAnalyzed: string;
  colEdit: string;
  selectAll: string;
  selectSong: string;

  notAnalyzed: string;
  review: string;
  watch: string;
  search: string;
  openYouTube: string;
  searchYouTube: string;
  editSong: string;
  hoverPreview: string;
  loading: string;
  notFound: string;
  unavailable: string;
  fullLyrics: string;
  saved: string;
  noSongs: string;
  lowConfidence: string;
  loadPreview: string;
  lyricsLookupFailed: string;
  editYoutubeLyrics: string;

  autoFilledSummary: string;
  reclassifiedSummary: string;
  stoppedSummary: string;
  autoFillFailed: string;
  reclassifyFailed: string;
  noResultReturned: string;
  youtubeAlreadySet: string;
  lyricsAlreadySet: string;

  editCatalogSong: string;
  youtubeUrl: string;
  findBestMatch: string;
  matched: string;
  lyrics: string;
  findLyrics: string;
  noSavedLyrics: string;
  characters: string;
  source: string;
  lyricsSourceUrl: string;
  cancel: string;
  saveChanges: string;
  saving: string;
  loadingDetails: string;
  closeEditor: string;
  noNewData: string;
  autoLookupFailed: string;
  couldNotLoad: string;
  couldNotSave: string;
  nothingToUpdate: string;

  overviewTitle: string;
  overviewSubtitle: string;
  catalogSongs: string;
  emotionCategories: string;
  generations: string;
  analyzed: string;
  pipelineStatus: string;
  everyAnalyzed: string;
  songsNotAnalyzed: string;
  classifyHeading: string;
  classifyHelp: string;
  classifyButton: string;
  classifying: string;

  taxonomyTitle: string;
  taxonomyDescription: string;
  bottomLeft: string;
  topRight: string;
  id: string;
  name: string;
  soundsLike: string;
  quadrant: string;
  noEmotions: string;

  generationsTitle: string;
  generationsDescription: string;
  songsCount: string;
  born: string;
  birthOverlap: string;
  noGenerations: string;
}

const EN: AdminLabels = {
  navOverview: "Overview",
  navSongs: "Songs",
  navTaxonomy: "Taxonomy",
  navGenerations: "Generations",
  exitAdmin: "Exit admin",
  adminsOnly: "Admins only",
  adminsOnlyHint:
    "Your account is not on the admin allowlist. Add your email to the admin_emails table to get access.",
  backToApp: "Back to the app",

  songsTitle: "Songs",
  songCount: "{count} songs in the catalog",
  searchPlaceholder: "Search title or artist...",
  allGenerations: "All generations",
  filter: "Filter",
  previous: "Previous",
  next: "Next",
  pageOf: "Page {page} of {pages}",
  selectSongs: "Select songs to edit or auto-fill.",
  selected: "{count} selected.",
  clear: "Clear",
  stop: "Stop",
  stopping: "Stopping...",
  autoFillSelected: "Auto-fill selected",
  reclassifySelected: "Re-classify selected",
  autoFilling: "Auto-filling {done}/{total}",
  reclassifying: "Re-classifying {done}/{total}",

  colNumber: "#",
  colTitle: "Title",
  colArtist: "Artist",
  colYear: "Year",
  colEmotions: "Emotions",
  colVA: "V / A",
  colYouTube: "YouTube",
  colLyrics: "Lyrics",
  colAnalyzed: "Analyzed",
  colEdit: "Edit",
  selectAll: "Select all songs on this page",
  selectSong: "Select {title} by {artist}",

  notAnalyzed: "Not analyzed",
  review: "Review",
  watch: "Watch",
  search: "Search",
  openYouTube: "Open YouTube video",
  searchYouTube: "Search YouTube for this song",
  editSong: "Edit {title}",
  hoverPreview: "Hover preview",
  loading: "Loading",
  notFound: "Not found",
  unavailable: "Unavailable",
  fullLyrics: "Full lyrics",
  saved: "Saved",
  noSongs: "No songs match. Run the seed migration to load the catalog.",
  lowConfidence: "Low confidence",
  loadPreview: "Load a short lyrics preview",
  lyricsLookupFailed: "Lyrics lookup failed",
  editYoutubeLyrics: "Edit YouTube URL and lyrics",

  autoFilledSummary:
    "Auto-filled {updated} songs. {partial} partially updated. {skipped} already complete. {failed} need attention.",
  reclassifiedSummary: "Re-classified {count} songs. {failed} failed.",
  stoppedSummary: "Stopped after {done} of {total} songs.",
  autoFillFailed: "Auto-fill failed.",
  reclassifyFailed: "Re-classification failed.",
  noResultReturned: "No result returned.",
  youtubeAlreadySet: "YouTube already set",
  lyricsAlreadySet: "Lyrics already set",

  editCatalogSong: "Edit catalog song",
  youtubeUrl: "YouTube URL",
  findBestMatch: "Find best match",
  matched: "Matched",
  lyrics: "Lyrics",
  findLyrics: "Find lyrics",
  noSavedLyrics: "No saved lyrics yet.",
  characters: "{count} characters",
  source: "Source",
  lyricsSourceUrl: "Lyrics source URL (optional)",
  cancel: "Cancel",
  saveChanges: "Save changes",
  saving: "Saving...",
  loadingDetails: "Loading details...",
  closeEditor: "Close editor",
  noNewData: "No new data found.",
  autoLookupFailed: "Automatic lookup failed.",
  couldNotLoad: "Could not load this song.",
  couldNotSave: "Could not save.",
  nothingToUpdate: "Nothing to update.",

  overviewTitle: "Overview",
  overviewSubtitle: "Emotion classification database.",
  catalogSongs: "Catalog songs",
  emotionCategories: "Emotion categories",
  generations: "Generations",
  analyzed: "Analyzed",
  pipelineStatus: "Pipeline status",
  everyAnalyzed: "Every catalog song has an analysis.",
  songsNotAnalyzed: "{pending} of {total} songs are not analyzed yet.",
  classifyHeading: "Classification pipeline",
  classifyHelp: "{analyzed} / {total} analyzed · {pending} pending",
  classifyButton: "Classify pending songs",
  classifying: "Classifying...",

  taxonomyTitle: "Emotion taxonomy",
  taxonomyDescription:
    "{count} categories on the valence-arousal plane. Every song is tagged with one or more of these, plus V-A coordinates.",
  bottomLeft: "Bottom-left = sad and calm",
  topRight: "Top-right = happy and energetic",
  id: "ID",
  name: "Name",
  soundsLike: "Sounds like",
  quadrant: "Quadrant",
  noEmotions:
    "No emotions loaded. Run the schema migration to seed the taxonomy.",

  generationsTitle: "Generations",
  generationsDescription:
    "Vietnamese generational cohorts. Song counts show how many catalog songs are seeded per generation.",
  songsCount: "{count} songs",
  born: "Born {start}-{end}",
  birthOverlap: "Birth years overlap other cohorts",
  noGenerations:
    "No generations loaded. Run the schema migration to seed them.",
};

const VI: AdminLabels = {
  navOverview: "Tổng quan",
  navSongs: "Bài hát",
  navTaxonomy: "Phân loại",
  navGenerations: "Thế hệ",
  exitAdmin: "Thoát quản trị",
  adminsOnly: "Chỉ quản trị viên",
  adminsOnlyHint:
    "Tài khoản của bạn chưa có trong danh sách quản trị. Thêm email vào bảng admin_emails để được truy cập.",
  backToApp: "Về trang chính",

  songsTitle: "Bài hát",
  songCount: "{count} bài hát trong danh mục",
  searchPlaceholder: "Tìm tên bài hát hoặc ca sĩ...",
  allGenerations: "Tất cả thế hệ",
  filter: "Lọc",
  previous: "Trước",
  next: "Tiếp",
  pageOf: "Trang {page} / {pages}",
  selectSongs: "Chọn bài hát để sửa hoặc tự động điền.",
  selected: "Đã chọn {count}.",
  clear: "Bỏ chọn",
  stop: "Dừng",
  stopping: "Đang dừng...",
  autoFillSelected: "Tự động điền mục đã chọn",
  reclassifySelected: "Phân loại lại mục đã chọn",
  autoFilling: "Đang tự động điền {done}/{total}",
  reclassifying: "Đang phân loại lại {done}/{total}",

  colNumber: "#",
  colTitle: "Tên bài hát",
  colArtist: "Ca sĩ",
  colYear: "Năm",
  colEmotions: "Cảm xúc",
  colVA: "V / A",
  colYouTube: "YouTube",
  colLyrics: "Lời bài hát",
  colAnalyzed: "Đã phân tích",
  colEdit: "Sửa",
  selectAll: "Chọn tất cả bài trên trang này",
  selectSong: "Chọn {title} của {artist}",

  notAnalyzed: "Chưa phân tích",
  review: "Cần xem lại",
  watch: "Xem",
  search: "Tìm",
  openYouTube: "Mở video YouTube",
  searchYouTube: "Tìm bài hát này trên YouTube",
  editSong: "Sửa {title}",
  hoverPreview: "Xem trước",
  loading: "Đang tải",
  notFound: "Không tìm thấy",
  unavailable: "Không khả dụng",
  fullLyrics: "Toàn bộ lời",
  saved: "Đã lưu",
  noSongs: "Không có bài hát phù hợp. Hãy chạy migration seed.",
  lowConfidence: "Độ tin cậy thấp",
  loadPreview: "Tải bản xem trước lời bài hát",
  lyricsLookupFailed: "Tìm lời bài hát thất bại",
  editYoutubeLyrics: "Sửa đường dẫn YouTube và lời bài hát",

  autoFilledSummary:
    "Đã tự động điền {updated} bài. {partial} bài điền một phần. {skipped} bài đã đủ. {failed} bài cần chú ý.",
  reclassifiedSummary: "Đã phân loại lại {count} bài. {failed} bài lỗi.",
  stoppedSummary: "Đã dừng sau {done}/{total} bài.",
  autoFillFailed: "Tự động điền thất bại.",
  reclassifyFailed: "Phân loại lại thất bại.",
  noResultReturned: "Không có kết quả trả về.",
  youtubeAlreadySet: "YouTube đã được đặt",
  lyricsAlreadySet: "Lời bài hát đã được đặt",

  editCatalogSong: "Sửa bài hát trong danh mục",
  youtubeUrl: "Đường dẫn YouTube",
  findBestMatch: "Tìm kết quả phù hợp",
  matched: "Đã khớp",
  lyrics: "Lời bài hát",
  findLyrics: "Tìm lời bài hát",
  noSavedLyrics: "Chưa có lời bài hát được lưu.",
  characters: "{count} ký tự",
  source: "Nguồn",
  lyricsSourceUrl: "Đường dẫn nguồn lời (không bắt buộc)",
  cancel: "Hủy",
  saveChanges: "Lưu thay đổi",
  saving: "Đang lưu...",
  loadingDetails: "Đang tải thông tin...",
  closeEditor: "Đóng trình sửa",
  noNewData: "Không tìm thấy dữ liệu mới.",
  autoLookupFailed: "Tự động tìm kiếm thất bại.",
  couldNotLoad: "Không thể tải bài hát này.",
  couldNotSave: "Không thể lưu.",
  nothingToUpdate: "Không có gì để cập nhật.",

  overviewTitle: "Tổng quan",
  overviewSubtitle: "Cơ sở dữ liệu phân loại cảm xúc.",
  catalogSongs: "Bài hát trong danh mục",
  emotionCategories: "Nhóm cảm xúc",
  generations: "Thế hệ",
  analyzed: "Đã phân tích",
  pipelineStatus: "Trạng thái pipeline",
  everyAnalyzed: "Mọi bài hát trong danh mục đã được phân tích.",
  songsNotAnalyzed: "{pending}/{total} bài chưa được phân tích.",
  classifyHeading: "Pipeline phân loại",
  classifyHelp: "Đã phân tích {analyzed}/{total} · còn {pending}",
  classifyButton: "Phân loại các bài còn lại",
  classifying: "Đang phân loại...",

  taxonomyTitle: "Phân loại cảm xúc",
  taxonomyDescription:
    "{count} nhóm cảm xúc trên mặt phẳng valence-arousal. Mỗi bài hát được gắn một hoặc nhiều nhãn, kèm tọa độ V-A.",
  bottomLeft: "Góc dưới trái = buồn và tĩnh",
  topRight: "Góc trên phải = vui và sôi động",
  id: "ID",
  name: "Tên",
  soundsLike: "Nghe giống",
  quadrant: "Góc phần tư",
  noEmotions: "Chưa có cảm xúc. Hãy chạy migration để seed taxonomy.",

  generationsTitle: "Thế hệ",
  generationsDescription:
    "Các thế hệ người Việt. Số bài hát cho biết mỗi thế hệ có bao nhiêu bài trong danh mục.",
  songsCount: "{count} bài hát",
  born: "Sinh {start}-{end}",
  birthOverlap: "Năm sinh chồng lấn với thế hệ khác",
  noGenerations: "Chưa có thế hệ. Hãy chạy migration để seed dữ liệu.",
};

export function useAdminLabels(): AdminLabels {
  const { language } = useLanguage();
  return language === "vi" ? VI : EN;
}

function interpolate(
  template: string,
  values?: Record<string, string | number>,
): string {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    String(values[key] ?? `{${key}}`),
  );
}

export function AdminText({
  k,
  values,
}: {
  k: keyof AdminLabels;
  values?: Record<string, string | number>;
}) {
  const labels = useAdminLabels();
  return <>{interpolate(labels[k], values)}</>;
}
