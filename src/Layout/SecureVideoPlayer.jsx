import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { Check, Maximize, Minimize, Pause, Play, RotateCw, Settings, ShieldAlert, Volume2, VolumeX } from 'lucide-react';

const WATERMARK_MIN = 5;
const WATERMARK_MAX = 85;

export function SecureVideoPlayer({
  streamUrl,
  studentIdentifier,
  posterUrl,
  autoplay = false,
  muted = false,
  clipPath = 'none',
}) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);

  // States
  const [watermarkPos, setWatermarkPos] = useState({ top: '15%', left: '15%' });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volumeLevel, setVolumeLevel] = useState(muted ? 0 : 1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [shieldReason, setShieldReason] = useState(null);

  // --- Functions ---
  
  const togglePlay = useCallback(() => {
    if (videoRef.current?.paused) videoRef.current.play();
    else videoRef.current?.pause();
  }, []);

  const toggleMute = () => {
    if (videoRef.current) {
      const isMuted = !videoRef.current.muted;
      videoRef.current.muted = isMuted;
      setVolumeLevel(isMuted ? 0 : videoRef.current.volume || 1);
    }
  };

  const handleSeek = (amount) => {
    if (videoRef.current) videoRef.current.currentTime += amount;
  };

  const changePlaybackRate = (rate) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
      setShowSettings(false);
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
    }
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => console.error(err));
    } else {
      document.exitFullscreen();
    }
  };

  // --- Effects ---

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) return;

    let hls;
    if (Hls.isSupported() && streamUrl.includes('.m3u8')) {
      hls = new Hls();
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl;
    } else {
      video.src = streamUrl;
    }

    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);

    return () => {
      hls?.destroy();
      document.removeEventListener('fullscreenchange', handleFsChange);
    };
  }, [streamUrl]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (document.activeElement.tagName === 'INPUT') return;
      switch(e.key.toLowerCase()) {
        case ' ': case 'k': e.preventDefault(); togglePlay(); break;
        case 'f': e.preventDefault(); toggleFullScreen(); break;
        case 'm': e.preventDefault(); toggleMute(); break;
        case 'arrowright': handleSeek(5); break;
        case 'arrowleft': handleSeek(-5); break;
        case 'l': handleSeek(10); break;
        case 'j': handleSeek(-10); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay]);

  useEffect(() => {
    const interval = setInterval(() => {
      setWatermarkPos({
        top: `${Math.random() * (WATERMARK_MAX - WATERMARK_MIN) + WATERMARK_MIN}%`,
        left: `${Math.random() * (WATERMARK_MAX - WATERMARK_MIN) + WATERMARK_MIN}%`,
      });
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (time) => {
    const s = Math.floor(time % 60);
    const m = Math.floor((time / 60) % 60);
    const h = Math.floor(time / 3600);
    const pad = (n) => String(n).padStart(2, '0');
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
  };


  return (
    <div
      ref={containerRef}
      className={`yt-player-container svp ${!showControls && isPlaying ? 'hide-cursor cursor-none' : ''}`}
      onMouseMove={handleMouseMove}
      onContextMenu={(e) => e.preventDefault()}
      style={{ clipPath, boxShadow: 'none' }}
    >
      {/* Player chrome only (MathPortal look): white progress fill, brand thumb, icon buttons */}
      <style>{`
        .svp .yt-range { cursor: pointer; background: linear-gradient(to right, #fff var(--progress, 0%), rgba(255,255,255,.25) var(--progress, 0%)); }
        .svp .yt-range::-webkit-slider-thumb { background: #fff; box-shadow: 0 0 0 3px rgba(125,10,10,.85); }
        .svp .yt-range::-moz-range-thumb { height: 13px; width: 13px; border: 0; border-radius: 50%; background: #fff; box-shadow: 0 0 0 3px rgba(125,10,10,.85); cursor: pointer; }
        .svp .volume-slider { accent-color: #fff; }
        .svp .control-btn { display: inline-flex; align-items: center; justify-content: center; border-radius: .6rem; }
        .svp .control-btn:hover { transform: none; background: rgba(255,255,255,.12); }
      `}</style>

      <video
        ref={videoRef}
        className="main-video"
        poster={posterUrl}
        playsInline
        autoPlay={autoplay}
        onTimeUpdate={() => setCurrentTime(videoRef.current.currentTime)}
        onLoadedMetadata={() => setDuration(videoRef.current.duration)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onClick={togglePlay}
        onDoubleClick={toggleFullScreen}
      />

      {/* Watermark */}
      <div
        className="watermark absolute z-[5] pointer-events-none select-none text-white/40 text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-1000"
        style={{ top: watermarkPos.top, left: watermarkPos.left, textShadow: '0 1px 2px rgba(0,0,0,.5)' }}
      >
        {studentIdentifier}
      </div>

      {/* Controls */}
      <div className={`controls-overlay ${showControls || !isPlaying ? 'visible' : ''}`}>

        {/* Progress bar */}
        <div className="progress-container">
          <input
            type="range"
            className="yt-range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={currentTime}
            onChange={(e) => (videoRef.current.currentTime = e.target.value)}
            style={{ '--progress': `${(currentTime / (duration || 1)) * 100}%` }}
            aria-label="Seek"
          />
        </div>

        <div className="bottom-controls gap-2">
          <div className="left-side flex items-center gap-1 min-w-0">
            <button className="control-btn" onClick={togglePlay} title="Play/Pause (k)" aria-label={isPlaying ? 'Pause' : 'Play'}>
              {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
            </button>
            <button className="control-btn !text-xs font-bold" onClick={() => handleSeek(10)} title="Forward 10s (l)">
              <RotateCw size={16} className="mr-1" /> 10s
            </button>
            <div className="volume-wrapper flex items-center gap-1">
              <button className="control-btn" onClick={toggleMute} title="Mute (m)" aria-label={volumeLevel === 0 ? 'Unmute' : 'Mute'}>
                {volumeLevel === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              <input
                type="range"
                min="0" max="1" step="0.1"
                value={volumeLevel}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  videoRef.current.volume = val;
                  videoRef.current.muted = val === 0;
                  setVolumeLevel(val);
                }}
                className="volume-slider w-16 sm:w-20 h-1 cursor-pointer hidden sm:block"
                aria-label="Volume"
              />
            </div>
            <span className="time-display whitespace-nowrap tabular-nums">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="right-side flex items-center gap-1 shrink-0">
            <div className="settings-wrapper relative">
              <button className="control-btn" onClick={() => setShowSettings(!showSettings)} title="Playback speed" aria-label="Playback speed">
                <Settings size={19} />
              </button>
              {showSettings && (
                <div className="settings-menu absolute bottom-full right-0 mb-2 w-40 bg-gray-900/95 border border-white/10 rounded-xl p-1.5 shadow-2xl z-20">
                  <p className="px-2.5 pt-1 pb-1.5 text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Playback speed</p>
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map(rate => (
                    <button
                      key={rate}
                      onClick={() => changePlaybackRate(rate)}
                      className={`${playbackRate === rate ? 'active bg-white/15 text-white' : 'text-gray-300 hover:bg-white/10'} w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-sm font-semibold`}
                    >
                      {rate === 1 ? 'Normal' : `${rate}x`}
                      {playbackRate === rate && <Check size={14} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button className="control-btn" onClick={toggleFullScreen} title="Fullscreen (f)" aria-label="Fullscreen">
              {isFullscreen ? <Minimize size={19} /> : <Maximize size={19} />}
            </button>
          </div>
        </div>
      </div>

      {/* Protection notice when focus is lost */}
      {shieldReason && (
        <div className="shield-active absolute inset-0 z-30 bg-gray-950/90 flex items-center justify-center p-4">
          <div className="shield-content bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center">
            <span className="mx-auto mb-3 w-11 h-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <ShieldAlert size={22} />
            </span>
            <p className="font-bold text-gray-800">Protection mode is on</p>
            <span className="block text-sm text-gray-500 mt-1">The video was paused because you left the page or tried to record the screen.</span>
            <button onClick={() => setShieldReason(null)} className="dismiss-btn a-btn primary w-full mt-4">Continue watching</button>
          </div>
        </div>
      )}
    </div>
  );
}
