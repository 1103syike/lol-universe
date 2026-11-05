const MAX_LOGO_BYTES = 800_000;

export function readImageAsDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    return Promise.reject(new Error('請選擇圖片檔'));
  }

  if (file.size > MAX_LOGO_BYTES) {
    return Promise.reject(new Error('Logo 檔案請小於 800KB'));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }
      reject(new Error('讀取圖片失敗'));
    };
    reader.onerror = () => reject(new Error('讀取圖片失敗'));
    reader.readAsDataURL(file);
  });
}
