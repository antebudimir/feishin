import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { api } from '/@/renderer/api';
import { FeatureCarousel } from '/@/renderer/components/feature-carousel/feature-carousel';
import { MemoizedSwiperGridCarousel } from '/@/renderer/components/grid-carousel/grid-carousel';
import { NativeScrollArea } from '/@/renderer/components/native-scroll-area/native-scroll-area';
import { albumQueries } from '/@/renderer/features/albums/api/album-api';
import { homeQueries } from '/@/renderer/features/home/api/home-api';
import { AnimatedPage } from '/@/renderer/features/shared/components/animated-page';
import { LibraryHeaderBar } from '/@/renderer/features/shared/components/library-header-bar';
import { songsQueries } from '/@/renderer/features/songs/api/songs-api';
import { AppRoute } from '/@/renderer/router/routes';
import {
    HomeItem,
    useCurrentServer,
    useGeneralSettings,
    useWindowSettings,
} from '/@/renderer/store';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Group } from '/@/shared/components/group/group';
import { Icon } from '/@/shared/components/icon/icon';
import { Spinner } from '/@/shared/components/spinner/spinner';
import { Stack } from '/@/shared/components/stack/stack';
import { TextTitle } from '/@/shared/components/text-title/text-title';
import {
    Album,
    AlbumListResponse,
    AlbumListSort,
    LibraryItem,
    ServerType,
    SongListSort,
    SortOrder,
} from '/@/shared/types/domain-types';
import { Platform } from '/@/shared/types/types';

const BASE_QUERY_ARGS = {
    limit: 30,
    sortOrder: SortOrder.DESC,
    startIndex: 0,
};

const HomeRoute = () => {
    const { t } = useTranslation();
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const server = useCurrentServer();
    const { windowBarStyle } = useWindowSettings();
    const { homeFeature, homeItems } = useGeneralSettings();

    const feature = useQuery(
        albumQueries.list({
            options: {
                enabled: homeFeature,
                gcTime: 1000 * 60,
                staleTime: 1000 * 60,
            },
            query: {
                limit: 20,
                sortBy: AlbumListSort.RANDOM,
                sortOrder: SortOrder.DESC,
                startIndex: 0,
            },
            serverId: server?.id,
        }),
    );

    const isJellyfin = server?.type === ServerType.JELLYFIN;

    const featureItemsWithImage = useMemo(() => {
        return feature.data?.items?.filter((item) => item.imageUrl) ?? [];
    }, [feature.data?.items]);

    const queriesEnabled = useMemo(() => {
        return homeItems.reduce(
            (previous: Record<HomeItem, boolean>, current) => ({
                ...previous,
                [current.id]: !current.disabled,
            }),
            {} as Record<HomeItem, boolean>,
        );
    }, [homeItems]);

    const random = useQuery(
        albumQueries.list({
            options: {
                staleTime: 1000 * 60 * 5,
            },
            query: {
                ...BASE_QUERY_ARGS,
                sortBy: AlbumListSort.RANDOM,
                sortOrder: SortOrder.ASC,
                startIndex: 0,
            },
            serverId: server?.id,
        }),
    );

    const recentlyPlayed = useQuery(
        homeQueries.recentlyPlayed({
            options: {
                staleTime: 0,
            },
            query: {
                ...BASE_QUERY_ARGS,
                sortBy: AlbumListSort.RECENTLY_PLAYED,
                sortOrder: SortOrder.DESC,
                startIndex: 0,
            },
            serverId: server?.id,
        }),
    );

    const recentlyAdded = useQuery(
        albumQueries.list({
            options: {
                staleTime: 1000 * 60 * 5,
            },
            query: {
                ...BASE_QUERY_ARGS,
                sortBy: AlbumListSort.RECENTLY_ADDED,
                sortOrder: SortOrder.DESC,
                startIndex: 0,
            },
            serverId: server?.id,
        }),
    );

    const mostPlayedAlbums = useQuery(
        albumQueries.list({
            options: {
                enabled:
                    server?.type === ServerType.SUBSONIC || server?.type === ServerType.NAVIDROME,
                staleTime: 1000 * 60 * 5,
            },
            query: {
                ...BASE_QUERY_ARGS,
                sortBy: AlbumListSort.PLAY_COUNT,
                sortOrder: SortOrder.DESC,
                startIndex: 0,
            },
            serverId: server?.id,
        }),
    );

    const mostPlayedSongs = useQuery(
        songsQueries.list(
            {
                options: {
                    enabled: server?.type === ServerType.JELLYFIN,
                    staleTime: 1000 * 60 * 5,
                },
                query: {
                    ...BASE_QUERY_ARGS,
                    sortBy: SongListSort.PLAY_COUNT,
                    sortOrder: SortOrder.DESC,
                    startIndex: 0,
                },
                serverId: server?.id,
            },
            300,
        ),
    );

    const recentlyReleased = useQuery(
        albumQueries.list({
            options: {
                enabled: queriesEnabled[HomeItem.RECENTLY_RELEASED],
                staleTime: 1000 * 60 * 5,
            },
            query: {
                ...BASE_QUERY_ARGS,
                sortBy: AlbumListSort.RELEASE_DATE,
            },
            serverId: server?.id,
        }),
    );

    const starredAlbums = useQuery(
        albumQueries.list({
            options: {
                enabled: queriesEnabled[HomeItem.STARRED_ALBUMS],
                staleTime: 1000 * 60 * 5,
            },
            query: {
                ...BASE_QUERY_ARGS,
                favorite: true,
                sortBy: AlbumListSort.FAVORITED,
                sortOrder: SortOrder.DESC,
            },
            serverId: server?.id,
        }),
    );

    const starredTracks = useQuery(
        songsQueries.list(
            {
                options: {
                    enabled: queriesEnabled[HomeItem.STARRED_TRACKS],
                    staleTime: 1000 * 60 * 5,
                },
                query: {
                    ...BASE_QUERY_ARGS,
                    favorite: true,
                    sortBy: SongListSort.FAVORITED,
                    sortOrder: SortOrder.DESC,
                },
                serverId: server?.id,
            },
            300,
        ),
    );

    // Flashback: Get a random decade from the past
    // Pre-compute which decades have albums to avoid empty queries
    const [flashbackSeed, setFlashbackSeed] = useState(0);
    const [hasFlashbackLoaded, setHasFlashbackLoaded] = useState(false);

    // Get all available decades with albums
    const availableDecades = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const currentDecade = Math.floor(currentYear / 10) * 10;
        const minDecade = 1920;
        const decades: Array<{ decade: number; maxYear: number; minYear: number }> = [];

        for (let decade = minDecade; decade <= currentDecade; decade += 10) {
            decades.push({
                decade,
                maxYear: decade + 9,
                minYear: decade,
            });
        }

        return decades;
    }, []);

    // Get count for each decade
    const decadeQueries = useQuery({
        enabled: queriesEnabled[HomeItem.FLASHBACK] && !!server?.id,
        queryFn: async () => {
            if (!server?.id) return [];

            const promises = availableDecades.map(async ({ decade, maxYear, minYear }) => {
                try {
                    const count = await api.controller.getAlbumListCount({
                        apiClientProps: { serverId: server.id },
                        query: {
                            maxYear,
                            minYear,
                            sortBy: AlbumListSort.RANDOM,
                            sortOrder: SortOrder.ASC,
                        },
                    });
                    return { count, decade, hasAlbums: count > 0 };
                } catch (error) {
                    console.error(`Error checking decade ${decade}s:`, error);
                    return { count: 0, decade, hasAlbums: false };
                }
            });

            const results = await Promise.all(promises);
            return results.filter((r) => r.hasAlbums);
        },
        queryKey: ['flashback-decades', server?.id],
        staleTime: 1000 * 60 * 30, // Cache for 30 minutes
    });

    // Get a random decade from available ones
    const { flashbackDecade, flashbackMaxYear, flashbackMinYear } = useMemo(() => {
        if (decadeQueries.data && decadeQueries.data.length > 0) {
            const randomIndex = Math.floor(Math.random() * decadeQueries.data.length);
            const selectedDecade = decadeQueries.data[randomIndex];
            return {
                flashbackDecade: selectedDecade.decade,
                flashbackMaxYear: selectedDecade.decade + 9,
                flashbackMinYear: selectedDecade.decade,
            };
        }

        // Fallback to current decade if no data yet
        const currentYear = new Date().getFullYear();
        const currentDecade = Math.floor(currentYear / 10) * 10;
        return {
            flashbackDecade: currentDecade,
            flashbackMaxYear: currentDecade + 9,
            flashbackMinYear: currentDecade,
        };
        // flashbackSeed is intentionally included to force re-computation on refresh
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [decadeQueries.data, flashbackSeed]);

    const flashback = useQuery<AlbumListResponse>({
        enabled:
            queriesEnabled[HomeItem.FLASHBACK] &&
            decadeQueries.data &&
            decadeQueries.data.length > 0 &&
            !!server?.id,
        gcTime: 1000 * 60 * 5,
        placeholderData: (): AlbumListResponse => {
            // Create placeholder data with correct structure but empty items
            // This prevents UI jumping while avoiding cross-decade cache contamination
            return {
                items: Array(BASE_QUERY_ARGS.limit)
                    .fill(null)
                    .map((_, index) => ({
                        albumArtist: '',
                        albumArtists: [], // Required for card rows
                        artists: [],
                        backdropImageUrl: null,
                        comment: null,
                        createdAt: '',
                        duration: null,
                        explicitStatus: null,
                        genres: [],
                        id: `placeholder-${flashbackSeed}-${index}`,
                        imagePlaceholderUrl: null,
                        imageUrl: null,
                        isCompilation: null,
                        itemType: LibraryItem.ALBUM,
                        lastPlayedAt: null,
                        mbzId: null,
                        name: '',
                        originalDate: null,
                        participants: null,
                        playCount: null,
                        recordLabels: [],
                        releaseDate: null,
                        releaseTypes: [],
                        releaseYear: null,
                        serverId: server?.id || '',
                        serverType: server?.type || ServerType.JELLYFIN,
                        size: null,
                        songCount: null,
                        tags: null,
                        uniqueId: `placeholder-${flashbackSeed}-${index}`,
                        updatedAt: '',
                        userFavorite: false,
                        userRating: null,
                        version: null,
                    })) as Album[],
                startIndex: 0,
                totalRecordCount: 0,
            };
        },
        queryFn: ({ signal }) => {
            const result = api.controller.getAlbumList({
                apiClientProps: { serverId: server?.id, signal },
                query: {
                    ...BASE_QUERY_ARGS,
                    maxYear: flashbackMaxYear,
                    minYear: flashbackMinYear,
                    sortBy: AlbumListSort.RANDOM,
                    sortOrder: SortOrder.ASC,
                },
            });
            result.then((data) => {
                console.log(
                    `[Flashback] Fetched ${data.items?.length || 0} albums for ${flashbackDecade}s (seed: ${flashbackSeed})`,
                );
            });
            return result;
        },
        queryKey: [
            'albums',
            'list',
            server?.id,
            {
                ...BASE_QUERY_ARGS,
                _flashbackSeed: flashbackSeed, // Force unique cache key
                maxYear: flashbackMaxYear,
                minYear: flashbackMinYear,
                sortBy: AlbumListSort.RANDOM,
                sortOrder: SortOrder.ASC,
            },
        ],
        staleTime: 0, // Force fresh data every time to prevent cross-decade caching
    });

    // Track when Flashback has successfully loaded at least once
    useEffect(() => {
        if (flashback.data && !hasFlashbackLoaded) {
            setHasFlashbackLoaded(true);
        }
    }, [flashback.data, hasFlashbackLoaded]);

    // Only show flashback if we have decades with albums
    const shouldShowFlashback = decadeQueries.data && decadeQueries.data.length > 0;

    // Only show full-page spinner on initial load, not on refetch
    const isInitialLoading =
        (random.isLoading && !random.data && queriesEnabled[HomeItem.RANDOM]) ||
        (recentlyPlayed.isLoading &&
            !recentlyPlayed.data &&
            queriesEnabled[HomeItem.RECENTLY_PLAYED] &&
            !isJellyfin) ||
        (recentlyAdded.isLoading &&
            !recentlyAdded.data &&
            queriesEnabled[HomeItem.RECENTLY_ADDED]) ||
        (recentlyReleased.isLoading &&
            !recentlyReleased.data &&
            queriesEnabled[HomeItem.RECENTLY_RELEASED]) ||
        (starredAlbums.isLoading &&
            !starredAlbums.data &&
            queriesEnabled[HomeItem.STARRED_ALBUMS]) ||
        (starredTracks.isLoading &&
            !starredTracks.data &&
            queriesEnabled[HomeItem.STARRED_TRACKS]) ||
        (flashback.isLoading && !hasFlashbackLoaded && queriesEnabled[HomeItem.FLASHBACK]) ||
        (((isJellyfin && mostPlayedSongs.isLoading && !mostPlayedSongs.data) ||
            (!isJellyfin && mostPlayedAlbums.isLoading && !mostPlayedAlbums.data)) &&
            queriesEnabled[HomeItem.MOST_PLAYED]);

    if (isInitialLoading) {
        return <Spinner container />;
    }

    const carousels: Record<HomeItem, any> = {
        [HomeItem.FLASHBACK]: {
            data: flashback?.data?.items,
            itemType: LibraryItem.ALBUM,
            onRefresh: () => {
                // Incrementing seed changes query key, which automatically triggers a new fetch
                setFlashbackSeed((prev) => prev + 1);
            },
            query: flashback,
            title: `${t('page.home.flashback', { postProcess: 'sentenceCase' })} - ${flashbackDecade}s`,
        },
        [HomeItem.MOST_PLAYED]: {
            data: isJellyfin ? mostPlayedSongs?.data?.items : mostPlayedAlbums?.data?.items,
            itemType: isJellyfin ? LibraryItem.SONG : LibraryItem.ALBUM,
            query: isJellyfin ? mostPlayedSongs : mostPlayedAlbums,
            title: t('page.home.mostPlayed', { postProcess: 'sentenceCase' }),
        },
        [HomeItem.RANDOM]: {
            data: random?.data?.items,
            itemType: LibraryItem.ALBUM,
            query: random,
            title: t('page.home.explore', { postProcess: 'sentenceCase' }),
        },
        [HomeItem.RECENTLY_ADDED]: {
            data: recentlyAdded?.data?.items,
            itemType: LibraryItem.ALBUM,
            query: recentlyAdded,
            title: t('page.home.newlyAdded', { postProcess: 'sentenceCase' }),
        },
        [HomeItem.RECENTLY_PLAYED]: {
            data: recentlyPlayed?.data?.items,
            itemType: LibraryItem.ALBUM,
            query: recentlyPlayed,
            title: t('page.home.recentlyPlayed', { postProcess: 'sentenceCase' }),
        },
        [HomeItem.RECENTLY_RELEASED]: {
            data: recentlyReleased?.data?.items,
            itemType: LibraryItem.ALBUM,
            query: recentlyReleased,
            title: t('page.home.recentlyReleased', { postProcess: 'sentenceCase' }),
        },
        [HomeItem.STARRED_ALBUMS]: {
            data: starredAlbums?.data?.items,
            itemType: LibraryItem.ALBUM,
            query: starredAlbums,
            title: t('page.home.starredAlbums', { postProcess: 'sentenceCase' }),
        },
        [HomeItem.STARRED_TRACKS]: {
            data: starredTracks?.data?.items,
            itemType: LibraryItem.SONG,
            query: starredTracks,
            title: t('page.home.starredTracks', { postProcess: 'sentenceCase' }),
        },
    };

    const sortedCarousel = homeItems
        .filter((item) => {
            if (item.disabled) {
                return false;
            }
            if (isJellyfin && item.id === HomeItem.RECENTLY_PLAYED) {
                return false;
            }
            // Don't show flashback carousel if it has no data
            if (item.id === HomeItem.FLASHBACK && !shouldShowFlashback) {
                return false;
            }

            return true;
        })
        .map((item) => ({
            ...carousels[item.id],
            uniqueId: item.id,
        }));

    return (
        <AnimatedPage>
            <NativeScrollArea
                pageHeaderProps={{
                    children: (
                        <LibraryHeaderBar>
                            <LibraryHeaderBar.Title>
                                {t('page.home.title', { postProcess: 'titleCase' })}
                            </LibraryHeaderBar.Title>
                        </LibraryHeaderBar>
                    ),
                    offset: 200,
                }}
                ref={scrollAreaRef}
            >
                <Stack
                    gap="lg"
                    mb="5rem"
                    pt={windowBarStyle === Platform.WEB ? '5rem' : '3rem'}
                    px="2rem"
                >
                    {homeFeature && <FeatureCarousel data={featureItemsWithImage} />}
                    {sortedCarousel.map((carousel) => (
                        <MemoizedSwiperGridCarousel
                            cardRows={[
                                {
                                    property: 'name',
                                    route: {
                                        route: AppRoute.LIBRARY_ALBUMS_DETAIL,
                                        slugs: [
                                            {
                                                idProperty:
                                                    isJellyfin &&
                                                    carousel.itemType === LibraryItem.SONG
                                                        ? 'albumId'
                                                        : 'id',
                                                slugProperty: 'albumId',
                                            },
                                        ],
                                    },
                                },
                                {
                                    arrayProperty: 'name',
                                    property: 'albumArtists',
                                    route: {
                                        route: AppRoute.LIBRARY_ALBUM_ARTISTS_DETAIL,
                                        slugs: [
                                            {
                                                idProperty: 'id',
                                                slugProperty: 'albumArtistId',
                                            },
                                        ],
                                    },
                                },
                            ]}
                            data={carousel.data}
                            itemType={carousel.itemType}
                            key={`carousel-${carousel.uniqueId}`}
                            route={{
                                route: AppRoute.LIBRARY_ALBUMS_DETAIL,
                                slugs: [
                                    {
                                        idProperty:
                                            isJellyfin && carousel.itemType === LibraryItem.SONG
                                                ? 'albumId'
                                                : 'id',
                                        slugProperty: 'albumId',
                                    },
                                ],
                            }}
                            title={{
                                label: (
                                    <Group>
                                        <TextTitle order={3}>{carousel.title}</TextTitle>
                                        <ActionIcon
                                            onClick={() =>
                                                'onRefresh' in carousel
                                                    ? carousel.onRefresh()
                                                    : carousel.query.refetch()
                                            }
                                            variant="transparent"
                                        >
                                            <Icon icon="refresh" />
                                        </ActionIcon>
                                    </Group>
                                ),
                            }}
                            uniqueId={carousel.uniqueId}
                        />
                    ))}
                </Stack>
            </NativeScrollArea>
        </AnimatedPage>
    );
};

export default HomeRoute;
