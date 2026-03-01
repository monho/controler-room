// Google Analytics 이벤트 추적

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

// 페이지뷰 추적
export const pageview = (url: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', GA_MEASUREMENT_ID!, {
      page_path: url,
    });
  }
};

// 이벤트 추적
export const event = ({ action, category, label, value }: {
  action: string;
  category: string;
  label?: string;
  value?: number;
}) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
};

// 사용자 정의 이벤트
export const trackStreamerClick = (streamerName: string, team: string) => {
  event({
    action: 'streamer_click',
    category: 'engagement',
    label: `${team} - ${streamerName}`,
  });
};

export const trackTeamFilter = (teamName: string) => {
  event({
    action: 'team_filter',
    category: 'engagement',
    label: teamName,
  });
};

export const trackSearch = (searchQuery: string) => {
  event({
    action: 'search',
    category: 'engagement',
    label: searchQuery,
  });
};

export const trackScheduleView = (date: string) => {
  event({
    action: 'schedule_view',
    category: 'engagement',
    label: date,
  });
};
