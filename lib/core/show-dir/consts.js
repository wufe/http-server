const PLAYLIST_FILENAME = 'Play media with IINA';

const get_playlist_stats = (size = 999) => ({
    isDirectory: () => true,
    mode: 511,
    mtime: Date.now(),
    isSpecial: true,
    ino: 1,
    size,
});

module.exports = {
    PLAYLIST_FILENAME,
    get_playlist_stats,
};