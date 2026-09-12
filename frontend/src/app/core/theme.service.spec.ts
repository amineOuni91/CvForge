import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  function mockSystemPreference(matches: boolean): void {
    window.matchMedia = vi.fn().mockReturnValue({ matches }) as unknown as typeof window.matchMedia;
  }

  it('defaults to system preference when nothing stored', () => {
    mockSystemPreference(true);
    const service = TestBed.inject(ThemeService);
    expect(service.theme()).toBe('dark');
  });

  it('toggle flips the theme, persists it, and syncs the html class', () => {
    mockSystemPreference(false);
    const service = TestBed.inject(ThemeService);
    expect(service.theme()).toBe('light');

    service.toggle();
    TestBed.flushEffects();

    expect(service.theme()).toBe('dark');
    expect(localStorage.getItem('cvforge.theme')).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('reads a previously stored theme over the system preference', () => {
    localStorage.setItem('cvforge.theme', 'dark');
    mockSystemPreference(false);
    const service = TestBed.inject(ThemeService);
    expect(service.theme()).toBe('dark');
  });
});
