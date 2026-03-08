// Empty shim for fluent-ffmpeg
// The actual fluent-ffmpeg will be provided by Almostnode at runtime

function ffmpeg() {
  return {
    input: () => ffmpeg(),
    inputOptions: () => ffmpeg(),
    output: () => ffmpeg(),
    outputOptions: () => ffmpeg(),
    size: () => ffmpeg(),
    fps: () => ffmpeg(),
    aspect: () => ffmpeg(),
    autopad: () => ffmpeg(),
    noAudio: () => ffmpeg(),
    on: () => ffmpeg(),
    run: () => {},
    mergeToFile: () => {},
    setFfmpegPath: () => {},
    setFfprobePath: () => {},
    ffprobe: () => {},
  };
}

ffmpeg.setFfmpegPath = () => {};
ffmpeg.setFfprobePath = () => {};
ffmpeg.ffprobe = () => {};

module.exports = ffmpeg;