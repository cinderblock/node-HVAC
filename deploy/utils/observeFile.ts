import { Observable, Subscriber } from 'rxjs';
import { watch } from 'fs';
import { EventEmitter } from 'events';
import { promisify } from 'util';

import md5file = require('md5-file');

const md5Promise = promisify(md5file);

export default function observeFileChange(file: string, suppressInitial = false) {
  const changes = new EventEmitter();

  let hash: string;

  md5Promise(file).then(initialHash => {
    hash = initialHash;

    const watcher = watch(file);

    watcher.on('change', async (eventType: 'change' | 'rename', filename: string) => {
      if (eventType != 'change') return;
      console.log('Change event:', eventType, filename);

      md5Promise(file)
        .then(newHash => {
          if (newHash !== hash) {
            hash = newHash;
            changes.emit('change');
          }
        })
        // Catch errors reading md5 of file
        .catch();
    });

    watcher.on('error', err => {
      // TODO: Error handling
      console.log('Watch error');
    });

    watcher.on('close', () => {
      // TODO: Error handling
      console.log('Watch close');
    });
  });

  return new Observable<void>(observer => {
    if (!suppressInitial) observer.next();

    changes.on('change', observer.next);

    return () => changes.removeListener('change', observer.next);
  });
}
