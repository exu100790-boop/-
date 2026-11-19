mascot-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 14px;
  cursor: pointer;
  user-select: none;
}

.speech-bubble {
  background: #fff0f6;
  color: #a61e4d;
  border: 1.5px solid #fcc2d7;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 700;
  margin-bottom: 8px;
  box-shadow: 0 4px 10px rgba(214, 51, 132, 0.08);
  transition: transform 0.2s ease;
}

.mascot-frame {
  width: 100%;
  max-height: 185px;
  border-radius: 14px;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
  animation: kuromiFloat 2.8s ease-in-out infinite;
  transform-origin: center bottom;
}

.mascot-frame img {
  width: 100%;
  height: 185px;
  object-fit: cover;
  border-radius: 14px;
  border: 2px solid #f3d9fa;
}

/* 平時輕輕浮動微搖 */
@keyframes kuromiFloat {
  0%, 100% {
    transform: translateY(0px) rotate(-1deg);
  }
  50% {
    transform: translateY(-6px) rotate(1.2deg);
  }
}

/* 蓋章或點擊時的開心彈跳 */
.mascot-frame.cheer {
  animation: kuromiCheer 0.55s cubic-bezier(0.28, 1.45, 0.42, 1);
}

@keyframes kuromiCheer {
  0%   { transform: scale(1) translateY(0); }
  35%  { transform: scale(1.06, 0.94) translateY(-12px) rotate(-3deg); }
  65%  { transform: scale(0.97, 1.03) translateY(-4px) rotate(3deg); }
  100% { transform: scale(1) translateY(0) rotate(0deg); }
}

/* 備用小庫洛米眨眼動畫 */
#svgKuromi .eye {
  transform-origin: center;
  animation: eyeBlink 3.6s infinite;
}

@keyframes eyeBlink {
  0%, 92%, 100% { transform: scaleY(1); }
  95%           { transform: scaleY(0.1); }
}
