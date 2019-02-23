import { Observable } from 'rxjs';
import { watch } from 'fs';

export default function observeFileChange(file: string, suppressInitial = false) {
  return new Observable<void>(observer => {
    if (!suppressInitial) observer.next();

    // TODO: Only emit when files actually change!

    watch(file)
      .on('change', async (eventType: 'change' | 'rename', filename: string) => {
        if (eventType == 'change') observer.next();
        console.log('Change event:', eventType, filename);
      })
      .on('error', err => {
        // TODO: Error handling
        console.log('Watch error');
      })
      .on('close', () => {
        // TODO: Error handling
        console.log('Watch close');
      });
  });
}
