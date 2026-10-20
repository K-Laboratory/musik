export type AlbumLanguage = "en" | "vi";

export interface AlbumCopy {
  studioEyebrow: string;
  studioTitle: string;
  studioIntro: string;
  guarantee: string;
  presetHeading: string;
  presets: Record<
    "lateNight" | "goldenHour" | "mainCharacter" | "healing",
    { title: string; detail: string }
  >;
  generationHeading: string;
  allGenerations: string;
  emotionHeading: string;
  anyMood: string;
  emotionMapHint: string;
  emotionQuadrants: [string, string, string, string];
  lowEnergy: string;
  highEnergy: string;
  lowValence: string;
  highValence: string;
  emotionStrength: string;
  subtle: string;
  balanced: string;
  strong: string;
  eraHeading: string;
  fromYear: string;
  toYear: string;
  yearAll: string;
  yearRanges: Array<{ label: string; from: number; to: number }>;
  lengthHeading: string;
  tracksUnit: (count: number) => string;
  mixHeading: string;
  hits: string;
  discoveries: string;
  energyHeading: string;
  energy: Record<
    "any" | "gentle" | "uplifting" | "intense" | "melancholic",
    string
  >;
  artistVariety: string;
  artistVarietyHint: string;
  titleLabel: string;
  titlePlaceholder: string;
  clearFilters: string;
  generate: string;
  generating: string;
  shuffle: string;
  save: string;
  saving: string;
  saved: string;
  saveError: string;
  generateError: string;
  emptyResultTitle: string;
  emptyResultHint: string;
  briefHeading: string;
  briefTitle: string;
  briefDetail: string;
  playlistLength: string;
  hitBalance: string;
  discoveryShare: string;
  yearSpan: string;
  averageHeat: string;
  filterWidened: string;
  noFilterWidened: string;
  playAlbum: string;
  pauseAlbum: string;
  playTrack: string;
  pauseTrack: string;
  watch: string;
  trackHeading: string;
  role: Record<
    "opener" | "build" | "ride" | "centerpiece" | "release" | "finale",
    string
  >;
  signal: Record<"anchor" | "discovery" | "emotion" | "era" | "widened", string>;
  myAlbums: string;
  noAlbums: string;
  noAlbumsHint: string;
  savedOn: (date: string) => string;
  backToStudio: string;
  albumNotFound: string;
  albumNotFoundHint: string;
  liveMix: string;
  designAnother: string;
  openSaved: string;
  saveSuccess: string;
  requestPrefix: string;
  resultsReady: (count: number) => string;
  presetApplied: string;
  generationalMix: (count: number) => string;
  artists: (count: number) => string;
}

export const ALBUM_COPY: Record<AlbumLanguage, AlbumCopy> = {
  en: {
    studioEyebrow: "Album design",
    studioTitle: "Build a record, not a playlist",
    studioIntro:
      "Choose the world this album comes from. The curator balances recognizable songs, deeper cuts, era coverage, and artist variety, then sequences everything into a release.",
    guarantee:
      "Guaranteed fill: if an exact filter combination is too narrow, the engine widens it progressively and tells you exactly what changed.",
    presetHeading: "Start with a feeling",
    presets: {
      lateNight: {
        title: "Late-night drive",
        detail: "Dreamy, brooding, bittersweet",
      },
      goldenHour: {
        title: "Golden-hour glow",
        detail: "Nostalgic, tender, unhurried",
      },
      mainCharacter: {
        title: "Main-character energy",
        detail: "Euphoric, triumphant, funky",
      },
      healing: {
        title: "Heartbreak, healed",
        detail: "Sad, bittersweet, tender",
      },
    },
    generationHeading: "Generations",
    allGenerations: "All generations",
    emotionHeading: "Emotional world",
    anyMood: "Any mood",
    emotionMapHint:
      "Choose moods on the map. Position shows how positive and energetic each feeling is.",
    emotionQuadrants: [
      "Positive · high energy",
      "Unpleasant · high energy",
      "Unpleasant · low energy",
      "Positive · low energy",
    ],
    lowEnergy: "Low energy",
    highEnergy: "High energy",
    lowValence: "Unpleasant",
    highValence: "Pleasant",
    emotionStrength: "Intensity",
    subtle: "Subtle",
    balanced: "Balanced",
    strong: "Strong",
    eraHeading: "Era",
    fromYear: "From",
    toYear: "To",
    yearAll: "All years",
    yearRanges: [
      { label: "60s", from: 1960, to: 1969 },
      { label: "70s", from: 1970, to: 1979 },
      { label: "80s", from: 1980, to: 1989 },
      { label: "90s", from: 1990, to: 1999 },
      { label: "2000s", from: 2000, to: 2009 },
      { label: "2010s", from: 2010, to: 2019 },
      { label: "2020s", from: 2020, to: 2029 },
    ],
    lengthHeading: "Album length",
    tracksUnit: (count) => `${count} tracks`,
    mixHeading: "Hit-to-discovery balance",
    hits: "Known favorites",
    discoveries: "Hidden corners",
    energyHeading: "Energy",
    energy: {
      any: "Any",
      gentle: "Gentle",
      uplifting: "Uplifting",
      intense: "Intense",
      melancholic: "Melancholic",
    },
    artistVariety: "Artist variety",
    artistVarietyHint:
      "Keep one track per artist first, then loosen only if the album needs more songs.",
    titleLabel: "Album name",
    titlePlaceholder: "Leave blank for a generated title",
    clearFilters: "Clear filters",
    generate: "Design album",
    generating: "Designing...",
    shuffle: "Shuffle the cut",
    save: "Save album",
    saving: "Saving...",
    saved: "Saved",
    saveError: "Could not save this album. Your design is still here.",
    generateError:
      "The curator could not reach the catalog. Check the connection and try again.",
    emptyResultTitle: "Your record will appear here",
    emptyResultHint:
      "Start with a preset or set the controls, then press Design album.",
    briefHeading: "Release brief",
    briefTitle: "Your album at a glance",
    briefDetail:
      "The cover is assembled from the actual recordings in the final sequence.",
    playlistLength: "Length",
    hitBalance: "Known favorites",
    discoveryShare: "Discoveries",
    yearSpan: "Years",
    averageHeat: "Average popularity",
    filterWidened:
      "Some filters were widened to guarantee the album length. The affected tracks are marked.",
    noFilterWidened: "Every requested filter was available in the final mix.",
    playAlbum: "Play album",
    pauseAlbum: "Pause album",
    playTrack: "Play",
    pauseTrack: "Pause",
    watch: "Watch",
    trackHeading: "Track sequence",
    role: {
      opener: "Opening signal",
      build: "Build",
      ride: "Keep moving",
      centerpiece: "Centerpiece",
      release: "Breathe",
      finale: "Finale",
    },
    signal: {
      anchor: "Known favorite",
      discovery: "Discovery",
      emotion: "Mood match",
      era: "Era match",
      widened: "Filter widened",
    },
    myAlbums: "My albums",
    noAlbums: "No saved albums yet",
    noAlbumsHint: "Design a record and save it to keep the exact sequence.",
    savedOn: (date) => `Saved ${date}`,
    backToStudio: "Back to album design",
    albumNotFound: "Album not found",
    albumNotFoundHint:
      "It may have been deleted, or this link belongs to another account.",
    liveMix: "Live composition",
    designAnother: "Design another",
    openSaved: "Open saved album",
    saveSuccess: "Album saved and added to Playlists.",
    requestPrefix: "",
    resultsReady: (count) => `${count} tracks sequenced`,
    presetApplied: "Preset applied",
    generationalMix: (count) => `${count} generations`,
    artists: (count) => `${count} artists`,
  },
  vi: {
    studioEyebrow: "Thiết kế album",
    studioTitle: "Tạo một album, không chỉ là danh sách phát",
    studioIntro:
      "Chọn thế giới mà album này thuộc về. Hệ thống cân bằng giữa bài quen thuộc và bản ít người biết, phủ đều thế hệ, giữ đa dạng nghệ sĩ và sắp xếp thành một chỉnh thể có mở đầu, cao trào và kết thúc.",
    guarantee:
      "Luôn đủ số bài: nếu bộ lọc quá hẹp, hệ thống sẽ mở rộng dần và ghi rõ những bài nào phải nới điều kiện.",
    presetHeading: "Bắt đầu từ một cảm giác",
    presets: {
      lateNight: {
        title: "Đêm khuya trên đường",
        detail: "Mơ màng, trầm tư, day dứt",
      },
      goldenHour: {
        title: "Ánh vàng cuối ngày",
        detail: "Hoài niệm, dịu dàng, chậm rãi",
      },
      mainCharacter: {
        title: "Năng lượng nhân vật chính",
        detail: "Bùng nổ, chiến thắng, sôi động",
      },
      healing: {
        title: "Nỗi buồn đã lành",
        detail: "Buồn, day dứt, dịu dàng",
      },
    },
    generationHeading: "Thế hệ",
    allGenerations: "Mọi thế hệ",
    emotionHeading: "Thế giới cảm xúc",
    anyMood: "Mọi cảm xúc",
    emotionMapHint:
      "Chọn cảm xúc trên bản đồ. Vị trí thể hiện mức độ tích cực và năng lượng.",
    emotionQuadrants: [
      "Tích cực · nhiều năng lượng",
      "Khó chịu · nhiều năng lượng",
      "Khó chịu · ít năng lượng",
      "Tích cực · ít năng lượng",
    ],
    lowEnergy: "Ít năng lượng",
    highEnergy: "Nhiều năng lượng",
    lowValence: "Khó chịu",
    highValence: "Dễ chịu",
    emotionStrength: "Cường độ",
    subtle: "Nhẹ",
    balanced: "Cân bằng",
    strong: "Mạnh",
    eraHeading: "Giai đoạn",
    fromYear: "Từ năm",
    toYear: "Đến năm",
    yearAll: "Mọi năm",
    yearRanges: [
      { label: "60s", from: 1960, to: 1969 },
      { label: "70s", from: 1970, to: 1979 },
      { label: "80s", from: 1980, to: 1989 },
      { label: "90s", from: 1990, to: 1999 },
      { label: "2000s", from: 2000, to: 2009 },
      { label: "2010s", from: 2010, to: 2019 },
      { label: "2020s", from: 2020, to: 2029 },
    ],
    lengthHeading: "Độ dài album",
    tracksUnit: (count) => `${count} bài`,
    mixHeading: "Cân bằng hit và khám phá",
    hits: "Bài quen thuộc",
    discoveries: "Bản ít người biết",
    energyHeading: "Năng lượng",
    energy: {
      any: "Tùy ý",
      gentle: "Nhẹ nhàng",
      uplifting: "Tươi sáng",
      intense: "Mạnh mẽ",
      melancholic: "U sầu",
    },
    artistVariety: "Đa dạng nghệ sĩ",
    artistVarietyHint:
      "Ưu tiên mỗi nghệ sĩ một bài; chỉ nới khi album cần thêm bài để đủ độ dài.",
    titleLabel: "Tên album",
    titlePlaceholder: "Để trống để hệ thống đặt tên",
    clearFilters: "Xóa bộ lọc",
    generate: "Thiết kế album",
    generating: "Đang thiết kế...",
    shuffle: "Xáo lại bản cắt",
    save: "Lưu album",
    saving: "Đang lưu...",
    saved: "Đã lưu",
    saveError: "Không thể lưu album. Thiết kế của bạn vẫn còn ở đây.",
    generateError:
      "Không thể kết nối với kho nhạc. Hãy kiểm tra kết nối và thử lại.",
    emptyResultTitle: "Album của bạn sẽ xuất hiện ở đây",
    emptyResultHint:
      "Chọn một gợi ý hoặc điều chỉnh bộ lọc, rồi nhấn Thiết kế album.",
    briefHeading: "Bản tóm tắt",
    briefTitle: "Album trong một cái nhìn",
    briefDetail:
      "Bìa album được ghép từ chính các bản thu trong danh sách cuối cùng.",
    playlistLength: "Độ dài",
    hitBalance: "Bài quen thuộc",
    discoveryShare: "Khám phá",
    yearSpan: "Năm",
    averageHeat: "Độ phổ biến trung bình",
    filterWidened:
      "Một số bộ lọc đã được nới để đủ số bài. Những bài bị ảnh hưởng đã được đánh dấu.",
    noFilterWidened: "Mọi bộ lọc bạn chọn đều có trong bản mix cuối.",
    playAlbum: "Phát album",
    pauseAlbum: "Tạm dừng album",
    playTrack: "Phát",
    pauseTrack: "Tạm dừng",
    watch: "Xem",
    trackHeading: "Trình tự bài hát",
    role: {
      opener: "Mở màn",
      build: "Dẫn nhịp",
      ride: "Giữ nhịp",
      centerpiece: "Tâm điểm",
      release: "Lắng lại",
      finale: "Kết thúc",
    },
    signal: {
      anchor: "Bài quen thuộc",
      discovery: "Khám phá",
      emotion: "Đúng cảm xúc",
      era: "Đúng thế hệ",
      widened: "Đã nới bộ lọc",
    },
    myAlbums: "Album của tôi",
    noAlbums: "Chưa có album đã lưu",
    noAlbumsHint: "Thiết kế một album và lưu lại để giữ nguyên trình tự.",
    savedOn: (date) => `Đã lưu ${date}`,
    backToStudio: "Về thiết kế album",
    albumNotFound: "Không tìm thấy album",
    albumNotFoundHint:
      "Album có thể đã bị xóa, hoặc liên kết thuộc về tài khoản khác.",
    liveMix: "Bản mix trực tiếp",
    designAnother: "Thiết kế album khác",
    openSaved: "Mở album đã lưu",
    saveSuccess: "Đã lưu album và thêm vào Danh sách phát.",
    requestPrefix: "",
    resultsReady: (count) => `${count} bài đã được sắp xếp`,
    presetApplied: "Đã áp dụng gợi ý",
    generationalMix: (count) => `${count} thế hệ`,
    artists: (count) => `${count} nghệ sĩ`,
  },
};
