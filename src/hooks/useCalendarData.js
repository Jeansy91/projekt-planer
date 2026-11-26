import { useMemo, useCallback } from 'react';
import { getWeekNumber, getDateOfISOWeek } from '../utils/dateUtils';

export const useCalendarData = (viewStartDateIso, weeksShown, currentLocale, setViewStartDate) => {
  const viewStartDate = useMemo(() => new Date(viewStartDateIso), [viewStartDateIso]);

  const shiftView = useCallback((weeks) => {
    const d = new Date(viewStartDateIso);
    d.setDate(d.getDate() + weeks * 7);
    setViewStartDate(d.toISOString());
  }, [viewStartDateIso, setViewStartDate]);

  const goToToday = useCallback(() => {
    const today = new Date();
    const monday = getDateOfISOWeek(getWeekNumber(today), today.getFullYear());
    const pastWeeks = weeksShown <= 19 ? 1 : 2;
    monday.setDate(monday.getDate() - pastWeeks * 7);
    setViewStartDate(monday.toISOString());
  }, [setViewStartDate, weeksShown]);

  const monthHeaders = useMemo(() => {
    const headers = [];
    let currentMonth = -1;
    let span = 0;

    for (let i = 0; i < weeksShown; i++) {
      const date = new Date(viewStartDate);
      date.setDate(date.getDate() + (i * 7));
      const month = date.getMonth();

      if (month !== currentMonth) {
        if (currentMonth !== -1) {
          headers[headers.length - 1].span = span;
        }
        headers.push({
          name: date.toLocaleDateString(currentLocale, { month: 'long', year: 'numeric' }),
          span: 1
        });
        currentMonth = month;
        span = 1;
      } else {
        span++;
      }
    }
    headers[headers.length - 1].span = span;
    return headers;
  }, [viewStartDate, weeksShown, currentLocale]);

  const weekData = useMemo(() => {
    return Array.from({ length: weeksShown }, (_, i) => {
      const date = new Date(viewStartDate);
      date.setDate(date.getDate() + (i * 7));
      return {
        kw: getWeekNumber(date),
        mondayDate: date.toLocaleDateString(currentLocale, { day: '2-digit', month: '2-digit' }),
        fullDate: new Date(date)
      };
    });
  }, [viewStartDate, weeksShown, currentLocale]);

  const monthBoundarySet = useMemo(() => {
    const set = new Set();
    let cumulative = 0;
    for (let i = 0; i < monthHeaders.length - 1; i++) {
      cumulative += monthHeaders[i].span;
      set.add(cumulative - 1);
    }
    return set;
  }, [monthHeaders]);

  const currentWeekIdx = useMemo(() => {
    const now = new Date();
    const todayMonday = getDateOfISOWeek(getWeekNumber(now), now.getFullYear());
    const diffMs = todayMonday.getTime() - new Date(viewStartDate).getTime();
    const idx = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
    return idx >= 0 && idx < weeksShown ? idx : -1;
  }, [viewStartDate, weeksShown]);

  return { viewStartDate, shiftView, goToToday, monthHeaders, weekData, monthBoundarySet, currentWeekIdx };
};
