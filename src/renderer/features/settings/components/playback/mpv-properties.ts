import type { SettingsState } from '/@/renderer/store/settings.store';

// Changing the `audio-channels` property mid-playback makes mpv reinitialize
// its audio chain, which pauses and restarts the current track. Use a `pan`
// audio filter instead, which applies seamlessly to the playing track.
const MONO_AUDIO_FILTER = 'lavfi=[pan=mono|c0=.5*c0+.5*c1]';
const STEREO_AUDIO_FILTER = 'lavfi=[pan=stereo|c0=c0|c1=c1]';

export const getAudioChannelsFilter = (value: unknown) =>
    value === 'mono' ? MONO_AUDIO_FILTER : STEREO_AUDIO_FILTER;

export const getMpvSetting = (
    key: keyof SettingsState['playback']['mpvProperties'],
    value: any,
) => {
    switch (key) {
        case 'audioChannels':
            return { af: getAudioChannelsFilter(value) };
        case 'audioExclusiveMode':
            return { 'audio-exclusive': value || 'no' };
        case 'audioSampleRateHz':
            return { 'audio-samplerate': value };
        case 'gaplessAudio':
            return { 'gapless-audio': value || 'weak' };
        case 'replayGainClip':
            return { 'replaygain-clip': value || 'no' };
        case 'replayGainFallbackDB':
            return { 'replaygain-fallback': value };
        case 'replayGainMode':
            return { replaygain: value || 'no' };
        case 'replayGainPreampDB':
            return { 'replaygain-preamp': value || 0 };
        default:
            return { 'audio-format': value };
    }
};

export const getMpvProperties = (settings: SettingsState['playback']['mpvProperties']) => {
    const properties: Record<string, any> = {
        af: getAudioChannelsFilter(settings.audioChannels),
        'audio-exclusive': settings.audioExclusiveMode || 'no',
        'audio-samplerate':
            settings.audioSampleRateHz === 0 ? undefined : settings.audioSampleRateHz,
        'gapless-audio': settings.gaplessAudio || 'weak',
        replaygain: settings.replayGainMode || 'no',
        'replaygain-clip': settings.replayGainClip || 'no',
        'replaygain-fallback': settings.replayGainFallbackDB,
        'replaygain-preamp': settings.replayGainPreampDB || 0,
    };

    Object.keys(properties).forEach((key) =>
        properties[key] === undefined ? delete properties[key] : {},
    );

    return properties;
};
