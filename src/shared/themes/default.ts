import { AppThemeConfiguration } from './app-theme-types';

export const defaultTheme: AppThemeConfiguration = {
    app: {
        'overlay-header':
            'linear-gradient(transparent 0%, rgb(0 0 0 / 85%) 100%), var(--theme-background-noise)',
        'overlay-subheader':
            'linear-gradient(180deg, rgb(0 0 0 / 5%) 0%, var(--theme-colors-background) 100%), var(--theme-background-noise)',
        'root-font-size': '16px',
        'scrollbar-handle-active-background': 'rgba(255, 142, 83, 0.7)',
        'scrollbar-handle-background': 'rgba(255, 142, 83, 0.4)',
        'scrollbar-handle-border-radius': '0.3rem',
        'scrollbar-handle-hover-background': 'rgba(255, 142, 83, 0.9)',
        'scrollbar-size': '12px',
        'scrollbar-track-active-background': 'transparent',
        'scrollbar-track-background': 'transparent',
        'scrollbar-track-border-radius': '0',
        'scrollbar-track-hover-background': 'transparent',
    },
    colors: {
        background: 'rgb(2, 26, 26)',
        'background-alternate': 'rgb(19, 16, 16)',
        black: 'rgb(0, 0, 0)',
        foreground: 'rgb(240, 240, 240)',
        'foreground-muted': 'rgb(187, 187, 187)',
        primary: 'rgb(255, 142, 83)',
        'state-error': 'rgb(255, 0, 0)',
        'state-info': 'rgb(0, 183, 255)',
        'state-success': 'rgb(0, 255, 255)',
        'state-warning': 'rgb(255, 142, 83)',
        surface: 'rgba(2, 26, 26, 0.8)',
        'surface-foreground': 'rgb(240, 240, 240)',
        white: 'rgb(255, 255, 255)',
    },
    mode: 'dark',
};
