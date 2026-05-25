import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';

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
      className={`yt-player-container ${!showControls && isPlaying ? 'hide-cursor' : ''}`}
      onMouseMove={handleMouseMove}
      onContextMenu={(e) => e.preventDefault()}
      style={{ clipPath }}
    >
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

      {/* العلامة المائية */}
      <div className="watermark" style={{ top: watermarkPos.top, left: watermarkPos.left }}>
        {studentIdentifier}
      </div>

      {/* واجهة التحكم */}
      <div className={`controls-overlay ${showControls || !isPlaying ? 'visible' : ''}`}>
        
        {/* شريط التقدم */}
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
          />
        </div>

        <div className="bottom-controls">
          <div className="left-side">
            <button className="control-btn" onClick={togglePlay} title="Play/Pause (k)">
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button className="control-btn" onClick={() => handleSeek(10)} title="Forward 10s">
              <span>+10s</span>
            </button>
            <div className="volume-wrapper">
              <button className="control-btn" onClick={toggleMute}>
                {volumeLevel === 0 ? '🔇' : '🔊'}
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
                className="volume-slider"
              />
            </div>
            <span className="time-display">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="right-side">
            <div className="settings-wrapper">
              <button className="control-btn" onClick={() => setShowSettings(!showSettings)} title="Settings">
                ⚙️
              </button>
              {showSettings && (
                <div className="settings-menu">
                  <p>السرعة (Playback Speed)</p>
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map(rate => (
                    <button 
                      key={rate} 
                      onClick={() => changePlaybackRate(rate)} 
                      className={playbackRate === rate ? 'active' : ''}
                    >
                      {rate === 1 ? 'Normal' : `${rate}x`}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button className="control-btn" onClick={toggleFullScreen} title="Fullscreen (f)">
              {isFullscreen ? '🔳' : '🔲'}
            </button>
          </div>
        </div>
      </div>

      {/* رسالة الحماية عند فقدان التركيز */}
      {shieldReason && (
        <div className="shield-active">
          <div className="shield-content">
            <p>⚠️ وضع الحماية نشط</p>
            <span>تم إيقاف الفيديو لأنك غادرت الصفحة أو تحاول التصوير.</span>
            <button onClick={() => setShieldReason(null)} className="dismiss-btn">إكمال المشاهدة</button>
          </div>
        </div>
      )}
    </div>
  );
}