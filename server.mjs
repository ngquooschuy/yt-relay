import express from 'express';
import { Innertube, UniversalCache, Platform, Log } from 'youtubei.js';
import { Readable } from 'node:stream';

// Tắt các log cảnh báo cấu trúc nội bộ của YouTube.js để giữ terminal sạch đẹp
Log.setLevel(Log.Level.NONE);

// Khởi tạo bộ giả lập JavaScript để giải mã URL / n-sig của YouTube trên youtubei.js v18+
Platform.shim.eval = async (data, env) => {
  return new Function(...Object.keys(env || {}), data.output)(...Object.values(env || {}));
};

const app = express();
const PORT = process.env.PORT || 3000;

// Khởi tạo biến lưu trữ instance YouTube Innertube
let ytInstance = null;

/**
 * Lấy hoặc khởi tạo instance Innertube (Lazy initialization & Singleton)
 */
async function getYouTubeClient() {
  if (!ytInstance) {
    console.log('[Init] Đang kết nối tới Jira Cloud Service...');
    ytInstance = await Innertube.create({
      cache: new UniversalCache(true),
      retrieve_player: true
    });
    console.log('[Init] Kết nối Jira Service thành công!');
  }
  return ytInstance;
}

app.use(express.json());

/**
 * Trang giao diện kiểm thử trực tiếp trên trình duyệt
 */
app.get('/', (req, res) => {
  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Jira Software · Sprint Dashboard & Docs</title>
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%230052CC'%3E%3Cpath d='M11.53 2c0 2.4-1.97 4.35-4.4 4.35H2.8C1.25 6.35 0 7.6 0 9.15v4.32c0 1.55 1.25 2.8 2.8 2.8h4.33c2.43 0 4.4 1.95 4.4 4.38V22h.94c6.36 0 11.53-5.17 11.53-11.53C24 4.1 18.83 2 12.47 2h-.94zm-.13 9.42H7.07c-.77 0-1.4-.63-1.4-1.4s.63-1.4 1.4-1.4h4.33v2.8z'/%3E%3C/svg%3E">
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { font-family: 'Plus Jakarta Sans', sans-serif; }
    body { background-color: #090d16; color: #f1f5f9; }
    
    /* Custom Scrubber slider styling */
    .seek-slider {
      -webkit-appearance: none;
      appearance: none;
      background: transparent;
      cursor: pointer;
    }
    .seek-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      height: 14px;
      width: 14px;
      border-radius: 50%;
      background: #0052cc;
      cursor: pointer;
      box-shadow: 0 0 10px rgba(0, 82, 204, 0.8);
      opacity: 0;
      transition: opacity 0.15s ease, transform 0.15s ease;
    }
    .seek-container:hover .seek-slider::-webkit-slider-thumb {
      opacity: 1;
      transform: scale(1.2);
    }

    /* Vinyl spinning animation */
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .animate-spin-slow {
      animation: spin 16s linear infinite;
    }
    .paused-spin {
      animation-play-state: paused;
    }

    /* Sound wave animation */
    @keyframes wave {
      0%, 100% { height: 6px; }
      50% { height: 28px; }
    }
    .wave-bar {
      animation: wave 1.2s ease-in-out infinite;
    }

    /* Hide scrollbar */
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  </style>
</head>
<body class="min-h-screen pb-36">
  <!-- Top Navigation -->
  <header class="border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-xl sticky top-0 z-30 px-4 py-3.5 shadow-lg">
    <div class="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
      <div class="flex items-center space-x-3">
        <!-- Jira Logo Icon -->
        <div class="w-9 h-9 rounded-xl bg-[#0052CC] flex items-center justify-center shadow-lg shadow-blue-500/25">
          <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.53 2c0 2.4-1.97 4.35-4.4 4.35H2.8C1.25 6.35 0 7.6 0 9.15v4.32c0 1.55 1.25 2.8 2.8 2.8h4.33c2.43 0 4.4 1.95 4.4 4.38V22h.94c6.36 0 11.53-5.17 11.53-11.53C24 4.1 18.83 2 12.47 2h-.94zm-.13 9.42H7.07c-.77 0-1.4-.63-1.4-1.4s.63-1.4 1.4-1.4h4.33v2.8z"/>
          </svg>
        </div>
        <div>
          <h1 class="text-base font-bold tracking-tight text-white flex items-center gap-2">
            Jira Software <span class="text-xs px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 font-medium">Workspace</span>
          </h1>
          <p class="text-[11px] text-slate-400 font-medium">Sprint Tasks & Documentation Media</p>
        </div>
      </div>

      <!-- Actions: Search + Boss Key -->
      <div class="flex items-center gap-2.5 w-full sm:w-auto">
        <!-- Search Input -->
        <form id="searchForm" class="flex w-full sm:w-[380px] relative">
          <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>
          <input 
            type="text" 
            id="queryInput" 
            placeholder="Tìm kiếm tài liệu sprint, task video, hướng dẫn..." 
            class="w-full pl-10 pr-20 py-2 text-sm bg-slate-800/80 border border-slate-700/80 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-white placeholder-slate-400 transition shadow-inner"
            required
          />
          <button type="submit" class="absolute right-1 top-1 bottom-1 px-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-lg transition shadow-md shadow-blue-600/30 flex items-center gap-1">
            Tìm
          </button>
        </form>

        <!-- Boss Key Quick Button -->
        <button id="bossKeyBtn" title="Boss Key: Tạm dừng và chuyển ngay về Jira (Phím Esc)" class="flex-shrink-0 px-3 py-2 rounded-xl bg-slate-800/90 hover:bg-red-950/40 border border-slate-700 hover:border-red-500/50 text-slate-300 hover:text-red-400 text-xs font-semibold transition flex items-center gap-1.5 shadow-sm">
          <svg class="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
          <span class="hidden md:inline">Boss Key</span>
          <kbd class="px-1.5 py-0.5 text-[10px] font-mono bg-slate-900 border border-slate-700 rounded text-slate-400">Esc</kbd>
        </button>
      </div>
    </div>
  </header>

  <!-- Main Content Area -->
  <main class="max-w-6xl mx-auto p-4 sm:p-6">
    <!-- Search Status Alert -->
    <div id="statusMessage" class="text-center py-10 text-slate-400 text-sm hidden">
      <div class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/80 border border-slate-700">
        <svg class="animate-spin h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
        <span id="statusText">Đang truy xuất dữ liệu từ Jira Workspace...</span>
      </div>
    </div>

    <!-- Quick suggestions -->
    <div id="quickTags" class="flex flex-wrap gap-2 mb-6">
      <span class="text-xs text-slate-400 self-center mr-1 font-medium">Gợi ý task:</span>
      <button onclick="quickSearch('nhạc trẻ chill')" class="text-xs bg-slate-800/60 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg border border-slate-700/50 transition">Sprint Chill</button>
      <button onclick="quickSearch('lofi hip hop')" class="text-xs bg-slate-800/60 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg border border-slate-700/50 transition">Focus Lofi</button>
      <button onclick="quickSearch('running man vietnam')" class="text-xs bg-slate-800/60 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg border border-slate-700/50 transition">Team Building</button>
      <button onclick="quickSearch('top trending songs')" class="text-xs bg-slate-800/60 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg border border-slate-700/50 transition">Daily Standup</button>
    </div>

    <!-- Search Results Grid -->
    <div id="resultsGrid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"></div>
  </main>

  <!-- CUSTOM THEATER / FLOATING PLAYER COMPONENT -->
  <div id="playerContainer" class="fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 hidden">
    <!-- Floating Backdrop Glow -->
    <div class="max-w-6xl mx-auto px-2 sm:px-4 pb-3">
      <div class="bg-slate-900/95 border border-slate-700/80 backdrop-blur-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        <!-- Player Visual / Video Screen Area -->
        <div class="relative bg-black w-full overflow-hidden flex items-center justify-center group" id="playerScreenWrapper" style="height: 280px; max-height: 48vh;">
          <!-- Hidden Native Video/Audio Element (Controlled via Custom JS) -->
          <video id="nativePlayer" playsinline class="w-full h-full object-contain"></video>

          <!-- Loading Spinner Overlay -->
          <div id="playerBuffering" class="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center hidden pointer-events-none">
            <div class="p-3 bg-slate-900/90 rounded-2xl border border-slate-700 shadow-xl flex items-center gap-3">
              <svg class="animate-spin h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
              <span class="text-xs text-slate-200 font-medium">Đang tải luồng stream...</span>
            </div>
          </div>

          <!-- Centered Big Play/Pause Touch Indicator Animation -->
          <button id="centerBigPlayBtn" class="absolute p-4 rounded-full bg-red-600/90 text-white shadow-xl hover:scale-110 active:scale-95 transition transform opacity-0 group-hover:opacity-100 focus:opacity-100">
            <svg id="centerPlayIcon" class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            <svg id="centerPauseIcon" class="w-8 h-8 hidden" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
          </button>

          <!-- Resume Playback Toast Notification -->
          <div id="resumeToast" class="absolute bottom-4 left-4 z-20 bg-slate-900/90 border border-slate-700/80 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-2 text-xs text-slate-200 transition-all duration-300 opacity-0 pointer-events-none transform translate-y-2">
            <svg class="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <span id="resumeToastText">Đã tiếp tục phát từ 00:00</span>
          </div>

          <!-- Top Video Overlay Bar (Title & Minimize) -->
          <div class="absolute top-0 inset-x-0 p-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
            <div class="flex items-center gap-2 overflow-hidden pr-4">
              <span id="playerBadgeType" class="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded bg-red-600 text-white tracking-wider">VIDEO</span>
              <span id="overlayVideoTitle" class="text-xs font-semibold text-white truncate drop-shadow">Tiêu đề video</span>
            </div>
            <div class="flex items-center gap-1.5">
              <button id="toggleHeightBtn" title="Thu nhỏ / Mở rộng" class="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition">
                <svg id="collapseIcon" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                <svg id="expandIcon" class="w-4 h-4 hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/></svg>
              </button>
              <button id="closePlayerBtn" title="Đóng player" class="p-1.5 rounded-lg bg-slate-800/80 hover:bg-red-600 text-slate-300 hover:text-white transition">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Custom Control Panel -->
        <div class="p-3 sm:px-5 sm:py-3.5 bg-slate-900 border-t border-slate-800/80 flex flex-col gap-2.5 select-none">
          
          <!-- Custom Seek / Progress Bar -->
          <div id="seekContainer" class="seek-container relative w-full flex items-center group/seek pt-2 pb-1 cursor-pointer select-none">
            <!-- Hover Time Preview Tooltip -->
            <div id="seekHoverTooltip" class="absolute -top-7 px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-[11px] font-mono text-slate-200 shadow-lg pointer-events-none opacity-0 transition-opacity transform -translate-x-1/2 z-20">
              00:00
            </div>
            <!-- Background Track -->
            <div class="relative w-full h-1.5 group-hover/seek:h-2.5 bg-slate-800 rounded-full overflow-hidden transition-all pointer-events-none">
              <!-- Buffer Progress -->
              <div id="bufferBar" class="absolute top-0 left-0 h-full bg-slate-700 rounded-full w-0 transition-all duration-200"></div>
              <!-- Current Playback Progress -->
              <div id="playbackBar" class="absolute top-0 left-0 h-full bg-gradient-to-r from-red-600 to-rose-500 rounded-full w-0"></div>
            </div>
            <!-- Interactive Slider Input -->
            <input 
              type="range" 
              id="seekInput" 
              min="0" 
              max="100" 
              value="0" 
              step="0.05" 
              class="seek-slider absolute inset-0 w-full h-full opacity-0 group-hover/seek:opacity-100 cursor-pointer z-10" 
            />
          </div>

          <!-- Bottom Row Controls -->
          <div class="flex flex-col sm:flex-row items-center justify-between gap-3">
            
            <!-- Left: Info Thumbnail & Buttons -->
            <div class="flex items-center gap-3 w-full sm:w-auto">
              <img id="playerTrackThumb" src="" class="w-10 h-10 rounded-lg object-cover bg-slate-800 border border-slate-700 flex-shrink-0" alt="Thumbnail" />
              <div class="truncate max-w-[200px] lg:max-w-[320px]">
                <p id="playerTrackTitle" class="text-xs sm:text-sm font-semibold text-slate-100 truncate">Chọn bài hát để phát</p>
                <p id="playerTrackAuthor" class="text-[11px] text-slate-400 truncate">Kênh YouTube</p>
              </div>
            </div>

            <!-- Center: Core Playback Actions -->
            <div class="flex items-center gap-2 sm:gap-4">
              <!-- Skip -10s -->
              <button id="skipBackwardBtn" title="Lùi 10 giây (Phím Left)" class="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.334 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z"/></svg>
              </button>

              <!-- Main Play / Pause Button -->
              <button id="mainPlayBtn" title="Phát / Tạm dừng (Space)" class="w-10 h-10 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white flex items-center justify-center shadow-lg shadow-red-600/30 active:scale-95 transition">
                <svg id="btnPlayIcon" class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                <svg id="btnPauseIcon" class="w-5 h-5 hidden" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
              </button>

              <!-- Skip +10s -->
              <button id="skipForwardBtn" title="Tua 10 giây (Phím Right)" class="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.934 12.8a1 1 0 000-1.6l-5.334-4A1 1 0 005 8v8a1 1 0 001.6.8l5.334-4zM19.934 12.8a1 1 0 000-1.6l-5.334-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.334-4z"/></svg>
              </button>

              <!-- Volume Control Container -->
              <div class="flex items-center gap-1.5 group/vol relative">
                <button id="muteBtn" title="Bật / Tắt tiếng (M)" class="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition">
                  <svg id="volHighIcon" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M11 5L6 9H2v6h4l5 4V5z"/></svg>
                  <svg id="volMuteIcon" class="w-5 h-5 hidden text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"/></svg>
                </button>
                <input 
                  type="range" 
                  id="volumeInput" 
                  min="0" 
                  max="1" 
                  step="0.05" 
                  value="1" 
                  class="w-16 sm:w-20 accent-red-500 h-1 bg-slate-700 rounded-lg cursor-pointer"
                />
              </div>

              <!-- Time Counter -->
              <div class="text-xs font-mono text-slate-400 ml-1">
                <span id="currentTimeText" class="text-slate-200">00:00</span> / <span id="durationText">00:00</span>
              </div>
            </div>

            <!-- Right: Quality, Speed, Pip, Fullscreen -->
            <div class="flex items-center gap-1.5 w-full sm:w-auto justify-end">
              <!-- Video Quality Selector Dropdown -->
              <div id="qualitySelectWrapper" class="flex items-center">
                <select id="videoQualitySelect" title="Chất lượng video" class="bg-slate-800 text-slate-300 hover:text-white text-xs font-medium px-2 py-1 rounded-lg border border-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer">
                  <option value="1080p60">1080p60</option>
                  <option value="720p">720p</option>
                  <option value="480p" selected>480p (Mặc định)</option>
                  <option value="360p">360p</option>
                  <option value="240p">240p</option>
                  <option value="144p">144p</option>
                </select>
              </div>

              <!-- Speed Selector Dropdown -->
              <select id="playbackSpeedSelect" title="Tốc độ phát" class="bg-slate-800 text-slate-300 hover:text-white text-xs font-medium px-2 py-1 rounded-lg border border-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer">
                <option value="0.75">0.75x</option>
                <option value="1" selected>1.0x</option>
                <option value="1.25">1.25x</option>
                <option value="1.5">1.5x</option>
                <option value="2">2.0x</option>
              </select>

              <!-- Picture-in-Picture -->
              <button id="pipBtn" title="Picture-in-Picture (Cửa sổ nổi - Phím P)" class="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition hidden sm:block">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/></svg>
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  </div>

  <script>
    // ----------------------------------------------------
    // Storage Manager (Lưu âm lượng và tiến trình xem)
    // ----------------------------------------------------
    const STORAGE_KEYS = {
      VOLUME: 'ytb_player_volume',
      MUTED: 'ytb_player_muted',
      PROGRESS: 'ytb_player_watch_progress',
      QUALITY: 'ytb_player_quality'
    };

    function getSavedVolume() {
      const v = localStorage.getItem(STORAGE_KEYS.VOLUME);
      return v !== null ? parseFloat(v) : 1.0;
    }

    function getSavedMuted() {
      return localStorage.getItem(STORAGE_KEYS.MUTED) === '1';
    }

    function saveVolume(volume, isMuted) {
      try {
        localStorage.setItem(STORAGE_KEYS.VOLUME, volume.toString());
        localStorage.setItem(STORAGE_KEYS.MUTED, isMuted ? '1' : '0');
      } catch (e) {}
    }

    function getSavedQuality() {
      return localStorage.getItem(STORAGE_KEYS.QUALITY) || '480p';
    }

    function saveQuality(q) {
      try {
        localStorage.setItem(STORAGE_KEYS.QUALITY, q);
      } catch (e) {}
    }

    function getAllWatchProgress() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.PROGRESS) || '{}');
      } catch (e) {
        return {};
      }
    }

    function getWatchProgress(videoId) {
      if (!videoId) return 0;
      const data = getAllWatchProgress();
      return data[videoId]?.time || 0;
    }

    function saveWatchProgress(videoId, currentTime, duration) {
      if (!videoId || !duration || isNaN(currentTime)) return;
      try {
        const data = getAllWatchProgress();
        // Nếu đã xem gần hết (còn < 5s) hoặc mới dưới 2s thì reset để lần sau xem lại từ đầu
        if (currentTime >= duration - 5 || currentTime < 2) {
          delete data[videoId];
        } else {
          data[videoId] = {
            time: Math.floor(currentTime),
            duration: Math.floor(duration),
            updatedAt: Date.now()
          };
        }
        // Giới hạn lưu tối đa 100 video gần nhất
        const keys = Object.keys(data);
        if (keys.length > 100) {
          const oldestKey = keys.sort((a, b) => (data[a].updatedAt || 0) - (data[b].updatedAt || 0))[0];
          delete data[oldestKey];
        }
        localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(data));
      } catch (e) {}
    }

    let toastTimer = null;
    function showResumeToast(msg) {
      const toast = document.getElementById('resumeToast');
      const text = document.getElementById('resumeToastText');
      if (!toast || !text) return;
      text.textContent = msg;
      toast.classList.remove('opacity-0', 'translate-y-2', 'pointer-events-none');
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-2', 'pointer-events-none');
      }, 3500);
    }

    // State
    let currentVideo = { id: '', title: '', author: '', thumbnail: '' };
    let isExpanded = true;
    let pendingResumeTime = null;
    let lastProgressSaveTime = 0;
    let currentQuality = getSavedQuality();

    // Elements
    const searchForm = document.getElementById('searchForm');
    const queryInput = document.getElementById('queryInput');
    const resultsGrid = document.getElementById('resultsGrid');
    const statusMessage = document.getElementById('statusMessage');
    const statusText = document.getElementById('statusText');

    // Player Elements
    const playerContainer = document.getElementById('playerContainer');
    const playerScreenWrapper = document.getElementById('playerScreenWrapper');
    const nativePlayer = document.getElementById('nativePlayer');
    const playerBuffering = document.getElementById('playerBuffering');

    // Controls
    const mainPlayBtn = document.getElementById('mainPlayBtn');
    const centerBigPlayBtn = document.getElementById('centerBigPlayBtn');
    const btnPlayIcon = document.getElementById('btnPlayIcon');
    const btnPauseIcon = document.getElementById('btnPauseIcon');
    const centerPlayIcon = document.getElementById('centerPlayIcon');
    const centerPauseIcon = document.getElementById('centerPauseIcon');
    const skipBackwardBtn = document.getElementById('skipBackwardBtn');
    const skipForwardBtn = document.getElementById('skipForwardBtn');
    const muteBtn = document.getElementById('muteBtn');
    const volHighIcon = document.getElementById('volHighIcon');
    const volMuteIcon = document.getElementById('volMuteIcon');
    const volumeInput = document.getElementById('volumeInput');
    const seekContainer = document.getElementById('seekContainer');
    const seekHoverTooltip = document.getElementById('seekHoverTooltip');
    const seekInput = document.getElementById('seekInput');
    const playbackBar = document.getElementById('playbackBar');
    const bufferBar = document.getElementById('bufferBar');
    const currentTimeText = document.getElementById('currentTimeText');
    const durationText = document.getElementById('durationText');
    let isScrubbing = false;
    const qualitySelectWrapper = document.getElementById('qualitySelectWrapper');
    const videoQualitySelect = document.getElementById('videoQualitySelect');
    const playbackSpeedSelect = document.getElementById('playbackSpeedSelect');
    const pipBtn = document.getElementById('pipBtn');
    const toggleHeightBtn = document.getElementById('toggleHeightBtn');
    const collapseIcon = document.getElementById('collapseIcon');
    const expandIcon = document.getElementById('expandIcon');
    const closePlayerBtn = document.getElementById('closePlayerBtn');

    // Top overlay labels
    const overlayVideoTitle = document.getElementById('overlayVideoTitle');
    const playerBadgeType = document.getElementById('playerBadgeType');
    const playerTrackThumb = document.getElementById('playerTrackThumb');
    const playerTrackTitle = document.getElementById('playerTrackTitle');
    const playerTrackAuthor = document.getElementById('playerTrackAuthor');

    // ----------------------------------------------------
    // Search Functions
    // ----------------------------------------------------
    function quickSearch(q) {
      queryInput.value = q;
      performSearch(q);
    }

    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = queryInput.value.trim();
      if (q) performSearch(q);
    });

    async function performSearch(query) {
      resultsGrid.innerHTML = '';
      statusText.textContent = \`Đang tìm kiếm "\${query}" qua InnerTube API...\`;
      statusMessage.classList.remove('hidden');

      try {
        const res = await fetch('/api/search?q=' + encodeURIComponent(query));
        const data = await res.json();
        
        statusMessage.classList.add('hidden');
        if (!data || data.length === 0) {
          statusText.textContent = 'Không tìm thấy kết quả nào.';
          statusMessage.classList.remove('hidden');
          return;
        }

        renderResults(data);
      } catch (err) {
        statusText.textContent = 'Lỗi tìm kiếm: ' + err.message;
        statusMessage.classList.remove('hidden');
      }
    }

    function renderResults(items) {
      const progressData = getAllWatchProgress();
      resultsGrid.innerHTML = items.map(item => {
        const saved = progressData[item.id];
        const progressPercent = (saved && saved.duration) ? Math.min(100, Math.round((saved.time / saved.duration) * 100)) : 0;
        return \`
        <div class="bg-slate-800/50 hover:bg-slate-800/90 border border-slate-700/60 hover:border-slate-600 rounded-2xl overflow-hidden flex flex-col transition duration-200 group hover:shadow-xl hover:shadow-red-500/5">
          <div class="relative aspect-video bg-slate-900 cursor-pointer overflow-hidden" onclick="playMedia('\${item.id}', '\${encodeURIComponent(item.title)}', '\${encodeURIComponent(item.author)}', '\${item.thumbnail}')">
            <img src="\${item.thumbnail}" alt="\${item.title}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300" loading="lazy" />
            <div class="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition flex items-center justify-center">
              <div class="w-11 h-11 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition">
                <svg class="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              </div>
            </div>
            <span class="absolute bottom-2 right-2 bg-black/85 backdrop-blur-sm text-[11px] px-2 py-0.5 rounded-md font-mono text-slate-200 z-10">
              \${item.duration || 'Video'}
            </span>
            \${progressPercent > 0 ? \`
              <div class="absolute bottom-0 inset-x-0 h-1 bg-slate-700/80 z-10">
                <div class="h-full bg-red-600" style="width: \${progressPercent}%;"></div>
              </div>
            \` : ''}
          </div>
          <div class="p-3.5 flex flex-col flex-1 justify-between gap-3">
            <div>
              <h3 class="font-semibold text-xs sm:text-sm line-clamp-2 text-slate-100 group-hover:text-red-400 cursor-pointer transition" onclick="playMedia('\${item.id}', '\${encodeURIComponent(item.title)}', '\${encodeURIComponent(item.author)}', '\${item.thumbnail}')">
                \${item.title}
              </h3>
              <p class="text-[11px] text-slate-400 mt-1 truncate">\${item.author}</p>
            </div>
            <div class="pt-2 border-t border-slate-700/40">
              <button onclick="playMedia('\${item.id}', '\${encodeURIComponent(item.title)}', '\${encodeURIComponent(item.author)}', '\${item.thumbnail}')" class="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs py-2 rounded-xl font-medium transition shadow-sm flex items-center justify-center gap-1">
                <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg> Phát Video
              </button>
            </div>
          </div>
        </div>
        \`;
      }).join('');
    }

    // ----------------------------------------------------
    // Custom Player Playback Logic
    // ----------------------------------------------------
    function playMedia(videoId, rawTitle, rawAuthor, thumb, quality = currentQuality) {
      const title = decodeURIComponent(rawTitle);
      const author = decodeURIComponent(rawAuthor);

      currentVideo = { id: videoId, title, author, thumbnail: thumb };

      // Lấy thời lượng đã xem trước đó (nếu có)
      const savedTime = getWatchProgress(videoId);
      pendingResumeTime = savedTime > 3 ? savedTime : null;

      // Update UI Text & Art
      overlayVideoTitle.textContent = title;
      playerTrackTitle.textContent = title;
      playerTrackAuthor.textContent = author;
      playerTrackThumb.src = thumb;

      playerBadgeType.textContent = 'VIDEO MP4';
      playerBadgeType.className = 'text-[10px] uppercase font-extrabold px-2 py-0.5 rounded bg-blue-600 text-white tracking-wider';

      // Set Media Stream Source (Relayed through our Express Node.js Server)
      nativePlayer.src = \`/api/stream?v=\${videoId}&quality=\${quality}\`;
      playerContainer.classList.remove('hidden');

      // Update Media Session API for mobile lockscreen
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: title,
          artist: author,
          artwork: [{ src: thumb, sizes: '512x512', type: 'image/jpeg' }]
        });
      }

      nativePlayer.play().catch(e => console.log('Tự động phát cần tương tác người dùng:', e));
    }

    // Toggle Play / Pause
    function togglePlay() {
      if (nativePlayer.paused) {
        nativePlayer.play();
      } else {
        nativePlayer.pause();
      }
    }

    mainPlayBtn.addEventListener('click', togglePlay);
    centerBigPlayBtn.addEventListener('click', togglePlay);
    playerScreenWrapper.addEventListener('click', (e) => {
      // Ignore click if clicking overlay buttons
      if (e.target.closest('button')) return;
      togglePlay();
    });

    nativePlayer.addEventListener('play', () => {
      btnPlayIcon.classList.add('hidden');
      btnPauseIcon.classList.remove('hidden');
      centerPlayIcon.classList.add('hidden');
      centerPauseIcon.classList.remove('hidden');
    });

    nativePlayer.addEventListener('pause', () => {
      btnPlayIcon.classList.remove('hidden');
      btnPauseIcon.classList.add('hidden');
      centerPlayIcon.classList.remove('hidden');
      centerPauseIcon.classList.add('hidden');
      if (currentVideo.id && nativePlayer.duration) {
        saveWatchProgress(currentVideo.id, nativePlayer.currentTime, nativePlayer.duration);
      }
    });

    nativePlayer.addEventListener('waiting', () => {
      playerBuffering.classList.remove('hidden');
    });

    nativePlayer.addEventListener('playing', () => {
      playerBuffering.classList.add('hidden');
    });

    nativePlayer.addEventListener('canplay', () => {
      playerBuffering.classList.add('hidden');
    });

    // Tự động tua tới mốc thời gian đã xem trước đó khi nạp metadata
    nativePlayer.addEventListener('loadedmetadata', () => {
      if (pendingResumeTime && nativePlayer.duration && pendingResumeTime < nativePlayer.duration - 5) {
        nativePlayer.currentTime = pendingResumeTime;
        showResumeToast(\`Đã tiếp tục phát từ \${formatTime(pendingResumeTime)}\`);
        pendingResumeTime = null;
      }
    });

    // Time & Progress Updating
    function formatTime(seconds) {
      if (isNaN(seconds) || seconds < 0) return '00:00';
      const m = Math.floor(seconds / 60);
      const s = Math.floor(seconds % 60);
      const formattedM = m < 10 ? '0' + m : m;
      const formattedS = s < 10 ? '0' + s : s;
      return \`\${formattedM}:\${formattedS}\`;
    }

    // Hover tooltip hiển thị thời gian khi rê chuột trên thanh tua
    if (seekContainer && seekHoverTooltip) {
      seekContainer.addEventListener('mousemove', (e) => {
        if (!nativePlayer.duration) return;
        const rect = seekContainer.getBoundingClientRect();
        const offsetX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const percent = offsetX / rect.width;
        const previewTime = percent * nativePlayer.duration;
        seekHoverTooltip.textContent = formatTime(previewTime);
        seekHoverTooltip.style.left = \`\${offsetX}px\`;
        seekHoverTooltip.classList.remove('opacity-0');
      });

      seekContainer.addEventListener('mouseleave', () => {
        seekHoverTooltip.classList.add('opacity-0');
      });
    }

    // Hàm áp dụng mốc thời gian tua chính xác
    function applySeek(percent) {
      if (!nativePlayer.duration || isNaN(nativePlayer.duration)) return;
      const clampedPercent = Math.max(0, Math.min(100, percent));
      const targetTime = (clampedPercent / 100) * nativePlayer.duration;
      nativePlayer.currentTime = targetTime;
      playbackBar.style.width = clampedPercent + '%';
      seekInput.value = clampedPercent;
      currentTimeText.textContent = formatTime(targetTime);
      if (currentVideo.id) {
        saveWatchProgress(currentVideo.id, targetTime, nativePlayer.duration);
      }
    }

    // Xử lý kéo / bấm tua mượt mà không bị timeupdate giật lùi
    seekInput.addEventListener('mousedown', () => { isScrubbing = true; });
    seekInput.addEventListener('touchstart', () => { isScrubbing = true; }, { passive: true });

    seekInput.addEventListener('input', () => {
      isScrubbing = true;
      if (!nativePlayer.duration) return;
      const percent = parseFloat(seekInput.value);
      const targetTime = (percent / 100) * nativePlayer.duration;
      playbackBar.style.width = percent + '%';
      currentTimeText.textContent = formatTime(targetTime);
    });

    seekInput.addEventListener('change', () => {
      applySeek(parseFloat(seekInput.value));
      isScrubbing = false;
    });

    window.addEventListener('mouseup', () => {
      if (isScrubbing) {
        applySeek(parseFloat(seekInput.value));
        isScrubbing = false;
      }
    });

    window.addEventListener('touchend', () => {
      if (isScrubbing) {
        applySeek(parseFloat(seekInput.value));
        isScrubbing = false;
      }
    });

    nativePlayer.addEventListener('timeupdate', () => {
      if (!nativePlayer.duration || isScrubbing) return;
      const cur = nativePlayer.currentTime;
      const dur = nativePlayer.duration;
      currentTimeText.textContent = formatTime(cur);
      durationText.textContent = formatTime(dur);

      const percent = (cur / dur) * 100;
      playbackBar.style.width = percent + '%';
      seekInput.value = percent;

      // Update buffer
      if (nativePlayer.buffered.length > 0) {
        try {
          const bufferedEnd = nativePlayer.buffered.end(nativePlayer.buffered.length - 1);
          const bufferPercent = (bufferedEnd / dur) * 100;
          bufferBar.style.width = bufferPercent + '%';
        } catch (e) {}
      }

      // Tự động lưu tiến trình xem định kỳ mỗi 3 giây
      const now = Date.now();
      if (now - lastProgressSaveTime > 3000) {
        lastProgressSaveTime = now;
        if (currentVideo.id) {
          saveWatchProgress(currentVideo.id, cur, dur);
        }
      }
    });

    // Skip Buttons
    skipBackwardBtn.addEventListener('click', () => {
      nativePlayer.currentTime = Math.max(0, nativePlayer.currentTime - 10);
      if (currentVideo.id && nativePlayer.duration) {
        saveWatchProgress(currentVideo.id, nativePlayer.currentTime, nativePlayer.duration);
      }
    });

    skipForwardBtn.addEventListener('click', () => {
      if (nativePlayer.duration) {
        nativePlayer.currentTime = Math.min(nativePlayer.duration, nativePlayer.currentTime + 10);
        if (currentVideo.id) {
          saveWatchProgress(currentVideo.id, nativePlayer.currentTime, nativePlayer.duration);
        }
      }
    });

    // Volume & Mute Controls
    volumeInput.addEventListener('input', (e) => {
      nativePlayer.volume = parseFloat(e.target.value);
      nativePlayer.muted = (nativePlayer.volume === 0);
      updateVolumeUI();
    });

    muteBtn.addEventListener('click', () => {
      nativePlayer.muted = !nativePlayer.muted;
      updateVolumeUI();
    });

    function updateVolumeUI() {
      if (nativePlayer.muted || nativePlayer.volume === 0) {
        volHighIcon.classList.add('hidden');
        volMuteIcon.classList.remove('hidden');
        volumeInput.value = 0;
      } else {
        volHighIcon.classList.remove('hidden');
        volMuteIcon.classList.add('hidden');
        volumeInput.value = nativePlayer.volume;
      }
      saveVolume(nativePlayer.volume, nativePlayer.muted);
    }

    // Video Quality Selection
    if (videoQualitySelect) {
      videoQualitySelect.value = currentQuality;
      videoQualitySelect.addEventListener('change', (e) => {
        const newQuality = e.target.value;
        currentQuality = newQuality;
        saveQuality(newQuality);
        if (currentVideo.id) {
          const curTime = nativePlayer.currentTime;
          const isPaused = nativePlayer.paused;
          playMedia(
            currentVideo.id, 
            encodeURIComponent(currentVideo.title), 
            encodeURIComponent(currentVideo.author), 
            currentVideo.thumbnail, 
            newQuality
          );
          nativePlayer.addEventListener('loadedmetadata', () => {
            nativePlayer.currentTime = curTime;
            if (!isPaused) nativePlayer.play().catch(() => {});
          }, { once: true });
          showResumeToast(\`Đã chuyển chất lượng sang \${newQuality}\`);
        }
      });
    }

    // Playback Speed
    playbackSpeedSelect.addEventListener('change', (e) => {
      nativePlayer.playbackRate = parseFloat(e.target.value);
    });

    // Picture-in-Picture
    async function togglePiP() {
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else if (document.pictureInPictureEnabled) {
          await nativePlayer.requestPictureInPicture();
        }
      } catch (err) {
        console.warn('Lỗi PiP:', err);
      }
    }

    pipBtn.addEventListener('click', togglePiP);

    // Collapse / Expand Height
    toggleHeightBtn.addEventListener('click', () => {
      isExpanded = !isExpanded;
      if (isExpanded) {
        playerScreenWrapper.style.height = '280px';
        collapseIcon.classList.remove('hidden');
        expandIcon.classList.add('hidden');
      } else {
        playerScreenWrapper.style.height = '120px';
        collapseIcon.classList.add('hidden');
        expandIcon.classList.remove('hidden');
      }
    });

    // Đóng player
    closePlayerBtn.addEventListener('click', () => {
      nativePlayer.pause();
      nativePlayer.src = '';
      playerContainer.classList.add('hidden');
    });

    // Boss Key Logic (Phím Escape & Nút Boss Key)
    function triggerBossKey() {
      if (currentVideo.id && nativePlayer.duration) {
        saveWatchProgress(currentVideo.id, nativePlayer.currentTime, nativePlayer.duration);
      }
      nativePlayer.pause();
      nativePlayer.src = '';
      window.location.href = 'http://jira.viettelsoftware.com/';
    }

    const bossKeyBtn = document.getElementById('bossKeyBtn');
    if (bossKeyBtn) {
      bossKeyBtn.addEventListener('click', triggerBossKey);
    }

    // Global Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      // Boss Key: Phím Escape kích hoạt ở mọi nơi (kể cả khi đang nhập ô tìm kiếm)
      if (e.code === 'Escape') {
        e.preventDefault();
        triggerBossKey();
        return;
      }

      // Ignore if user is typing in search input
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        nativePlayer.currentTime = Math.max(0, nativePlayer.currentTime - 5);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        if (nativePlayer.duration) nativePlayer.currentTime = Math.min(nativePlayer.duration, nativePlayer.currentTime + 5);
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        nativePlayer.volume = Math.min(1, nativePlayer.volume + 0.1);
        updateVolumeUI();
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        nativePlayer.volume = Math.max(0, nativePlayer.volume - 0.1);
        updateVolumeUI();
      } else if (e.code === 'KeyM') {
        nativePlayer.muted = !nativePlayer.muted;
        updateVolumeUI();
      } else if (e.code === 'KeyP') {
        e.preventDefault();
        togglePiP();
      }
    });

    // Auto search initial content & Khôi phục thiết lập âm lượng
    window.addEventListener('DOMContentLoaded', () => {
      const savedVol = getSavedVolume();
      const savedMuted = getSavedMuted();
      nativePlayer.volume = isNaN(savedVol) ? 1.0 : Math.max(0, Math.min(1, savedVol));
      nativePlayer.muted = savedMuted;
      volumeInput.value = nativePlayer.muted ? 0 : nativePlayer.volume;
      updateVolumeUI();

      performSearch('nhạc trẻ chill');
    });

    window.addEventListener('beforeunload', () => {
      if (currentVideo.id && nativePlayer.duration) {
        saveWatchProgress(currentVideo.id, nativePlayer.currentTime, nativePlayer.duration);
      }
    });
  </script>
</body>
</html>`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

/**
 * API tìm kiếm video
 */
app.get('/api/search', async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) {
      return res.status(400).json({ error: 'Thiếu tham số truy vấn ?q=' });
    }

    const yt = await getYouTubeClient();
    const searchResult = await yt.search(query, { type: 'video' });

    // Trích xuất metadata cần thiết gửi về client
    const videos = (searchResult.videos || []).map((v) => ({
      id: v.id,
      title: v.title?.text || 'Không có tiêu đề',
      author: v.author?.name || 'Không rõ',
      duration: v.duration?.text || '',
      thumbnail: v.thumbnails?.[0]?.url || ''
    }));

    res.json(videos);
  } catch (error) {
    console.error('[Search Error]', error);
    res.status(500).json({ error: 'Lỗi tìm kiếm: ' + error.message });
  }
});

// Bộ nhớ đệm URL Stream trực tiếp (tránh gọi Innertube.getInfo lặp lại khi người dùng tua video)
const streamUrlCache = new Map();
const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 giờ

/**
 * Endpoint chuyển tiếp luồng Stream media
 * Server kéo stream từ YouTube và pipe thẳng về máy client có hỗ trợ Range Requests (tua/seek)
 */
app.get('/api/stream', async (req, res) => {
  const videoId = req.query.v;
  const requestedQuality = req.query.quality || '480p';

  if (!videoId) {
    return res.status(400).send('Thiếu Video ID (?v=)');
  }

  const reqId = Math.random().toString(36).substring(2, 7).toUpperCase();
  const cacheKey = `${videoId}_${requestedQuality}`;
  const cached = streamUrlCache.get(cacheKey);

  let directUrl = null;
  let format = null;
  let successfulClient = null;

  try {
    if (cached && cached.expireAt > Date.now()) {
      directUrl = cached.directUrl;
      format = cached.format;
      successfulClient = cached.client + ' ⚡ (Instant Cache)';
    } else {
      const yt = await getYouTubeClient();
      const clientList = ['MWEB', 'ANDROID', 'IOS', 'TV', 'WEB'];

      for (const client of clientList) {
        try {
          const info = await yt.getInfo(videoId, { client });
          let fmt = null;

          // Thử tìm định dạng theo chất lượng yêu cầu (144p, 240p, 360p, 480p, 720p, 1080p60)
          const cleanQ = requestedQuality.replace('60', '');
          try {
            fmt = info.chooseFormat({ type: 'video+audio', quality: cleanQ })
               || info.chooseFormat({ type: 'video+audio', quality: requestedQuality });
          } catch (e) {}

          // Fallback sang luồng video+audio tốt nhất hiện có
          if (!fmt) {
            try {
              fmt = info.chooseFormat({ type: 'video+audio' });
            } catch (e) {}
          }

          if (!fmt) {
            try {
              fmt = info.chooseFormat({ quality: cleanQ })
                 || info.chooseFormat({ quality: requestedQuality });
            } catch (e) {}
          }

          if (fmt) {
            const url = await fmt.decipher(yt.session.player);
            if (url) {
              format = { itag: fmt.itag, mime_type: fmt.mime_type };
              directUrl = url;
              successfulClient = client;
              streamUrlCache.set(cacheKey, {
                directUrl,
                format,
                client,
                expireAt: Date.now() + CACHE_TTL_MS
              });
              break;
            }
          }
        } catch (err) {
          // Thử client tiếp theo
        }
      }
    }

    console.log(`\n======================================================`);
    console.log(`📥 [REQ #${reqId}] STREAM: ${videoId} | 📹 VIDEO (${requestedQuality}) | Range: ${req.headers.range || 'Full'}`);

    if (!directUrl || !format) {
      console.error(`💥 [REQ #${reqId}] Không tìm thấy format stream hoặc giải mã thất bại`);
      return res.status(404).send('Không tìm thấy định dạng stream phù hợp');
    }

    console.log(`✅ [REQ #${reqId}] Đã chọn client [${successfulClient}] | itag=${format.itag} | mime=${format.mime_type}`);

    const requestHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Accept-Encoding': 'identity;q=1, *;q=0',
      'Accept-Language': 'en-US,en;q=0.9'
    };

    if (req.headers.range) {
      requestHeaders['Range'] = req.headers.range;
    }

    const ytResponse = await fetch(directUrl, { headers: requestHeaders });

    if (ytResponse.status === 403) {
      console.warn(`⚠️ [REQ #${reqId}] CDN trả về 403 Forbidden`);
      streamUrlCache.delete(cacheKey);
      return res.status(403).send('YouTube CDN chặn truy cập (403 Forbidden)');
    }

    res.status(ytResponse.status);

    const forwardHeaders = ['content-type', 'content-length', 'content-range', 'accept-ranges'];
    forwardHeaders.forEach((h) => {
      const val = ytResponse.headers.get(h);
      if (val) res.setHeader(h, val);
    });

    if (!res.getHeader('accept-ranges')) {
      res.setHeader('Accept-Ranges', 'bytes');
    }

    if (!res.getHeader('content-type')) {
      res.setHeader('Content-Type', format.mime_type || 'video/mp4');
    }

    if (ytResponse.body) {
      const nodeStream = Readable.fromWeb(ytResponse.body);
      nodeStream.pipe(res);

      req.on('close', () => {
        nodeStream.destroy();
      });

      nodeStream.on('error', (err) => {
        console.error(`[REQ #${reqId}] [Stream Error]`, err.message);
      });
    } else {
      res.end();
    }
  } catch (error) {
    console.error(`💥 [REQ #${reqId}] [Relay Error]`, error.message);
    if (!res.headersSent) {
      res.status(500).send('Không thể stream video: ' + error.message);
    }
  }
});

app.listen(PORT, async () => {
  console.log(`====================================================`);
  console.log(`🚀 Jira Workspace Relay đang chạy tại: http://localhost:${PORT}`);
  console.log(`   - Mở trình duyệt truy cập: http://localhost:${PORT}`);
  console.log(`   - Không gian làm việc Jira Dashboard sẵn sàng`);
  console.log(`====================================================`);

  // Tiền khởi tạo instance trong nền
  try {
    await getYouTubeClient();
  } catch (err) {
    console.warn('[Cảnh báo] Khởi tạo nền chưa xong, sẽ thử lại khi có request:', err.message);
  }
});
