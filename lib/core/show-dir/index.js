'use strict';

const styles = require('./styles');
const lastModifiedToString = require('./last-modified-to-string');
const permsToString = require('./perms-to-string');
const sizeToString = require('./size-to-string');
const sortFiles = require('./sort-files');
const fs = require('fs');
const path = require('path');
const he = require('he');
const etag = require('../etag');
const url = require('url');
const status = require('../status-handlers');

const {PLAYLIST_FILENAME} = require('./consts');

const supportedIcons = styles.icons;
const css = styles.css;

module.exports = (opts) => {
  // opts are parsed by opts.js, defaults already applied
  const cache = opts.cache;
  const root = path.resolve(opts.root);
  const baseDir = opts.baseDir;
  const humanReadable = opts.humanReadable;
  const hidePermissions = opts.hidePermissions;
  const handleError = opts.handleError;
  const showDotfiles = opts.showDotfiles;
  const si = opts.si;
  const weakEtags = opts.weakEtags;
  const publicURL = opts.publicURL;

  return function middleware(req, res, next) {
    // Figure out the path for the file from the given url
    const parsed = url.parse(req.url);
    const pathname = decodeURIComponent(parsed.pathname);
    const dir = path.normalize(
      path.join(
        root,
        path.relative(
          path.join('/', baseDir),
          pathname
        )
      )
    );

    fs.stat(dir, (statErr, stat) => {
      if (statErr) {
        if (handleError) {
          status[500](res, next, { error: statErr });
        } else {
          next();
        }
        return;
      }

      // files are the listing of dir
      fs.readdir(dir, (readErr, _files) => {
        let files = _files;

        // files.push(PLAYLIST_FILENAME);

        if (readErr) {
          if (handleError) {
            status[500](res, next, { error: readErr });
          } else {
            next();
          }
          return;
        }

        // Optionally exclude dotfiles from directory listing.
        if (!showDotfiles) {
          files = files.filter(filename => filename.slice(0, 1) !== '.');
        }

        res.setHeader('content-type', 'text/html');
        res.setHeader('etag', etag(stat, weakEtags));
        res.setHeader('last-modified', (new Date(stat.mtime)).toUTCString());
        res.setHeader('cache-control', cache);

        function render(dirs, renderFiles, lolwuts) {
          // each entry in the array is a [name, stat] tuple

          let html = `${[
            '<!doctype html>',
            '<html>',
            '  <head>',
            '    <meta charset="utf-8">',
            '    <meta name="viewport" content="width=device-width">',
            `    <title>Index of ${he.encode(pathname)}</title>`,
            `    <style type="text/css">${css}</style>`,
            '  </head>',
            '  <body>',
            `<h1>Index of ${he.encode(pathname)}</h1>`,
          ].join('\n')}\n`;
          

          html += `<div style='display: flex; margin-bottom: 1rem; align-items: top'>
            <div style='margin-right: .6rem'>
            <?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="16px" height="16px" viewBox="0 0 16 16" enable-background="new 0 0 16 16" xml:space="preserve">  <image id="image0" width="16" height="16" x="0" y="0"
    href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAABGdBTUEAALGPC/xhBQAAACBjSFJN
AAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAACLlBMVEUAAAD////////m5ubO
zs7ExMTFxcXQ0NDo6Oi/v7+qqqr////v7+++vr7AwMDx8fH////////p6ekAAAAAAAAAABYAAADp
6enx8fEAAABAQDxAQ0UAAAD////CwsIGAEMhKjPs7O4AAAA1K5YeAAA7P0PU1NcyIabQzs7GxsgA
AAAzI6UAPUXBxMTFxcYyIKUAMzvAw8PR0dIuHKTLy8vm5ugsH5MwJCjg4OC7u7sAADG3t7f////n
5+kdHQwWEgAZAAAZEQAUIyodJyvm5ub////e3t4AAAHb29u1tbW0tLTi4uLd3d3FxcW4uLq4uLjF
xcXb29uXl5dubm5VVVVWVlZvb3CYmJitra4wMDgsLC2xsbGurq8AAAA6OTE2Lhc1Nzk5QkkAAA48
PGInKlYoNmMoQm0pJT4oAAA+Sk4rKiuQkI4wLLQpOKcmVLgXh+Qbi88kZYonHz5cXFo0LdsqQMwm
Xs4PnP8Duf8MvvMXq80ccIYzIDJucXI/P0A1L/AtQ94mX8oVnPcIu/8Dz/8B3f8A4/sjwc1RQ0Q9
PT4sQ94kXsoTnPgJuv8Gzv8B4P8A5fwhu8hQREVZWVYxKtonPsohW8wQnP4Gu/8Iv/QQpsgSan8t
LzxqbG2Li4krJrIdL6QcT7YQh+QQh8sVXIEVFDgPAACTk5MpKFIaHkoWJ1YTNGATDjAVAAAUBg8r
ODsiIySkpKSioqOio6KEhIRQUFAzMzIzMjKDg4P////0CQDvAAAAUnRSTlMAAzaEt87Ot4QEAwiC
7O2BCQeg+/n5+p+C+P7+9zHy+v6G/f3+/r3+t9T8/vnP1P75z73+t4b9/oTy+u03gv3+/v7+/YIG
ov2h8vKChr7V1b2GsUrLkQAAAAFiS0dEAf8CLd4AAAAJcEhZcwAALiMAAC4jAXilP3YAAAAHdElN
RQfmBR8SBS3rWUWoAAABFElEQVQY02NgYGRgYGJmYWVj52BiYOBkYOBi4ObhDQoOCQ0L5+MXAIkI
CkVECouIiokIR0WLCzAwMEjExEpKxcUnJErLxEbzMzDIyiXJJ6ekpqVnKGTKZPExMShmKynn5Obl
FxQWqagKh3MwqBUrqZeUlpVXVFZV14jUajBo1mlp1zc0NjW3tLa163ToMuh1aunXd3X39Pb1T5ho
MMmQwWiykvGUqdOmz5g5a/YckbkmDKbzlMzmL1i4aPGSpcvMhZdbMMhaxlqtWLlq9Zq169ZLbrC2
YWCw3RgrZmfv4OjkLBa70QXoUle3TbFKSu5KSkqxmz24QZ5zdfHcsnXb9q07vLwFQX7nAjrfx9fP
PyBQFsQBAO9BSq+ehU00AAAAJXRFWHRkYXRlOmNyZWF0ZQAyMDIyLTA1LTMxVDE1OjA1OjQ1KzAz
OjAwQ3r/TwAAACV0RVh0ZGF0ZTptb2RpZnkAMjAyMi0wNS0zMVQxNTowNTo0NSswMzowMDInR/MA
AAAASUVORK5CYII=" />
</svg>

            </div>
            <a href="iina://weblink?url=${publicURL}${path.join(pathname, PLAYLIST_FILENAME)}">Play media with IINA</a>
          </div>`;

          html += '<table>';

          const failed = false;
          const writeRow = (file) => {
            // render a row given a [name, stat] tuple
            const isDir = file[1].isDirectory && file[1].isDirectory();
            let href = `./${encodeURIComponent(file[0])}`;

            // append trailing slash and query for dir entry
            if (isDir) {
              href += `/${he.encode((parsed.search) ? parsed.search : '')}`;
            }

            const displayName = he.encode(file[0]) + (isDir ? '/' : '');
            const ext = file[0].split('.').pop();
            const classForNonDir = supportedIcons[ext] ? ext : '_page';
            const iconClass = `icon-${isDir  ? '_blank' : classForNonDir}`;

            // TODO: use stylessheets?
            html += `${'<tr>' +
              '<td><i class="icon '}${iconClass}"></i></td>`;
            if (!hidePermissions) {
              html += `<td class="perms"><code>(${permsToString(file[1])})</code></td>`;
            }
            html +=
              `<td class="last-modified">${lastModifiedToString(file[1])}</td>` +
              `<td class="file-size"><code>${sizeToString(file[1], humanReadable, si)}</code></td>` +
              `<td class="display-name"><a href="${href}">${displayName}</a></td>` +
              '</tr>\n';
          };

          dirs.sort((a, b) => a[0].toString().localeCompare(b[0].toString())).forEach(writeRow);
          renderFiles.sort((a, b) => a.toString().localeCompare(b.toString())).forEach(writeRow);
          lolwuts.sort((a, b) => a[0].toString().localeCompare(b[0].toString())).forEach(writeRow);

          html += '</table>\n';
          html += `<br><address>Node.js ${
            process.version
            }/ <a href="https://github.com/http-party/http-server">http-server</a> ` +
            `server running @ ${
            he.encode(req.headers.host || '')}</address>\n` +
            '</body></html>'
          ;

          if (!failed) {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(html);
          }
        }

        sortFiles(dir, files, (lolwuts, dirs, sortedFiles) => {
          // It's possible to get stat errors for all sorts of reasons here.
          // Unfortunately, our two choices are to either bail completely,
          // or just truck along as though everything's cool. In this case,
          // I decided to just tack them on as "??!?" items along with dirs
          // and files.
          //
          // Whatever.

          // if it makes sense to, add a .. link
          if (path.resolve(dir, '..').slice(0, root.length) === root) {
            fs.stat(path.join(dir, '..'), (err, s) => {
              if (err) {
                if (handleError) {
                  status[500](res, next, { error: err });
                } else {
                  next();
                }
                return;
              }
              dirs.unshift(['..', s]);
              render(dirs, sortedFiles, lolwuts);
            });
          } else {
            render(dirs, sortedFiles, lolwuts);
          }
        });
      });
    });
  };
};