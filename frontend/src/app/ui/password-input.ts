import { Component, computed, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-password-input',
  host: { class: 'block' },
  template: `
    <div class="relative">
      <input
        [type]="visible() ? 'text' : 'password'"
        [placeholder]="placeholder()"
        [value]="value"
        (input)="onInput($event)"
        (blur)="onTouched()"
        [class]="inputClass()"
      />
      <button
        type="button"
        (click)="visible.set(!visible())"
        [title]="visible() ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
        [attr.aria-label]="visible() ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
        class="absolute inset-y-0 right-1.5 flex items-center text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
      >
        @if (visible()) {
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4">
            <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
            <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 11 7 11 7a13.16 13.16 0 0 1-1.67 2.68" />
            <path d="M6.61 6.61A13.526 13.526 0 0 0 1 12s4 7 11 7a9.74 9.74 0 0 0 5.39-1.61" />
            <line x1="2" y1="2" x2="22" y2="22" />
          </svg>
        } @else {
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4">
            <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        }
      </button>
    </div>
  `,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PasswordInput),
      multi: true,
    },
  ],
})
export class PasswordInput implements ControlValueAccessor {
  readonly placeholder = input('');
  readonly compact = input(false);

  readonly inputClass = computed(() =>
    this.compact()
      ? 'w-full rounded border border-slate-300 px-2 py-0.5 pr-7 text-xs dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100'
      : 'w-full rounded border border-slate-300 px-2 py-1 pr-8 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100',
  );

  readonly visible = signal(false);
  value = '';

  private onChange: (value: string) => void = () => {};
  onTouched: () => void = () => {};

  writeValue(value: string): void {
    this.value = value ?? '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  onInput(event: Event): void {
    this.value = (event.target as HTMLInputElement).value;
    this.onChange(this.value);
  }
}
