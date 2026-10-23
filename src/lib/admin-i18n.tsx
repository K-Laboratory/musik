"use client";

import { useLanguage } from "@/lib/disguise";

export interface AdminLabels {
  navOverview: string;
  navSongs: string;
  navTaxonomy: string;
  navGenerations: string;
  navSeasons: string;
  navBehavior: string;
  exitAdmin: string;
  adminsOnly: string;
  adminsOnlyHint: string;
  backToApp: string;

  songsTitle: string;
  songCount: string;
  songMatchCount: string;
  searchPlaceholder: string;
  filterSearch: string;
  clearSearch: string;
  allGenerations: string;
  filterGeneration: string;
  filterEmotion: string;
  allEmotions: string;
  sortBy: string;
  filterContent: string;
  filterClassification: string;
  filterYearFrom: string;
  filterYearTo: string;
  perPage: string;
  clearFilters: string;
  goToPage: string;
  go: string;
  songsLoadFailed: string;
  anyContent: string;
  youtubeMissing: string;
  youtubePresent: string;
  lyricsMissing: string;
  lyricsPresent: string;
  bothPresent: string;
  anyClassification: string;
  classified: string;
  needsReviewOnly: string;
  notClassifiedOnly: string;
  sortYearAsc: string;
  sortYearDesc: string;
  sortTitleAsc: string;
  sortTitleDesc: string;
  sortArtistAsc: string;
  sortPopularityDesc: string;
  sortPopularityAsc: string;
  sortRecentlyAnalyzed: string;
  sortRecentlyAdded: string;
  sortLyricsUpdated: string;
  filter: string;
  previous: string;
  next: string;
  pageOf: string;
  selectSongs: string;
  selected: string;
  clear: string;
  stop: string;
  stopping: string;
  autoFillYouTube: string;
  autoFillLyrics: string;
  reclassifySelected: string;
  autoFillingYouTube: string;
  autoFillingLyrics: string;
  reclassifying: string;

  colNumber: string;
  colTitle: string;
  colArtist: string;
  colYear: string;
  colEmotions: string;
  colVA: string;
  colPopularity: string;
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
  lyricsHoverHint: string;
  saved: string;
  noSongs: string;
  lowConfidence: string;
  loadPreview: string;
  lyricsLookupFailed: string;
  editYoutubeLyrics: string;
  popularity: string;
  popularityScore: string;
  popularityViews: string;
  popularityLikes: string;
  popularityComments: string;
  popularitySubscribers: string;
  popularityViewsPerDay: string;
  popularityEngagement: string;
  popularityPublished: string;
  noPopularity: string;
  tierViral: string;
  tierPopular: string;
  tierEstablished: string;
  tierNiche: string;
  tierDeepCut: string;

  autoFilledSummary: string;
  autoFilledKindSummary: string;
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
  lyricsPlaceholder: string;
  noSavedLyrics: string;
  characters: string;
  source: string;
  lyricsSourceUrl: string;
  classification: string;
  valence: string;
  arousal: string;
  needsReview: string;
  primaryTag: string;
  confidence: string;
  classificationRequired: string;
  maxTags: string;
  invalidClassification: string;
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
  definition: string;
  soundsLike: string;
  quadrant: string;
  noEmotions: string;

  generationsTitle: string;
  generationsDescription: string;
  generationAssignmentSummary: string;
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
  navSeasons: "Seasons",
  navBehavior: "Behavior insights",
  exitAdmin: "Exit admin",
  adminsOnly: "Admins only",
  adminsOnlyHint:
    "Your account is not on the admin allowlist. Add your email to the admin_emails table to get access.",
  backToApp: "Back to the app",

  songsTitle: "Songs",
  songCount: "{count} songs in the catalog",
  songMatchCount: "{count} songs match the current filters",
  searchPlaceholder: "Search title or artist...",
  filterSearch: "Search",
  clearSearch: "Clear search",
  allGenerations: "All generations",
  filterGeneration: "Generation",
  filterEmotion: "Emotion",
  allEmotions: "All emotions",
  sortBy: "Sort by",
  filterContent: "Content",
  filterClassification: "Classification",
  filterYearFrom: "Year from",
  filterYearTo: "Year to",
  perPage: "Rows per page",
  clearFilters: "Clear filters",
  goToPage: "Go to page",
  go: "Go",
  songsLoadFailed: "Could not load songs.",
  anyContent: "Any content",
  youtubeMissing: "Missing YouTube",
  youtubePresent: "Has YouTube",
  lyricsMissing: "Missing lyrics",
  lyricsPresent: "Has lyrics",
  bothPresent: "Has both",
  anyClassification: "Any classification",
  classified: "Classified",
  needsReviewOnly: "Needs review",
  notClassifiedOnly: "Not classified",
  sortYearAsc: "Year, oldest first",
  sortYearDesc: "Year, newest first",
  sortTitleAsc: "Title A-Z",
  sortTitleDesc: "Title Z-A",
  sortArtistAsc: "Artist A-Z",
  sortPopularityDesc: "Most popular",
  sortPopularityAsc: "Least popular",
  sortRecentlyAnalyzed: "Recently classified",
  sortRecentlyAdded: "Recently added",
  sortLyricsUpdated: "Lyrics updated recently",
  filter: "Filter",
  previous: "Previous",
  next: "Next",
  pageOf: "Page {page} of {pages}",
  selectSongs:
    "Select songs for batch actions, or click a song title to edit.",
  selected: "{count} selected.",
  clear: "Clear",
  stop: "Stop",
  stopping: "Stopping...",
  autoFillYouTube: "Auto-fill YouTube",
  autoFillLyrics: "Auto-fill lyrics",
  reclassifySelected: "Re-classify selected",
  autoFillingYouTube: "YouTube {done}/{total}",
  autoFillingLyrics: "Lyrics {done}/{total}",
  reclassifying: "Re-classifying {done}/{total}",

  colNumber: "#",
  colTitle: "Title",
  colArtist: "Artist",
  colYear: "Year",
  colEmotions: "Emotions",
  colVA: "V / A",
  colPopularity: "Popularity",
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
  lyricsHoverHint: "Hover for full lyrics",
  saved: "Saved",
  noSongs: "No songs match. Run the seed migration to load the catalog.",
  lowConfidence: "Low confidence",
  loadPreview: "Load a short lyrics preview",
  lyricsLookupFailed: "Lyrics lookup failed",
  editYoutubeLyrics: "Edit YouTube URL, lyrics, and classification",
  popularity: "Popularity",
  popularityScore: "Score",
  popularityViews: "Views",
  popularityLikes: "Likes",
  popularityComments: "Comments",
  popularitySubscribers: "Channel subscribers",
  popularityViewsPerDay: "Views / day",
  popularityEngagement: "Engagement",
  popularityPublished: "Published",
  noPopularity: "No popularity data",
  tierViral: "Viral",
  tierPopular: "Popular",
  tierEstablished: "Established",
  tierNiche: "Niche",
  tierDeepCut: "Deep cut",

  autoFilledSummary:
    "Auto-filled {updated} songs. {partial} partially updated. {skipped} already complete. {failed} need attention.",
  autoFilledKindSummary:
    "Updated {updated} songs. {skipped} already complete. {failed} need attention.",
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
  lyricsPlaceholder: "Paste or edit the lyrics here.",
  noSavedLyrics: "No saved lyrics yet.",
  characters: "{count} characters",
  source: "Source",
  lyricsSourceUrl: "Lyrics source URL (optional)",
  classification: "Classification",
  valence: "Valence (-2 to 2)",
  arousal: "Arousal (-2 to 2)",
  needsReview: "Needs review",
  primaryTag: "Primary",
  confidence: "Confidence",
  classificationRequired: "Choose at least one emotion tag.",
  maxTags: "Choose no more than 3 emotion tags.",
  invalidClassification: "Valence and arousal must be between -2 and 2.",
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
  definition: "Definition",
  soundsLike: "Sounds like",
  quadrant: "Quadrant",
  noEmotions:
    "No emotions loaded. Run the schema migration to seed the taxonomy.",

  generationsTitle: "Generations",
  generationsDescription:
    "Vietnamese generational cohorts. Counts use exact database totals across the full catalog.",
  generationAssignmentSummary:
    "{assigned} of {total} songs assigned · {unassigned} unassigned",
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
  navSeasons: "Mùa lễ hội",
  navBehavior: "Phân tích hành vi",
  exitAdmin: "Thoát quản trị",
  adminsOnly: "Chỉ quản trị viên",
  adminsOnlyHint:
    "Tài khoản của bạn chưa có trong danh sách quản trị. Thêm email vào bảng admin_emails để được truy cập.",
  backToApp: "Về trang chính",

  songsTitle: "Bài hát",
  songCount: "{count} bài hát trong danh mục",
  songMatchCount: "{count} bài hát phù hợp với bộ lọc",
  searchPlaceholder: "Tìm tên bài hát hoặc ca sĩ...",
  filterSearch: "Tìm kiếm",
  clearSearch: "Xóa tìm kiếm",
  allGenerations: "Tất cả thế hệ",
  filterGeneration: "Thế hệ",
  filterEmotion: "Cảm xúc",
  allEmotions: "Tất cả cảm xúc",
  sortBy: "Sắp xếp",
  filterContent: "Nội dung",
  filterClassification: "Phân loại",
  filterYearFrom: "Từ năm",
  filterYearTo: "Đến năm",
  perPage: "Số dòng mỗi trang",
  clearFilters: "Xóa bộ lọc",
  goToPage: "Đi tới trang",
  go: "Đi",
  songsLoadFailed: "Không tải được danh sách bài hát.",
  anyContent: "Mọi nội dung",
  youtubeMissing: "Thiếu YouTube",
  youtubePresent: "Có YouTube",
  lyricsMissing: "Thiếu lời bài hát",
  lyricsPresent: "Có lời bài hát",
  bothPresent: "Có cả hai",
  anyClassification: "Mọi phân loại",
  classified: "Đã phân loại",
  needsReviewOnly: "Cần xem lại",
  notClassifiedOnly: "Chưa phân loại",
  sortYearAsc: "Năm, cũ nhất trước",
  sortYearDesc: "Năm, mới nhất trước",
  sortTitleAsc: "Tên A-Z",
  sortTitleDesc: "Tên Z-A",
  sortArtistAsc: "Ca sĩ A-Z",
  sortPopularityDesc: "Phổ biến nhất",
  sortPopularityAsc: "Ít phổ biến nhất",
  sortRecentlyAnalyzed: "Phân loại gần đây",
  sortRecentlyAdded: "Mới thêm gần đây",
  sortLyricsUpdated: "Lời mới cập nhật",
  filter: "Lọc",
  previous: "Trước",
  next: "Tiếp",
  pageOf: "Trang {page} / {pages}",
  selectSongs:
    "Chọn bài hát để thao tác hàng loạt, hoặc bấm tên bài hát để sửa.",
  selected: "Đã chọn {count}.",
  clear: "Bỏ chọn",
  stop: "Dừng",
  stopping: "Đang dừng...",
  autoFillYouTube: "Tự động điền YouTube",
  autoFillLyrics: "Tự động điền lời",
  reclassifySelected: "Phân loại lại mục đã chọn",
  autoFillingYouTube: "YouTube {done}/{total}",
  autoFillingLyrics: "Lời {done}/{total}",
  reclassifying: "Đang phân loại lại {done}/{total}",

  colNumber: "#",
  colTitle: "Tên bài hát",
  colArtist: "Ca sĩ",
  colYear: "Năm",
  colEmotions: "Cảm xúc",
  colVA: "V / A",
  colPopularity: "Độ phổ biến",
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
  lyricsHoverHint: "Rê chuột để xem đầy đủ",
  saved: "Đã lưu",
  noSongs: "Không có bài hát phù hợp. Hãy chạy migration seed.",
  lowConfidence: "Độ tin cậy thấp",
  loadPreview: "Tải bản xem trước lời bài hát",
  lyricsLookupFailed: "Tìm lời bài hát thất bại",
  editYoutubeLyrics: "Sửa đường dẫn YouTube, lời bài hát và phân loại",
  popularity: "Độ phổ biến",
  popularityScore: "Điểm",
  popularityViews: "Lượt xem",
  popularityLikes: "Lượt thích",
  popularityComments: "Bình luận",
  popularitySubscribers: "Người đăng ký kênh",
  popularityViewsPerDay: "Lượt xem / ngày",
  popularityEngagement: "Tương tác",
  popularityPublished: "Ngày đăng",
  noPopularity: "Chưa có dữ liệu phổ biến",
  tierViral: "Bùng nổ",
  tierPopular: "Phổ biến",
  tierEstablished: "Ổn định",
  tierNiche: "Ngách",
  tierDeepCut: "Ít người biết",

  autoFilledSummary:
    "Đã tự động điền {updated} bài. {partial} bài điền một phần. {skipped} bài đã đủ. {failed} bài cần chú ý.",
  autoFilledKindSummary:
    "Đã cập nhật {updated} bài. {skipped} bài đã đủ. {failed} bài cần chú ý.",
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
  lyricsPlaceholder: "Dán hoặc sửa lời bài hát ở đây.",
  noSavedLyrics: "Chưa có lời bài hát được lưu.",
  characters: "{count} ký tự",
  source: "Nguồn",
  lyricsSourceUrl: "Đường dẫn nguồn lời (không bắt buộc)",
  classification: "Phân loại",
  valence: "Sắc thái (-2 đến 2)",
  arousal: "Năng lượng (-2 đến 2)",
  needsReview: "Cần xem lại",
  primaryTag: "Chính",
  confidence: "Độ tin cậy",
  classificationRequired: "Chọn ít nhất một nhãn cảm xúc.",
  maxTags: "Chỉ chọn tối đa 3 nhãn cảm xúc.",
  invalidClassification: "Sắc thái và năng lượng phải nằm trong khoảng -2 đến 2.",
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
    "{count} nhóm cảm xúc trên mặt phẳng sắc thái - năng lượng. Mỗi bài hát được gắn một hoặc nhiều nhãn, kèm tọa độ V-A.",
  bottomLeft: "Góc dưới trái = buồn và tĩnh",
  topRight: "Góc trên phải = vui và sôi động",
  id: "ID",
  name: "Tên",
  definition: "Định nghĩa",
  soundsLike: "Nghe giống",
  quadrant: "Góc phần tư",
  noEmotions: "Chưa có cảm xúc. Hãy chạy migration để seed taxonomy.",

  generationsTitle: "Thế hệ",
  generationsDescription:
    "Các thế hệ người Việt. Số liệu được đếm chính xác trên toàn bộ danh mục.",
  generationAssignmentSummary:
    "Đã gán {assigned}/{total} bài hát · Chưa gán {unassigned}",
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
