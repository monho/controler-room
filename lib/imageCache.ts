/**
 * 이미지 캐싱 유틸리티
 * 브라우저 캐시를 활용하여 이미지를 미리 로드하고 캐싱합니다.
 */

// 이미지 캐시 상태 추적
const imageCache = new Map<string, Promise<void>>();
const loadedImages = new Set<string>();

/**
 * 이미지를 프리로드하고 브라우저 캐시에 저장
 * @param url 이미지 URL
 * @returns Promise<void>
 */
export function preloadImage(url: string): Promise<void> {
  // 이미 로드된 이미지는 스킵
  if (loadedImages.has(url)) {
    return Promise.resolve();
  }

  // 이미 로딩 중인 이미지는 기존 Promise 반환
  if (imageCache.has(url)) {
    return imageCache.get(url)!;
  }

  // 새 이미지 로드
  const promise = new Promise<void>((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      loadedImages.add(url);
      imageCache.delete(url);
      resolve();
    };
    
    img.onerror = () => {
      imageCache.delete(url);
      // 에러가 발생해도 reject하지 않고 resolve (폴백 UI 표시)
      console.warn(`이미지 로드 실패: ${url}`);
      resolve();
    };
    
    // 크로스 오리진 이미지도 캐싱 가능하도록 설정
    img.crossOrigin = 'anonymous';
    img.src = url;
  });

  imageCache.set(url, promise);
  return promise;
}

/**
 * 여러 이미지를 병렬로 프리로드
 * @param urls 이미지 URL 배열
 * @returns Promise<void[]>
 */
export function preloadImages(urls: string[]): Promise<void[]> {
  const validUrls = urls.filter(url => url && url.trim() !== '');
  if (validUrls.length === 0) {
    return Promise.resolve([]);
  }
  
  return Promise.all(validUrls.map(url => preloadImage(url)));
}

/**
 * 캐시 상태 초기화 (필요시 사용)
 */
export function clearImageCache(): void {
  imageCache.clear();
  loadedImages.clear();
}

/**
 * 이미지가 로드되었는지 확인
 * @param url 이미지 URL
 * @returns boolean
 */
export function isImageLoaded(url: string): boolean {
  return loadedImages.has(url);
}





