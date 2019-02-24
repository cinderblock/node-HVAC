// Extended from https://stackoverflow.com/a/41791149/4612476

/**
 *
 * @param items An array of items.
 * @param fn A function that accepts an item from the array and returns a promise.
 */
export default function forEachPromise<T, Y>(items: T[], fn: (v: T) => Promise<Y>): Promise<Y[]> {
  return items.reduce((promise, item) => promise.then(r => [...r, fn(item)]), Promise.resolve([]));
}
