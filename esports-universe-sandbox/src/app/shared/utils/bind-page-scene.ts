import type { DestroyRef } from '@angular/core';

export function bindPageScene(destroyRef: DestroyRef, scene: string, mark: string): void {
  document.body.dataset['scene'] = scene;
  document.body.dataset['mark'] = mark;
  destroyRef.onDestroy(() => {
    document.body.classList.remove('is-scene-swap');
    delete document.body.dataset['scene'];
    delete document.body.dataset['sceneFrom'];
    delete document.body.dataset['mark'];
  });
}

export function paintPageScene(scene: string, mark: string): void {
  document.body.dataset['scene'] = scene;
  document.body.dataset['mark'] = mark;
}
