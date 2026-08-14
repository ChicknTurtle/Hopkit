
export const AudioPlayer = {
  ctx: null,
  sounds: {},
  instances: new Map(),
  masterGain: null,
  nextInstanceId: 1,
};

AudioPlayer._ensureContext = function () {
  if (!AudioPlayer.ctx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    AudioPlayer.ctx = new Ctx();
    AudioPlayer.masterGain = AudioPlayer.ctx.createGain();
    AudioPlayer.masterGain.connect(AudioPlayer.ctx.destination);
  }
  if (AudioPlayer.ctx.state === 'suspended') {
    AudioPlayer.ctx.resume().catch(() => {});
  }
  return AudioPlayer.ctx;
};

AudioPlayer.setMasterVolume = function (volume) {
  AudioPlayer._ensureContext();
  AudioPlayer.masterGain.gain.value = volume;
};

AudioPlayer.loadSound = async function (name, src, meta = {}) {
  const ctx = AudioPlayer._ensureContext();

  const response = await fetch(src);
  if (!response.ok) {
    throw new Error(`AudioPlayer: failed to fetch "${src}" (${response.status})`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

  AudioPlayer.sounds[name] = {
    buffer: audioBuffer,
    meta: { src, ...meta },
  };

  return audioBuffer;
};

AudioPlayer.getMeta = function (name) {
  return AudioPlayer.sounds[name]?.meta;
};

AudioPlayer.playSound = function (name, options = {}) {
  const soundData = AudioPlayer.sounds[name];
  if (!soundData) {
    console.warn(`AudioPlayer: sound "${name}" is not loaded`);
    return null;
  }

  const ctx = AudioPlayer._ensureContext();
  const {
    volume = 1.0,
    playbackRate = 1.0,
    pan = 0,
    loop = false,
    offset = 0,
    duration,
    fadeIn = 0,
    tag,
    onEnded,
  } = options;

  const source = ctx.createBufferSource();
  source.buffer = soundData.buffer;
  source.loop = loop;
  source.playbackRate.value = playbackRate;

  const gainNode = ctx.createGain();
  const now = ctx.currentTime;
  if (fadeIn > 0) {
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(volume, now + fadeIn);
  } else {
    gainNode.gain.value = volume;
  }

  const pannerNode = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  if (pannerNode) pannerNode.pan.value = pan;

  source.connect(gainNode);
  if (pannerNode) {
    gainNode.connect(pannerNode);
    pannerNode.connect(AudioPlayer.masterGain);
  } else {
    gainNode.connect(AudioPlayer.masterGain);
  }

  const id = AudioPlayer.nextInstanceId++;

  const instance = {
    id,
    name,
    tag,
    source,
    gainNode,
    pannerNode,
    startedAt: now,
    stopped: false,
  };
  AudioPlayer.instances.set(id, instance);

  const cleanup = () => {
    if (!AudioPlayer.instances.has(id)) return;
    AudioPlayer.instances.delete(id);
    if (typeof onEnded === 'function' && !instance.stopped) {
      onEnded();
    }
  };
  source.onended = cleanup;

  if (duration !== undefined) {
    source.start(now, offset, duration);
  } else {
    source.start(now, offset);
  }

  const handle = {
    id,
    name,
    tag,
    stop(fadeOut = 0) {
      AudioPlayer._stopInstance(instance, fadeOut);
    },
    setVolume(v) {
      gainNode.gain.value = v;
    },
    setPlaybackRate(r) {
      source.playbackRate.value = r;
    },
  };

  return handle;
};

AudioPlayer._stopInstance = function (instance, fadeOut = 0) {
  if (instance.stopped) return;
  instance.stopped = true;

  const ctx = AudioPlayer.ctx;
  const { source, gainNode } = instance;

  try {
    if (fadeOut > 0 && ctx) {
      const now = ctx.currentTime;
      gainNode.gain.cancelScheduledValues(now);
      gainNode.gain.setValueAtTime(gainNode.gain.value, now);
      gainNode.gain.linearRampToValueAtTime(0, now + fadeOut);
      source.stop(now + fadeOut);
    } else {
      source.stop();
    }
  } catch (e) {
  }

  AudioPlayer.instances.delete(instance.id);
};

AudioPlayer.stopInstance = function (idOrHandle, fadeOut = 0) {
  const id = typeof idOrHandle === 'object' ? idOrHandle.id : idOrHandle;
  const instance = AudioPlayer.instances.get(id);
  if (!instance) return;
  AudioPlayer._stopInstance(instance, fadeOut);
};

AudioPlayer.stopSound = function (name, fadeOut = 0) {
  for (const instance of AudioPlayer.instances.values()) {
    if (instance.name === name) {
      AudioPlayer._stopInstance(instance, fadeOut);
    }
  }
};

AudioPlayer.stopTag = function (tag, fadeOut = 0) {
  for (const instance of AudioPlayer.instances.values()) {
    if (instance.tag === tag) {
      AudioPlayer._stopInstance(instance, fadeOut);
    }
  }
};

AudioPlayer.stopAll = function (fadeOut = 0) {
  for (const instance of Array.from(AudioPlayer.instances.values())) {
    AudioPlayer._stopInstance(instance, fadeOut);
  }
};
